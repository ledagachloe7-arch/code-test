<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class TestPermisUsagerApiCommand extends Command
{
    protected $signature = 'permis:test-usager-api
                            {nom : Nom de famille (recherche exacte, insensible à la casse)}
                            {prenom : Prénom(s) (recherche exacte, insensible à la casse)}
                            {date_naissance : Date de naissance au format YYYY-MM-DD}
                            {numero_permis : Numéro de permis (égalité stricte sur un dossier du candidat)}
                            {--nip= : NIP optionnel (filtre supplémentaire)}
                            {--url= : URL de base du backend (défaut : APP_URL du .env)}
                            {--api-key= : Valeur du header X-API-KEY (défaut : PUBLIC_API_KEY / config)}';

    protected $description = 'Appelle en HTTP GET ton API réelle GET /api/v1/permis/usager (serveur Laravel déjà démarré : php artisan serve).';

    public function handle(): int
    {
        $base = rtrim((string) ($this->option('url') ?: config('app.url')), '/');
        $apiKey = (string) ($this->option('api-key') ?: config('services.public_api.key', ''));
        $apiKey = trim($apiKey);

        if ($apiKey === '') {
            $this->error('Aucune clé API : renseigne PUBLIC_API_KEY dans .env ou passe --api-key=...');

            return self::FAILURE;
        }

        $query = array_filter([
            'nom' => $this->argument('nom'),
            'prenom' => $this->argument('prenom'),
            'date_naissance' => $this->argument('date_naissance'),
            'numero_permis' => $this->argument('numero_permis'),
            'nip' => $this->option('nip') !== null && $this->option('nip') !== ''
                ? (string) $this->option('nip')
                : null,
        ], static fn ($v) => $v !== null && $v !== '');

        $url = $base . '/api/v1/permis/usager?' . http_build_query($query);

        $this->line('URL : ' . $url);
        $this->line('Header X-API-KEY : (fourni — masqué)');

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'X-API-KEY' => $apiKey,
                    'Accept' => 'application/json',
                ])
                ->get($url);
        } catch (ConnectionException $e) {
            $this->error('Connexion impossible. Démarre le backend puis réessaie, ex. :');
            $this->line('  php artisan serve');
            $this->line('Si l’URL n’est pas la bonne : --url=' . $base);
            $this->line($e->getMessage());

            return self::FAILURE;
        }

        $status = $response->status();
        $this->newLine();
        $this->info('HTTP ' . $status);

        $body = $response->json();
        if (is_array($body)) {
            $this->line(json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        } else {
            $this->line($response->body());
        }

        return $status >= 200 && $status < 300 ? self::SUCCESS : self::FAILURE;
    }
}
