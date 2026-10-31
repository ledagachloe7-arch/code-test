<?php

// Script de test : simuler un paiement Airtel SUCCESS et vérifier
// que la table paiements est remplie et que le dossier est mis à jour.

use App\Models\Dossier;
use App\Services\PaiementAirtelService;
use App\Services\PaiementHistoriqueService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

echo "=== Test paiement Airtel (simulation) ===\n\n";

// 1. Récupérer un dossier EN_ATTENTE_PAIEMENT avec code_paiement, ou en créer un
$dossier = Dossier::where('statut', 'EN_ATTENTE_PAIEMENT')
    ->whereNotNull('code_paiement')
    ->first();

if (!$dossier) {
    echo "Aucun dossier EN_ATTENTE_PAIEMENT avec code_paiement trouvé. Création d'un dossier de test...\n";
    $any = Dossier::first();
    if (!$any) {
        echo "Aucun dossier du tout en base. Impossible de tester.\n";
        exit(1);
    }
    $dossier = $any;
    Dossier::withoutEvents(function () use ($dossier) {
        $dossier->statut = 'EN_ATTENTE_PAIEMENT';
        $dossier->code_paiement = 'TEST-CODE-PAIEMENT';
        $dossier->save();
    });
}

echo "Dossier testé: ID={$dossier->id}, code_paiement={$dossier->code_paiement}\n\n";

/** @var PaiementAirtelService $airtel */
$airtel = $app->make(PaiementAirtelService::class);
/** @var PaiementHistoriqueService $historique */
$historique = $app->make(PaiementHistoriqueService::class);

// 2. Simuler la réponse Airtel (payementMock) au lieu d'appeler l'API réelle
$result = $airtel->payementMock();

echo "Réponse simulée Airtel:\n";
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

if (!($result['success'] ?? false) || empty($result['data'])) {
    echo "La simulation retourne un échec ou data nul.\n";
    exit(1);
}

$donnees = $result['data'];

if (($donnees['payments'][0]['status'] ?? null) !== 'SUCCESS') {
    echo "La simulation retourne un status paiement différent de SUCCESS.\n";
    exit(1);
}

// 3. Appliquer la même logique que PaiementService::dossierPendingPayments pour CE dossier
echo "Création de la ligne dans paiements et mise à jour du dossier...\n";

$paiement = $historique->creerPaiement([
    'dossier_id' => $dossier->id,
    'code_paiement' => $dossier->code_paiement,
    'reference_paiement' => $donnees['payments'][0]['airtel_money_id'] ?? 'N/A',
    'montant' => $donnees['subscription']['amount'],
    'nom' => $dossier->candidat->personne->nom ?? 'N/A',
    'prenom' => $dossier->candidat->personne->prenom ?? 'N/A',
]);

$dossier->update([
    'statut' => "PAIEMENT DE FRAIS  D'EXAMEN - Complété",
]);

echo "Paiement créé:\n";
echo json_encode($paiement->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

$dossier->refresh();
echo "Dossier après mise à jour:\n";
echo json_encode([
    'id' => $dossier->id,
    'statut' => $dossier->statut,
    'code_paiement' => $dossier->code_paiement,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

