<?php

namespace Tests\Feature;

use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\Personne;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Intégration réelle : `utilisateurs` → `personnes` → `candidats` → `dossiers` (PostgreSQL).
 *
 * Par défaut (phpunit.xml → SQLite mémoire) : tests **ignorés** (skip), sans migrations complètes.
 * Avec PostgreSQL : `php vendor/bin/phpunit -c phpunit.pgsql.xml tests/Feature/PublicPermisUsagerPostgresIntegrationTest.php`
 */
class PublicPermisUsagerPostgresIntegrationTest extends TestCase
{
    private static function suffix(): string
    {
        return str_replace('-', '', (string) Str::uuid());
    }

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'pgsql') {
            $this->markTestSkipped(
                'PostgreSQL requis : lancer avec phpunit -c phpunit.pgsql.xml (base permis_integration_test ou DB_* surchargés).'
            );
        }

        Artisan::call('migrate:fresh', ['--force' => true]);

        config([
            'services.public_api.key' => env('PUBLIC_API_KEY', 'test_pg_integration_perm_is_usager_key'),
            'services.public_api.allowed_ips' => '',
            'services.public_api.revoked_keys' => '',
        ]);
    }

    private function apiHeaders(): array
    {
        return ['X-API-KEY' => (string) config('services.public_api.key')];
    }

    /**
     * Crée la chaîne utilisateur → personne → candidat → dossier (contraintes réelles).
     *
     * @return array{utilisateur: Utilisateur, personne: Personne, candidat: Candidat, dossier: Dossier}
     */
    private function seedUsagerAvecPermis(): array
    {
        $s = self::suffix();

        $utilisateur = Utilisateur::query()->create([
            'email' => "permis_usager_pg_{$s}@test.ga",
            'telephone' => '+24106' . substr($s, 0, 6),
            'password' => 'Secret123!',
            'role' => 'ROLE_CANDIDAT',
        ]);

        $personne = Personne::query()->create([
            'utilisateur_id' => $utilisateur->id,
            'nom' => 'MOUSSAVOU',
            'prenom' => 'Jean-Pierre',
            'email' => "personne_perm_pg_{$s}@test.ga",
            'contact' => '+241074000000',
            'adresse' => 'Quartier Glass, Libreville',
        ]);

        $candidat = Candidat::query()->create([
            'personne_id' => $personne->id,
            'numero_candidat' => 'USG-PG-' . substr($s, 0, 12),
            'date_naissance' => '1990-05-14',
            'lieu_naissance' => 'Libreville',
            'nip' => 'NIP-PG-' . substr($s, 0, 10),
            'type_piece' => 'CNI',
            'numero_piece' => 'CNI-PG-' . substr($s, 0, 12),
            'nationalite' => 'Gabonaise',
            'genre' => 'M',
        ]);

        $dossier = Dossier::query()->create([
            'candidat_id' => $candidat->id,
            'statut' => 'en_attente',
            'numero_permis' => '20251B' . substr($s, 0, 6),
            'date_de_delivrance_du_permis' => '2025-03-10',
            'date_de_dobtention_du_permis' => '2025-03-10',
            'lieu_de_dobtention_du_permis' => 'Libreville',
            'date_expiration' => '2035-03-10',
            'expiration_date' => '2035-03-10',
            'data_categorie' => [
                ['classe' => 'B', 'codification_code' => 'GAB-B-2025'],
            ],
        ]);

        return compact('utilisateur', 'personne', 'candidat', 'dossier');
    }

    public function test_get_usager_200_avec_donnees_reelles(): void
    {
        $row = $this->seedUsagerAvecPermis();

        $np = urlencode((string) $row['dossier']->numero_permis);
        $this->withHeaders($this->apiHeaders())
            ->getJson("/api/v1/permis/usager?nom=moussavou&prenom=jean-pierre&date_naissance=1990-05-14&numero_permis={$np}")
            ->assertOk()
            ->assertJsonPath('id', $row['candidat']->id)
            ->assertJsonPath('numero_usager', $row['candidat']->numero_candidat)
            ->assertJsonPath('nip', $row['candidat']->nip)
            ->assertJsonPath('nom', 'MOUSSAVOU')
            ->assertJsonPath('prenom', 'Jean-Pierre')
            ->assertJsonPath('numero_permis', $row['dossier']->numero_permis)
            ->assertJsonPath('categorie_permis', 'B')
            ->assertJsonPath('codification_permis', 'GAB-B-2025');
    }

    public function test_get_usager_404_mauvais_nip(): void
    {
        $row = $this->seedUsagerAvecPermis();

        $np = urlencode((string) $row['dossier']->numero_permis);
        $this->withHeaders($this->apiHeaders())
            ->getJson("/api/v1/permis/usager?nom=MOUSSAVOU&prenom=Jean-Pierre&date_naissance=1990-05-14&numero_permis={$np}&nip=AUTRE")
            ->assertStatus(404);

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/v1/permis/usager?nom=MOUSSAVOU&prenom=Jean-Pierre&date_naissance=1990-05-14&numero_permis=' . $np . '&nip=' . urlencode($row['candidat']->nip))
            ->assertOk();
    }

    public function test_get_usager_401_sans_cle(): void
    {
        $this->seedUsagerAvecPermis();

        $np = urlencode((string) $row['dossier']->numero_permis);
        $this->getJson("/api/v1/permis/usager?nom=MOUSSAVOU&prenom=Jean-Pierre&date_naissance=1990-05-14&numero_permis={$np}")
            ->assertStatus(401);
    }
}
