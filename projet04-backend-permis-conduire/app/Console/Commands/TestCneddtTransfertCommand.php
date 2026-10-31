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
 * Crée un candidat + dossier éligible payload CNEDDT, affiche le body type POST /dossiers/transfert, puis tente l’appel HTTP (JSON) vers le CNEDDT.
 */
class TestCneddtTransfertCommand extends Command
{
    protected $signature = 'app:test-cneddt-transfert
                            {--type= : Autre type que DUPLICATA (ex. DUPLICATAFICHEENREGISTREMENT, CONVERSION) — `name` exact dans type_demandes}';

    protected $description = 'Test envoi CNEDDT : par défaut type DUPLICATA. Voir aussi `app:test-cneddt-duplicata-fiche` pour DUPLICATAFICHEENREGISTREMENT.';

    public function handle(DossierService $dossierService): int
    {
        $allowed = [
            'NOUVEAUPERMIS',
            'DUPLICATA',
            'FICHEENREGISTREMENT',
            'DUPLICATAFICHEENREGISTREMENT',
            'RENOUVELLEMENT',
            'CONVERSION',
        ];
        $forced = $this->option('type');
        if (is_string($forced) && trim($forced) !== '') {
            $type = TypeDemande::query()->where('name', strtoupper(trim($forced)))->first();
            if (! $type) {
                $this->error("Aucun enregistrement type_demandes avec name = « " . strtoupper(trim($forced)) . " ».");

                return self::FAILURE;
            }
        } else {
            // Par défaut : uniquement DUPLICATA (pas de repli sur un autre type).
            $type = TypeDemande::query()->where('name', 'DUPLICATA')->first();
            if (! $type) {
                $this->error(
                    'Aucun `type_demandes` avec name = DUPLICATA. Créez-en un (libellé exact « DUPLICATA ») pour ce test, ou lancez avec --type=CONVERSION, etc.'
                );

                return self::FAILURE;
            }
        }

        if (! $type || trim((string) $type->name) === '') {
            $this->error('Type de demande introuvable ou name vide.');

            return self::FAILURE;
        }
        if (! in_array($type->name, $allowed, true)) {
            $this->warn("Le type « {$type->name} » n’est pas dans la liste CNEDDT usuelle ; l’API peut refuser.");
        }

        $autoEcole = AutoEcole::query()->with('province')->first();
        $formation = $autoEcole
            ? FormationAutoEcole::query()->where('auto_ecole_id', $autoEcole->id)->with('typePermis')->first()
            : null;

        if (! $autoEcole || ! $formation || ! $formation->typePermis) {
            $this->error('Base incomplète : auto_ecole et formation (avec type de permis) requis.');

            return self::FAILURE;
        }

        $suffix = time();
        $email = "test.cneddt.{$suffix}@example.invalid";
        // Téléphone unique (contrainte utilisateurs_telephone_unique) : Gabon 241 + 8 chiffres
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
            'prenom' => 'CNEDDT',
            'email' => $email,
            'contact' => $telephone,
            'adresse' => 'Libreville',
        ]);
        $candidat = Candidat::create([
            'personne_id' => $personne->id,
            'numero_candidat' => 'CNEDDT-' . substr((string) $user->id, 0, 8),
            'date_naissance' => now()->subYears(25),
            'lieu_naissance' => 'Libreville',
            'type_piece' => 'CNI',
            'numero_piece' => 'CNI' . $suffix,
            'nationalite' => 'Gabonaise',
            'genre' => 'M',
        ]);

        // `numero_origine_permis` requis côté payload pour FICHEENREGISTREMENT / DUPLICATAFICHEENREGISTREMENT (inoffensif pour les autres types)
        $dossier = Dossier::create([
            'candidat_id' => $candidat->id,
            'auto_ecole_id' => $autoEcole->id,
            'formation_id' => $formation->id,
            'type_demande_id' => $type->id,
            'statut' => 'en_attente',
            'numero_permis' => 'GAB' . $suffix . 'X',
            'numero_origine_permis' => 'ORIGINE-GAB-' . $suffix,
            'lieu_de_dobtention_du_permis' => 'Libreville',
            'date_expiration' => now()->addYears(5)->toDateString(),
            'date_de_dobtention_du_permis' => now()->subYears(1)->toDateString(),
        ]);

        $dossier->refresh();
        $dossier = Dossier::with(['candidat.personne.utilisateur', 'autoEcole.province', 'formation.typePermis'])
            ->find($dossier->id);

        $controller = app(DossierController::class);
        $m = new ReflectionMethod(DossierController::class, 'buildPayloadForTransfert');
        $m->setAccessible(true);
        $typeDemandeNamesById = TypeDemande::query()->where('id', $type->id)->pluck('name', 'id');
        $payload = $m->invoke($controller, $dossier, $type->id, $typeDemandeNamesById);

        if ($payload === null) {
            $this->error('buildPayloadForTransfert a retourné null (données incomplètes).');

            return self::FAILURE;
        }

        $body = [
            'dossier_id' => (string) $dossier->id,
            'type_demande_id' => (string) $type->id,
            'dossiers' => [
                [
                    'dossier_id' => (string) $dossier->id,
                    'type_demande_id' => (string) $type->id,
                ],
            ],
        ];

        $this->line('');
        $this->info('Exemple de body (équivalent POST /api/dossiers/transfert) :');
        $this->line(json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $this->line('');
        $defautDuplicata = ! (is_string($this->option('type')) && trim((string) $this->option('type')) !== '');
        $this->line('operation_type = ' . (string) $type->name
            . ($defautDuplicata ? '  (défaut : toujours DUPLICATA — utilisez --type=… seulement pour un autre type)' : '  (via --type)'));
        $this->line('');
        $this->info('Aperçu du payload JSON envoyé au CNEDDT :');
        $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $this->line('');
        $this->line('Appel DossierService::sendManyToCneddt (HTTP JSON)…');

        $results = $dossierService->sendManyToCneddt([
            [
                'dossier_id' => (string) $dossier->id,
                'payload' => $payload,
            ],
        ]);
        $this->line(json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $ok = ($results[0]['result']['success'] ?? false) === true;
        if ($ok) {
            $this->info('Résultat : succès côté logique (HTTP + JSON business OK).');
        } else {
            $this->warn('Résultat : échec — voir le JSON ci-dessus (clé, CNEDDT, config .env, etc.).');
        }

        return $ok ? self::SUCCESS : self::FAILURE;
    }
}
