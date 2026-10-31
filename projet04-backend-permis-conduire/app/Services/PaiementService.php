<?php

namespace App\Services;
use App\Models\Dossier;
use Illuminate\Support\Facades\DB;
use App\Http\Services\DossierService;
use App\Http\Services\WebSocketService;
use App\Services\{AlfrescoCrudService, PaiementAirtelService, PaiementHistoriqueService};
use Illuminate\Support\Facades\Log;


class PaiementService
{
      /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:paiement-cron-job';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Exécute les dossiers en attente de paiement';

    protected DossierService $dossierService;
    protected WebSocketService $webSocketService;
    protected $alfresco;
    protected $paynalaService;
    protected $paiementHistoriqueService;
    public function __construct(PaiementHistoriqueService $paiementHistoriqueService, DossierService $dossierService, 
    AlfrescoCrudService $alfresco, PaiementAirtelService $paynalaService,WebSocketService $webSocketService)
    {
        $this->dossierService = $dossierService;
        $this->alfresco = $alfresco;
        $this->paynalaService = $paynalaService;
        $this->paiementHistoriqueService = $paiementHistoriqueService;
        $this->webSocketService = $webSocketService;
    }

    public function dossierPendingPayments()
    {

        // On utilise le scope et la constante du modèle
        // rechercher tous les paiements dont le statut === 'EN_ATTENTE_PAIEMENT'
        $dossiers = Dossier::where('statut', 'EN_ATTENTE_PAIEMENT')
            ->whereNotNull('code_paiement')
            ->orderBy('created_at', 'desc')
            ->get();
        Log::info('Nombre de dossiers en attente de paiement trouvés : ' . $dossiers->count()); 
        foreach ($dossiers as $dossier) {

            // Ici $dossier représente UN SEUL dossier de la liste
            if ($dossier->code_paiement != null) {

                // Paynala lookup-payment : même contrat que checkAndProcessPaymentForDossier (success, count > 0, data.payments[0].status SUCCESS).
                $result = $this->paynalaService->lookupPayment($dossier->code_paiement);

                if ($result['success'] == true && $result['data'] != null && (int) ($result['count'] ?? 0) > 0) {
                    // Enregistrement paiement + mise à jour statut (le code_paiement est conservé sur le dossier)
                    $donnees = $result['data'];

                    if (! empty($donnees['payments'][0]) && $donnees['payments'][0]['status'] === 'SUCCESS') {
                        DB::transaction(function () use ($dossier, $donnees) {
                            $this->paiementHistoriqueService->creerPaiement(
                                [
                                    'dossier_id' => $dossier->id,
                                    'code_paiement' => $dossier->code_paiement,
                                    'reference_paiement' => $donnees['payments'][0]['airtel_money_id'] ?? 'N/A',
                                    'montant' => $donnees['subscription']['amount'],
                                    'nom' => $dossier->candidat->personne->nom,
                                    'prenom' => $dossier->candidat->personne->prenom,
                                ]
                            );
                            $dossier->update([
                                'statut' => "PAIEMENT DE FRAIS  D'EXAMEN - Complété",
                            ]);
                        });
                        $msg = "Le dossier {$dossier->numero} est passé au statut PAIEMENT DE FRAIS D’EXAMEN";
                        try {
                            $this->webSocketService->statutDossierToPayWs($msg);
                        } catch (\Throwable $e) {
                            Log::warning('[PaiementService] statutDossierToPayWs après cron paiement', [
                                'dossier_id' => $dossier->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }

                }
            }
        }
    }

    /**
     * Vérifie et traite le paiement pour UN dossier seulement.
     * Réponse Paynala actuelle : success, merchant, count, data (subscription + payments).
     * Quand le paiement a réussi, Paynala renvoie typiquement count = 1 et un seul élément dans data.payments (status SUCCESS).
     * On exige success, count > 0, data non vide, payments[0] présent et payments[0].status === SUCCESS.
     */
    public function checkAndProcessPaymentForDossier(Dossier $dossier): array
    {
        if (empty($dossier->code_paiement)) {
            return [
                'success' => false,
                'message' => 'Aucun code_paiement sur ce dossier.',
            ];
        }

        $result = $this->paynalaService->lookupPayment($dossier->code_paiement);

        if (!is_array($result) || (($result['success'] ?? false) !== true)) {
            return [
                'success' => false,
                'message' => 'Échec de la vérification Paynala.',
                'paynala' => $result,
            ];
        }

        // count racine : en production succès, Paynala envoie en général count = 1 (un paiement OK). On refuse count < 1.
        if ((int) ($result['count'] ?? 0) < 1) {
            return [
                'success' => true,
                'paid' => false,
                'message' => 'Réponse Paynala : count doit être supérieur à 0 pour valider un paiement.',
                'paynala' => $result,
            ];
        }

        if (empty($result['data'])) {
            return [
                'success' => true,
                'paid' => false,
                'message' => $result['message'] ?? 'Aucun paiement trouvé pour ce code.',
                'paynala' => $result,
            ];
        }

        $donnees = $result['data'];
        if (empty($donnees['payments']) || ! is_array($donnees['payments']) || empty($donnees['payments'][0])) {
            return [
                'success' => true,
                'paid' => false,
                'message' => 'Réponse Paynala : aucune entrée dans data.payments.',
                'paynala' => $result,
            ];
        }

        $status = $donnees['payments'][0]['status'] ?? null;
        if ($status !== 'SUCCESS') {
            return [
                'success' => true,
                'paid' => false,
                'message' => 'Paiement non confirmé (status=' . ($status ?? 'N/A') . ').',
                'paynala' => $result,
            ];
        }

        try {
            DB::transaction(function () use ($dossier, $donnees) {
                $this->paiementHistoriqueService->creerPaiement([
                    'dossier_id' => $dossier->id,
                    'code_paiement' => $dossier->code_paiement,
                    'reference_paiement' => $donnees['payments'][0]['airtel_money_id'] ?? 'N/A',
                    'montant' => $donnees['subscription']['amount'],
                    'nom' => $dossier->candidat->personne->nom,
                    'prenom' => $dossier->candidat->personne->prenom,
                ]);

                $dossier->update([
                    'statut' => "PAIEMENT DE FRAIS  D'EXAMEN - Complété",
                ]);
            });
            $msg = "Le dossier {$dossier->numero} est passé au statut PAIEMENT DE FRAIS D’EXAMEN";
            try {
                $this->webSocketService->statutDossierToPayWs($msg);
            } catch (\Throwable $e) {
                Log::warning('[PaiementService] statutDossierToPayWs après check paiement', [
                    'dossier_id' => $dossier->id,
                    'error' => $e->getMessage(),
                ]);
            }
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'paynala' => $result,
            ];
        }

        return [
            'success' => true,
            'paid' => true,
            'message' => 'Paiement confirmé. Dossier mis à jour et paiement enregistré.',
            'paynala' => $result,
        ];
    }

    public function historiquePayement(){
        return $this->paiementHistoriqueService->historiquePaiement();
    }
}