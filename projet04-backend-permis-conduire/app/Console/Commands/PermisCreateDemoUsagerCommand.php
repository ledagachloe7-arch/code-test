<?php

namespace App\Console\Commands;

use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\Personne;
use App\Models\Utilisateur;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PermisCreateDemoUsagerCommand extends Command
{
    protected $signature = 'permis:create-demo-usager
                            {--skip-verify : Ne pas exécuter GET /api/v1/permis/usager via le kernel (uniquement insertion SQL)}';

    protected $description = 'Crée un utilisateur + personne + candidat + dossier de démo, puis vérifie GET /api/v1/permis/usager (même process PHP, sans serveur HTTP).';

    public function handle(): int
    {
        $suffix = strtoupper(Str::random(8));
        $nom = "DEMO_PERMIS_{$suffix}";
        $prenom = 'TestApi';
        $dateNaissance = '1993-11-22';
        $nip = "NIP-DEMO-{$suffix}";

        $telephone = '+24106' . substr(preg_replace('/\D/', '', (string) Str::uuid()), 0, 7);
        $emailUser = "demo_perm_user_{$suffix}@test.local";
        $emailPersonne = "demo_perm_pers_{$suffix}@test.local";

        $user = Utilisateur::query()->create([
            'email' => $emailUser,
            'telephone' => $telephone,
            'password' => Hash::make('DemoPermis123!'),
            'role' => 'ROLE_CANDIDAT',
        ]);

        $personne = Personne::query()->create([
            'utilisateur_id' => $user->id,
            'nom' => $nom,
            'prenom' => $prenom,
            'email' => $emailPersonne,
            'contact' => '+241074000001',
            'adresse' => 'Adresse démo API permis',
        ]);

        $candidat = Candidat::query()->create([
            'personne_id' => $personne->id,
            'numero_candidat' => 'USG-DEMO-' . $suffix,
            'date_naissance' => $dateNaissance,
            'lieu_naissance' => 'Libreville',
            'nip' => $nip,
            'type_piece' => 'CNI',
            'numero_piece' => 'CNI-DEMO-' . $suffix,
            'nationalite' => 'Gabonaise',
            'genre' => 'M',
        ]);

        $numeroPermisDemo = 'PERM-DEMO-' . $suffix;

        Dossier::query()->create([
            'candidat_id' => $candidat->id,
            'statut' => 'en_attente',
            'numero_permis' => $numeroPermisDemo,
            'date_de_delivrance_du_permis' => '2025-03-10',
            'date_de_dobtention_du_permis' => '2025-03-10',
            'lieu_de_dobtention_du_permis' => 'Libreville',
            'date_expiration' => '2035-03-10',
            'expiration_date' => '2035-03-10',
            'data_categorie' => [
                ['classe' => 'B', 'codification_code' => 'GAB-B-DEMO'],
            ],
        ]);

        $this->newLine();
        $this->info('Enregistrements créés en base.');
        $this->table(
            ['Champ', 'Valeur'],
            [
                ['nom (recherche)', $nom],
                ['prenom', $prenom],
                ['date_naissance', $dateNaissance],
                ['nip', $nip],
                ['numero_permis (recherche)', $numeroPermisDemo],
                ['candidat_id', $candidat->id],
                ['utilisateur email', $emailUser],
            ]
        );

        $this->line('Test manuel (serveur démarré) :');
        $this->line(sprintf(
            '  php artisan permis:test-usager-api %s %s %s %s --nip=%s',
            escapeshellarg($nom),
            escapeshellarg($prenom),
            escapeshellarg($dateNaissance),
            escapeshellarg($numeroPermisDemo),
            escapeshellarg($nip)
        ));
        $this->newLine();

        if ($this->option('skip-verify')) {
            return self::SUCCESS;
        }

        $apiKey = trim((string) config('services.public_api.key', ''));
        if ($apiKey === '') {
            $this->warn('PUBLIC_API_KEY vide : impossible de vérifier l’endpoint ici.');

            return self::SUCCESS;
        }

        $query = http_build_query([
            'nom' => $nom,
            'prenom' => $prenom,
            'date_naissance' => $dateNaissance,
            'numero_permis' => $numeroPermisDemo,
            'nip' => $nip,
        ]);

        $request = Request::create('/api/v1/permis/usager?' . $query, 'GET', [], [], [], [
            'HTTP_X_API_KEY' => $apiKey,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        /** @var \Illuminate\Contracts\Http\Kernel $kernel */
        $kernel = app(\Illuminate\Contracts\Http\Kernel::class);
        $response = $kernel->handle($request);

        $status = $response->getStatusCode();
        $this->info('Vérification interne GET /api/v1/permis/usager → HTTP ' . $status);

        $body = $response->getContent();
        $decoded = json_decode($body, true);
        if (is_array($decoded)) {
            $this->line(json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        } else {
            $this->line($body);
        }

        $kernel->terminate($request, $response);

        return $status === 200 ? self::SUCCESS : self::FAILURE;
    }
}
