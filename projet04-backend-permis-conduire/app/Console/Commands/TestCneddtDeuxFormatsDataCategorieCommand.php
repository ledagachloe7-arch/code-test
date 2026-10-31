<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\DossierController;
use App\Http\Services\DossierService;
use App\Models\AutoEcole;
use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\FormationAutoEcole;
use App\Models\Personne;
use App\Models\TypeDemande;
use App\Models\Utilisateur;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use ReflectionMethod;

/**
 * Crée 2 dossiers DUPLICATA : l’un avec data_categorie en tableau d’objets, l’autre en tableau de chaînes JSON,
 * affiche le payload CNEDDT (categorie_vehicule) puis envoie les 2 appels HTTP (sauf --dry-run).
 */
class TestCneddtDeuxFormatsDataCategorieCommand extends Command
{
    protected $signature = 'app:test-cneddt-deux-formats-data-categorie
                            {--dry-run : Afficher les payloads sans appeler le CNEDDT}';

    protected $description = 'Test CNEDDT : 2 dossiers (data_categorie objets vs chaînes JSON) puis envoi HTTP.';

    public function handle(DossierService $dossierService): int
    {
        $type = TypeDemande::query()->where('name', 'DUPLICATA')->first();
        if (! $type) {
            $this->error('Aucun type_demandes avec name = DUPLICATA.');

            return self::FAILURE;
        }

        $autoEcole = AutoEcole::query()->with('province')->first();
        $formation = $autoEcole
            ? FormationAutoEcole::query()->where('auto_ecole_id', $autoEcole->id)->with('typePermis')->first()
            : null;

        if (! $autoEcole || ! $formation || ! $formation->typePermis) {
            $this->error('Base incomplète : auto_ecole + formation (type permis) requis.');

            return self::FAILURE;
        }

        $suffix = (string) time();
        $typeDemandeNamesById = TypeDemande::query()->where('id', $type->id)->pluck('name', 'id');

        $baseRows = [
            [
                'classe' => 'B',
                'ville' => 'libreville',
                'codification_code' => 'TST' . $suffix . 'B',
                'valable_du' => '2026-04-29',
                'jusqu_au' => '2030-04-29',
            ],
            [
                'classe' => 'C',
                'ville' => 'libreville',
                'codification_code' => 'TST' . $suffix . 'C',
                'valable_du' => '1986-08-19',
                'jusqu_au' => '2030-08-19',
            ],
            [
                'classe' => 'D',
                'ville' => 'libreville',
                'codification_code' => 'TST' . $suffix . 'D',
                'valable_du' => '1986-08-19',
                'jusqu_au' => '2030-08-19',
            ],
        ];

        // Dossier 1 : tableau d’objets (forme recommandée)
        $d1 = $this->createDossier(
            $suffix,
            '1',
            $autoEcole,
            $formation,
            $type,
            $baseRows,
            'tableau d’objets PHP (JSON colonne = array of objects)'
        );

        // Dossier 2 : tableau de chaînes JSON (forme historique)
        $asStrings = array_map(fn (array $row) => json_encode($row, JSON_UNESCAPED_UNICODE), $baseRows);
        $d2 = $this->createDossier(
            $suffix,
            '2',
            $autoEcole,
            $formation,
            $type,
            $asStrings,
            'tableau de chaînes JSON (une string JSON par ligne)'
        );

        $controller = app(DossierController::class);
        $m = new ReflectionMethod(DossierController::class, 'buildPayloadForTransfert');
        $m->setAccessible(true);

        $toSend = [];
        foreach ([$d1, $d2] as $pack) {
            /** @var Dossier $dossier */
            $dossier = $pack['dossier'];
            $label = $pack['label'];

            $dossier = Dossier::with(['candidat.personne.utilisateur', 'autoEcole.province', 'formation.typePermis'])
                ->find($dossier->id);

            $this->newLine();
            $this->info("=== {$label} ===");
            $this->line('dossier_id : ' . $dossier->id);
            $this->line('data_categorie en base (après cast modèle) :');
            $this->line(json_encode($dossier->data_categorie, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $payload = $m->invoke($controller, $dossier, $type->id, $typeDemandeNamesById);
            if ($payload === null) {
                $this->error('buildPayloadForTransfert a retourné null.');

                return self::FAILURE;
            }

            $this->line('categorie_vehicule dans le payload CNEDDT :');
            $cv = $payload['data']['categorie_vehicule'] ?? $payload['categorie_vehicule'] ?? null;
            $this->line(json_encode($cv, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $toSend[] = [
                'dossier_id' => (string) $dossier->id,
                'payload' => $payload,
            ];
        }

        if ($this->option('dry-run')) {
            $this->newLine();
            $this->warn('Dry-run : aucun appel HTTP au CNEDDT.');
            $this->line('Pour envoyer ces dossiers ensuite :');
            $this->line('  php artisan app:test-cneddt-send-dossiers ' . $d1['dossier']->id . ' ' . $d2['dossier']->id);

            return self::SUCCESS;
        }

        $this->newLine();
        $this->line('Appel sendManyToCneddt (2 requêtes HTTP)…');
        $results = $dossierService->sendManyToCneddt($toSend);
        $this->line(json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $ok = collect($results)->every(fn ($r) => ($r['result']['success'] ?? false) === true);
        if ($ok) {
            $this->info('Les 2 envois sont passés (success true).');
        } else {
            $this->warn('Au moins un envoi a échoué — voir JSON ci-dessus.');
        }

        return $ok ? self::SUCCESS : self::FAILURE;
    }

    /**
     * @param  list<array<string, mixed>>|list<string>  $dataCategorie
     * @return array{dossier: Dossier, label: string}
     */
    private function createDossier(
        string $suffix,
        string $variant,
        AutoEcole $autoEcole,
        FormationAutoEcole $formation,
        TypeDemande $type,
        array $dataCategorie,
        string $label
    ): array {
        $email = "test.2fmt.{$suffix}.{$variant}@example.invalid";
        $telephone = '241' . str_pad((string) random_int(10000000, 99999999), 8, '0', STR_PAD_LEFT);
        $user = Utilisateur::create([
            'email' => $email,
            'telephone' => $telephone,
            'password' => Hash::make('TestCneddt123!'),
            'role' => 'ROLE_CANDIDAT',
        ]);
        $personne = Personne::create([
            'utilisateur_id' => $user->id,
            'nom' => 'Test',
            'prenom' => '2Fmt' . $variant,
            'email' => $email,
            'contact' => $telephone,
            'adresse' => 'Libreville',
        ]);
        $candidat = Candidat::create([
            'personne_id' => $personne->id,
            'numero_candidat' => '2FMT-' . $suffix . '-' . $variant,
            'date_naissance' => now()->subYears(25),
            'lieu_naissance' => 'Libreville',
            'type_piece' => 'CNI',
            'numero_piece' => 'CNI' . $suffix . $variant,
            'nationalite' => 'Gabonaise',
            'genre' => 'M',
        ]);

        $dossier = Dossier::create([
            'candidat_id' => $candidat->id,
            'auto_ecole_id' => $autoEcole->id,
            'formation_id' => $formation->id,
            'type_demande_id' => $type->id,
            'statut' => 'en_attente',
            'numero_permis' => 'GAB' . $suffix . $variant . 'X',
            'numero_origine_permis' => 'ORIG-2FMT-' . $suffix . '-' . $variant,
            'lieu_de_dobtention_du_permis' => 'Libreville',
            'date_expiration' => now()->addYears(5)->toDateString(),
            'date_de_dobtention_du_permis' => now()->subYears(1)->toDateString(),
            'data_categorie' => $dataCategorie,
        ]);

        return ['dossier' => $dossier, 'label' => $label];
    }
}
