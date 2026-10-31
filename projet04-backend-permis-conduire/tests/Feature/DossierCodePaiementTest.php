<?php

namespace Tests\Feature;

use App\Http\Requests\Dossier\StoreDossierRequest;
use App\Http\Requests\Dossier\UpdateDossierRequest;
use App\Models\Dossier;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Immuabilité de code_paiement (hook Dossier + hors fillable) et règles API prohibited.
 */
class DossierCodePaiementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

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

    public function test_code_paiement_restored_when_model_tries_to_change_it(): void
    {
        $dossier = new Dossier([
            'statut' => 'valide',
            'commentaires' => null,
        ]);
        $dossier->code_paiement = 'code-fixe-001';
        $dossier->save();

        $dossier->refresh();
        $dossier->code_paiement = 'tentative-changement';
        $dossier->statut = 'autre_statut';
        $dossier->save();

        $this->assertDatabaseHas('dossiers', [
            'id' => $dossier->id,
            'code_paiement' => 'code-fixe-001',
            'statut' => 'autre_statut',
        ]);
    }

    public function test_mass_create_ignores_code_paiement_not_in_fillable(): void
    {
        Dossier::query()->create([
            'statut' => 'valide',
            'commentaires' => null,
            'code_paiement' => 'ne-doit-pas-etre-pris',
        ]);

        $row = Dossier::query()->first();
        $this->assertNull($row->code_paiement);
    }

    public function test_store_request_rejects_code_paiement_in_body(): void
    {
        $validator = Validator::make(
            [
                'statut' => 'en_attente',
                'code_paiement' => 'hack',
            ],
            (new StoreDossierRequest)->rules()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('code_paiement', $validator->errors()->toArray());
    }

    public function test_store_request_rejects_centre_id_in_body(): void
    {
        $validator = Validator::make(
            [
                'statut' => 'en_attente',
                'centre_id' => '550e8400-e29b-41d4-a716-446655440000',
            ],
            (new StoreDossierRequest)->rules()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('centre_id', $validator->errors()->toArray());
    }

    public function test_update_request_rejects_code_paiement_in_body(): void
    {
        $validator = Validator::make(
            [
                'statut' => 'valide',
                'code_paiement' => 'hack',
            ],
            (new UpdateDossierRequest)->rules()
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('code_paiement', $validator->errors()->toArray());
    }
}
