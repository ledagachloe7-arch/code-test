<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\DossierController;
use App\Http\Services\DossierService;
use App\Models\AutoEcole;
use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\FormationAutoEcole;
use App\Models\TypeDemande;
use App\Models\Utilisateur;
use Illuminate\Console\Command;
use ReflectionClass;

/**
 * Crée N dossiers (types CNEDDT distincts) depuis le backend et les envoie en un pool CNEDDT.
 * Données candidats / auto-écoles / formations : même esprit que les seeders.
 */
class TransfertCneddtMultiDossiersCommand extends Command
{
    public const SEEDER_ADMIN_EMAIL = 'admin@autoecole-system.com';

    /** Types d’opération CNEDDT, un par dossier pour les 4 premiers index. */
    private const OPERATIONS_QUATRE = [
        'DUPLICATA',
        'CONVERSION',
        'FICHEENREGISTREMENT',
        'DUPLICATAFICHEENREGISTREMENT',
    ];

    protected $signature = 'dossier:transfert-cn-multi
                            {--count=4 : Nombre de dossiers à créer et transférer}
                            {--dry-run : Construire les payloads puis supprimer les dossiers (pas d’appel CNEDDT)}';

    protected $description = 'Crée plusieurs dossiers (types de demande CNEDDT variés) et les envoie au CNEDDT via sendManyToCneddt.';

    public function handle(DossierService $dossierService, DossierController $controller): int
    {
        $count = max(1, (int) $this->option('count'));

        $candidats = Candidat::with('personne')->orderBy('id')->get();
        $autoEcoles = AutoEcole::orderBy('id')->get();
        $formations = FormationAutoEcole::with('typePermis')->orderBy('id')->get();

        if ($candidats->isEmpty() || $autoEcoles->isEmpty() || $formations->isEmpty()) {
            $this->error('Candidats, auto-écoles ou formations introuvables. Lance php artisan db:seed.');

            return self::FAILURE;
        }

        $admin = Utilisateur::where('email', self::SEEDER_ADMIN_EMAIL)->first();
        $ref = new ReflectionClass($controller);
        $method = $ref->getMethod('buildPayloadForTransfert');
        $method->setAccessible(true);

        $created = [];
        $operations = $this->operationsForCount($count);

        foreach ($operations as $i => $operationName) {
            $candidat = $candidats[$i % $candidats->count()];
            $autoEcole = $autoEcoles[$i % $autoEcoles->count()];
            $formation = $formations[$i % $formations->count()];

            $typeDemande = TypeDemande::firstOrCreate(['name' => $operationName], []);
            $suffix = substr(str_replace('.', '', uniqid((string) $i, true)), -12);

            $attrs = $this->baseAttributes(
                $candidat->id,
                $autoEcole->id,
                $formation->id,
                $typeDemande->id,
                $admin?->id,
                $operationName,
                $suffix,
                $formation
            );

            $dossier = Dossier::create($attrs);
            $created[] = $dossier;
            $this->info("[{$operationName}] Dossier créé : {$dossier->id} (candidat {$candidat->id})");
        }

        if ($admin) {
            $this->line('Créateur (seeder admin) : ' . self::SEEDER_ADMIN_EMAIL);
        }

        $typeIds = collect($created)->pluck('type_demande_id')->unique()->values();
        $typeNamesById = TypeDemande::whereIn('id', $typeIds)->pluck('name', 'id');

        $toSend = [];
        foreach ($created as $dossier) {
            $fresh = $dossier->fresh(['candidat.personne', 'autoEcole.province', 'formation.typePermis']);
            $payload = $method->invoke($controller, $fresh, $dossier->type_demande_id, $typeNamesById);

            if ($payload === null) {
                $this->error("Payload null pour dossier {$dossier->id} ({$typeNamesById[$dossier->type_demande_id]}).");
                $this->cleanupDossiers($created);

                return self::FAILURE;
            }

            $operationType = $payload['data']['operation_type'] ?? '';
            $this->line('--- ' . $operationType . ' ---');
            $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $toSend[] = ['dossier_id' => $dossier->id, 'payload' => $payload];
        }

        if ($this->option('dry-run')) {
            $this->cleanupDossiers($created);
            $this->warn('Dry-run : dossiers supprimés, aucun appel CNEDDT.');

            return self::SUCCESS;
        }

        $this->info('Envoi CNEDDT (' . count($toSend) . ' dossiers)…');
        $results = $dossierService->sendManyToCneddt($toSend);
        $this->line(json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $successes = collect($results)->filter(fn ($r) => ($r['result']['success'] ?? false) === true)->count();
        $this->info("Transferts réussis : {$successes}/" . count($results) . '.');

        return $successes === count($results) ? self::SUCCESS : self::FAILURE;
    }

    /**
     * @return list<string>
     */
    private function operationsForCount(int $count): array
    {
        $pool = array_merge(
            self::OPERATIONS_QUATRE,
            ['RENOUVELLEMENT', 'NOUVEAUPERMIS']
        );

        $out = [];
        for ($i = 0; $i < $count; $i++) {
            $out[] = $pool[$i % count($pool)];
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function baseAttributes(
        string $candidatId,
        string $autoEcoleId,
        string $formationId,
        string $typeDemandeId,
        ?string $adminId,
        string $operationName,
        string $suffix,
        FormationAutoEcole $formation
    ): array {
        $typePermisCode = $formation->typePermis?->code ?? 'B';
        $otherClasse = $typePermisCode === 'C' ? 'D' : 'C';

        $dataCategorie = [
            [
                'classe' => $typePermisCode,
                'ville' => '45874',
                'codification_code' => '452211',
                'valable_du' => '2025-02-03',
                'jusqu_au' => '2026-02-03',
            ],
            [
                'classe' => $otherClasse,
                'ville' => 'Libreville',
                'codification_code' => '12340',
                'valable_du' => '2025-02-03',
                'jusqu_au' => '2030-02-03',
            ],
        ];

        $base = [
            'candidat_id' => $candidatId,
            'auto_ecole_id' => $autoEcoleId,
            'formation_id' => $formationId,
            'type_demande_id' => $typeDemandeId,
            'utilisateur_id' => $adminId,
            'statut' => 'en_attente',
            'commentaires' => [
                'note' => "CLI dossier:transfert-cn-multi {$operationName} " . now()->toIso8601String(),
            ],
            'lieu_de_dobtention_du_permis' => 'Libreville',
            'date_de_dobtention_du_permis' => '2020-01-01',
            'date_expiration' => '2030-01-01',
        ];

        if ($operationName === 'NOUVEAUPERMIS') {
            $base['data_categorie'] = [];

            return $base;
        }

        // FICHEENREGISTREMENT : côté CNEDDT, des dates texte sur categorie_vehicule peuvent provoquer une erreur
        // (attente DateTimeInterface). Sans data_categorie, le payload n’expose qu’une classe seule.
        if ($operationName === 'FICHEENREGISTREMENT') {
            $base['data_categorie'] = [];
            $base['numero_origine_permis'] = 'ORIG' . $suffix;

            return $base;
        }

        $base['data_categorie'] = $dataCategorie;
        $base['numero_permis'] = 'GA' . $suffix . '12345';

        if ($operationName === 'DUPLICATAFICHEENREGISTREMENT') {
            $base['numero_origine_permis'] = 'ORIG' . $suffix;
        }

        return $base;
    }

    /**
     * @param  list<Dossier>  $dossiers
     */
    private function cleanupDossiers(array $dossiers): void
    {
        foreach ($dossiers as $dossier) {
            $dossier->delete();
        }
    }
}
