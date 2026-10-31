<?php

namespace Tests\Feature;

use App\Models\Dossier;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Tests des endpoints publics protégés par X-API-KEY :
 * - GET  /api/public/paiements/exists
 *
 * Schéma SQLite minimal (`dossiers`), sans migrations complètes du projet.
 */
class PublicPaiementApiTest extends TestCase
{
    private const API_KEY = 'test-public-api-key-phpunit';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.public_api.key' => self::API_KEY]);

        Schema::dropIfExists('dossiers');
        Schema::create('dossiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('statut');
            $table->string('code_paiement')->nullable();
            $table->json('commentaires')->nullable();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('dossiers');
        parent::tearDown();
    }

    private function apiHeaders(): array
    {
        return ['X-API-KEY' => self::API_KEY];
    }

    // --- GET /api/public/paiements/exists ---

    public function test_exists_returns_401_without_x_api_key(): void
    {
        $this->getJson('/api/public/paiements/exists?code_paiement=pa1')
            ->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Clé API invalide.',
            ]);
    }

    public function test_exists_returns_401_with_invalid_x_api_key(): void
    {
        $this->withHeaders(['X-API-KEY' => 'wrong-key'])
            ->getJson('/api/public/paiements/exists?code_paiement=pa1')
            ->assertStatus(401);
    }

    public function test_exists_returns_422_when_code_paiement_missing(): void
    {
        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/public/paiements/exists')
            ->assertStatus(422)
            ->assertJson([
                'success' => false,
                'exists' => false,
            ]);
    }

    public function test_exists_returns_200_with_exists_false_when_code_unknown(): void
    {
        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/public/paiements/exists?code_paiement=unknowncode99')
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'exists' => false,
                'data' => null,
            ]);
    }

    public function test_exists_returns_200_with_exists_true_when_dossier_found(): void
    {
        $dossier = new Dossier([
            'statut' => 'EN_ATTENTE_PAIEMENT',
            'commentaires' => null,
        ]);
        $dossier->code_paiement = 'paexists001';
        $dossier->save();

        $this->withHeaders($this->apiHeaders())
            ->getJson('/api/public/paiements/exists?code_paiement=paexists001')
            ->assertOk()
            ->assertJson([
                'success' => true,
                'exists' => true,
                'data' => [
                    'dossier_id' => $dossier->id,
                    'statut' => 'EN_ATTENTE_PAIEMENT',
                ],
            ]);
    }
}
