<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\DossierController;
use App\Http\Services\DossierService;
use App\Models\Dossier;
use App\Models\TypeDemande;
use Illuminate\Console\Command;
use ReflectionMethod;

/**
 * Envoie au CNEDDT un ou plusieurs dossiers déjà existants (payload construit comme POST /dossiers/transfert).
 */
class TestCneddtSendDossiersCommand extends Command
{
    protected $signature = 'app:test-cneddt-send-dossiers
                            {dossier_ids* : UUID(s) des dossiers à envoyer (ex. copiés depuis app:test-cneddt-deux-formats-data-categorie)}';

    protected $description = 'Construit le payload CNEDDT pour chaque dossier donné et appelle sendManyToCneddt (HTTP).';

    public function handle(DossierService $dossierService): int
    {
        $ids = $this->argument('dossier_ids');
        if ($ids === [] || $ids === null) {
            $this->error('Indiquez au moins un dossier_id UUID.');

            return self::FAILURE;
        }

        $dossiersById = Dossier::with(['candidat.personne.utilisateur', 'autoEcole.province', 'formation.typePermis'])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $typeIds = $dossiersById->pluck('type_demande_id')->unique()->filter()->values()->all();
        $typeDemandeNamesById = $typeIds === []
            ? collect()
            : TypeDemande::whereIn('id', $typeIds)->pluck('name', 'id');

        $controller = app(DossierController::class);
        $m = new ReflectionMethod(DossierController::class, 'buildPayloadForTransfert');
        $m->setAccessible(true);

        $toSend = [];
        foreach ($ids as $id) {
            $dossier = $dossiersById->get($id);
            if (! $dossier) {
                $this->error("Dossier introuvable : {$id}");

                return self::FAILURE;
            }
            if (! $dossier->type_demande_id) {
                $this->error("Dossier sans type_demande_id : {$id}");

                return self::FAILURE;
            }

            $payload = $m->invoke($controller, $dossier, (string) $dossier->type_demande_id, $typeDemandeNamesById);
            if ($payload === null) {
                $this->error("buildPayloadForTransfert null pour {$id} (données incomplètes).");

                return self::FAILURE;
            }

            $this->newLine();
            $this->info("Dossier {$id}");
            $this->line('categorie_vehicule : ' . json_encode(
                $payload['data']['categorie_vehicule'] ?? $payload['categorie_vehicule'] ?? null,
                JSON_UNESCAPED_UNICODE
            ));

            $toSend[] = [
                'dossier_id' => (string) $dossier->id,
                'payload' => $payload,
            ];
        }

        $this->newLine();
        $this->line('Envoi sendManyToCneddt (' . count($toSend) . ' requête(s))…');
        $results = $dossierService->sendManyToCneddt($toSend);
        $this->line(json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $ok = collect($results)->every(fn ($r) => ($r['result']['success'] ?? false) === true);
        if ($ok) {
            $this->info('Tous les envois sont passés (success true).');
        } else {
            $this->warn('Au moins un envoi a échoué — voir JSON ci-dessus.');
        }

        return $ok ? self::SUCCESS : self::FAILURE;
    }
}
