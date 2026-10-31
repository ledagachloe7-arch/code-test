<?php

namespace Tests\Feature;

use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\Personne;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * GET /api/v1/permis/usager — schéma SQLite minimal (personnes, candidats, dossiers).
 */
class PublicPermisUsagerApiTest extends TestCase
{
    private const API_KEY = 'test-public-api-key-permis-usager';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.public_api.key' => self::API_KEY,
            'services.public_api.allowed_ips' => '',
            'services.public_api.revoked_keys' => '',
        ]);

        Schema::dropIfExists('dossiers');
        Schema::dropIfExists('candidats');
        Schema::dropIfExists('personnes');

        Schema::create('personnes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nom');
            $table->string('prenom')->nullable();
            $table->string('email')->nullable();
            $table->text('adresse')->nullable();
            $table->string('contact')->nullable();
            $table->timestamps();
        });

        Schema::create('candidats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('personne_id');
            $table->string('numero_candidat')->unique();
            $table->date('date_naissance');
            $table->string('lieu_naissance')->nullable();
            $table->string('nip')->nullable();
            $table->string('type_piece')->nullable();
            $table->string('numero_piece')->nullable();
            $table->string('nationalite')->nullable();
            $table->string('genre')->nullable();
            $table->timestamps();
        });

        Schema::create('dossiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('candidat_id')->nullable();
            $table->string('numero_permis')->nullable();
            $table->string('numero_origine_permis')->nullable();
            $table->string('lieu_de_dobtention_du_permis')->nullable();
            $table->date('date_de_dobtention_du_permis')->nullable();
            $table->date('date_de_delivrance_du_permis')->nullable();
            $table->date('date_expiration')->nullable();
            $table->date('expiration_date')->nullable();
            $table->json('data_categorie')->nullable();
            $table->string('statut')->default('test');
            $table->json('commentaires')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('dossiers');
        Schema::dropIfExists('candidats');
        Schema::dropIfExists('personnes');
        parent::tearDown();
    }

    private function headers(): array
    {
        return ['X-API-KEY' => self::API_KEY];
    }

    public function test_returns_401_without_api_key(): void
    {
        $this->getJson('/api/v1/permis/usager?nom=A&prenom=B&date_naissance=1990-01-01&numero_permis=X')
            ->assertStatus(401);
    }

    public function test_returns_200_when_only_numero_permis(): void
    {
        $personne = Personne::query()->create([
            'nom' => 'SOLO',
            'prenom' => 'Permis',
        ]);

        $candidat = Candidat::query()->create([
            'personne_id' => $personne->id,
            'numero_candidat' => 'USG-SOLO-001',
            'date_naissance' => '1985-03-20',
        ]);

        Dossier::query()->create([
            'candidat_id' => $candidat->id,
            'numero_permis' => 'PERMIS-SOLO-ONLY',
        ]);

        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?numero_permis=PERMIS-SOLO-ONLY')
            ->assertOk()
            ->assertJsonPath('id', $candidat->id)
            ->assertJsonPath('nom', 'SOLO')
            ->assertJsonPath('numero_permis', 'PERMIS-SOLO-ONLY');
    }

    public function test_returns_400_when_numero_permis_missing(): void
    {
        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=A&prenom=B&date_naissance=1990-01-01')
            ->assertStatus(400)
            ->assertJsonFragment(['message' => 'Le paramètre numero_permis est obligatoire.']);
    }

    public function test_returns_422_when_date_invalid_format(): void
    {
        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=A&prenom=B&date_naissance=14-05-1990&numero_permis=X')
            ->assertStatus(422);
    }

    public function test_returns_422_when_date_not_on_calendar(): void
    {
        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=A&prenom=B&date_naissance=2025-02-30&numero_permis=X')
            ->assertStatus(422);
    }

    public function test_returns_404_when_no_match(): void
    {
        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=Inconnu&prenom=X&date_naissance=1990-01-01&numero_permis=NOPE')
            ->assertStatus(404);
    }

    public function test_returns_200_with_flat_payload_and_null_optionals(): void
    {
        $personne = Personne::query()->create([
            'nom' => 'MOUSSAVOU',
            'prenom' => 'Jean-Pierre',
            'email' => null,
            'contact' => null,
            'adresse' => null,
        ]);

        $candidat = Candidat::query()->create([
            'personne_id' => $personne->id,
            'numero_candidat' => 'USG-2025-00123',
            'date_naissance' => '1990-05-14',
            'lieu_naissance' => 'Libreville',
            'nip' => 'NIP123456',
            'type_piece' => 'CNI',
            'numero_piece' => 'CNI-000-2021-0042',
            'nationalite' => 'Gabonaise',
            'genre' => 'M',
        ]);

        Dossier::query()->create([
            'candidat_id' => $candidat->id,
            'numero_permis' => '20251B00042',
            'date_de_delivrance_du_permis' => '2025-03-10',
            'date_de_dobtention_du_permis' => '2025-03-10',
            'lieu_de_dobtention_du_permis' => 'Libreville',
            'date_expiration' => '2035-03-10',
            'expiration_date' => '2035-03-10',
            'data_categorie' => [
                ['classe' => 'B', 'codification_code' => 'GAB-B-2025'],
            ],
        ]);

        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=moussavou&prenom=jean-pierre&date_naissance=1990-05-14&numero_permis=20251B00042')
            ->assertOk()
            ->assertJsonPath('id', $candidat->id)
            ->assertJsonPath('numero_usager', 'USG-2025-00123')
            ->assertJsonPath('nip', 'NIP123456')
            ->assertJsonPath('nom', 'MOUSSAVOU')
            ->assertJsonPath('prenom', 'Jean-Pierre')
            ->assertJsonPath('email', null)
            ->assertJsonPath('numero_permis', '20251B00042')
            ->assertJsonPath('categorie_permis', 'B')
            ->assertJsonPath('codification_permis', 'GAB-B-2025')
            ->assertJsonPath('date_delivrance_permis', '2025-03-10')
            ->assertJsonPath('numero_origine_permis', null);
    }

    public function test_merges_permis_across_multiple_dossiers(): void
    {
        $personne = Personne::query()->create([
            'nom' => 'MergeMulti',
            'prenom' => 'Dossiers',
            'email' => 'merge@test.local',
            'contact' => '+241000000000',
            'adresse' => null,
        ]);

        $candidat = Candidat::query()->create([
            'personne_id' => $personne->id,
            'numero_candidat' => 'USG-MERGE-01',
            'date_naissance' => '1988-01-10',
            'lieu_naissance' => 'X',
            'nip' => 'NIP-MERGE',
            'type_piece' => 'CNI',
            'numero_piece' => 'PIECE-MERGE-01',
            'nationalite' => 'Gabonaise',
            'genre' => 'M',
        ]);

        // Dossier « léger » : seulement le numéro de permis (souvent créé en premier en base).
        Dossier::query()->create([
            'candidat_id' => $candidat->id,
            'statut' => 'en_attente',
            'numero_permis' => 'NUM-SEUL-999',
        ]);

        // Dossier « riche » : dates / lieu / data_categorie, sans numéro.
        Dossier::query()->create([
            'candidat_id' => $candidat->id,
            'statut' => 'en_attente',
            'date_de_delivrance_du_permis' => '2024-06-01',
            'date_de_dobtention_du_permis' => '2024-06-01',
            'lieu_de_dobtention_du_permis' => 'Port-Gentil',
            'date_expiration' => '2034-06-01',
            'expiration_date' => '2034-06-01',
            'data_categorie' => [
                ['classe' => 'C', 'codification_code' => 'CODE-C-001'],
            ],
        ]);

        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=MergeMulti&prenom=Dossiers&date_naissance=1988-01-10&numero_permis=NUM-SEUL-999')
            ->assertOk()
            ->assertJsonPath('numero_permis', 'NUM-SEUL-999')
            ->assertJsonPath('date_delivrance_permis', '2024-06-01')
            ->assertJsonPath('lieu_obtention_permis', 'Port-Gentil')
            ->assertJsonPath('categorie_permis', 'C')
            ->assertJsonPath('codification_permis', 'CODE-C-001');
    }

    public function test_nip_query_narrows_and_404_when_wrong_nip(): void
    {
        $personne = Personne::query()->create([
            'nom' => 'Dupont',
            'prenom' => 'Alice',
            'email' => 'a@b.ga',
            'contact' => null,
            'adresse' => null,
        ]);

        $candidat = Candidat::query()->create([
            'personne_id' => $personne->id,
            'numero_candidat' => 'USG-1',
            'date_naissance' => '1991-06-01',
            'lieu_naissance' => 'X',
            'nip' => 'NIP-A',
            'type_piece' => 'CNI',
            'numero_piece' => 'P1',
            'nationalite' => 'Gabonaise',
            'genre' => 'F',
        ]);

        Dossier::query()->create([
            'candidat_id' => $candidat->id,
            'statut' => 'en_attente',
            'numero_permis' => 'PERMIS-DUPONT-ALICE',
        ]);

        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=Dupont&prenom=Alice&date_naissance=1991-06-01&numero_permis=PERMIS-DUPONT-ALICE&nip=OTHER')
            ->assertStatus(404);

        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=Dupont&prenom=Alice&date_naissance=1991-06-01&numero_permis=PERMIS-DUPONT-ALICE&nip=NIP-A')
            ->assertOk()
            ->assertJsonPath('nip', 'NIP-A');
    }

    public function test_ip_whitelist_403_when_configured_and_ip_not_allowed(): void
    {
        config(['services.public_api.allowed_ips' => '203.0.113.10']);

        $this->withHeaders($this->headers())
            ->getJson('/api/v1/permis/usager?nom=A&prenom=B&date_naissance=1990-01-01&numero_permis=X')
            ->assertStatus(403);

        $this->withHeaders(array_merge($this->headers(), ['X-Forwarded-For' => '203.0.113.10']))
            ->getJson('/api/v1/permis/usager?nom=A&prenom=B&date_naissance=1990-01-01&numero_permis=X')
            ->assertStatus(404);
    }

    public function test_revoked_key_returns_403(): void
    {
        config(['services.public_api.revoked_keys' => 'old-revoked-key']);

        $this->withHeaders(['X-API-KEY' => 'old-revoked-key'])
            ->getJson('/api/v1/permis/usager?nom=A&prenom=B&date_naissance=1990-01-01&numero_permis=X')
            ->assertStatus(403)
            ->assertJsonFragment(['message' => 'Clé API révoquée.']);
    }
}
