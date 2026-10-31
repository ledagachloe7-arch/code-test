<?php
/**
 * Test payload CNEDDT : vérifie l'absence de doublons sur categorie_vehicule[].classe
 * pour plusieurs operation_type (type_demande.name).
 *
 * Dry-run : on construit le payload via buildPayloadForTransfert et on ne fait pas d'appel HTTP CNEDDT.
 */

use App\Models\Candidat;
use App\Models\AutoEcole;
use App\Models\FormationAutoEcole;
use App\Models\TypeDemande;
use App\Models\Dossier;
use App\Http\Controllers\Api\DossierController;
use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require __DIR__ . '/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

echo "=== Test payload transfert CNEDDT (dry-run) ===\n\n";

$candidat = Candidat::with('personne')->first();
$autoEcole = AutoEcole::first();
$formation = FormationAutoEcole::with('typePermis')->first();

if (!$candidat || !$autoEcole || !$formation) {
    echo "Candidat / AutoEcole / Formation manquants. Vérifie seeders / base.\n";
    exit(1);
}

$typePermisCode = $formation->typePermis?->code;
if (empty($typePermisCode)) {
    echo "Formation.typePermis.code manquant.\n";
    exit(1);
}

$otherClasse = $typePermisCode === 'C' ? 'D' : 'C';

echo "Formation typePermis.code = {$typePermisCode}\n";
echo "Classe additionnelle (autre) = {$otherClasse}\n\n";

$operations = [
    'DUPLICATA',
    'CONVERSION',
    'RENOUVELLEMENT',
    'FICHEENREGISTREMENT',
    'DUPLICATAFICHEENREGISTREMENT',
    'NOUVEAUPERMIS',
];

/** @var DossierController $controller */
$controller = $app->make(DossierController::class);
$ref = new ReflectionClass($controller);
$method = $ref->getMethod('buildPayloadForTransfert');
$method->setAccessible(true);

$typeDemandeNames = [];
foreach ($operations as $name) {
    $td = TypeDemande::firstOrCreate(['name' => $name], []);
    $typeDemandeNames[$td->id] = $td->name;
}

$typeDemandeIdsByName = [];
foreach ($typeDemandeNames as $id => $name) {
    $typeDemandeIdsByName[$name] = $id;
}

foreach ($operations as $operationType) {
    $typeDemandeId = $typeDemandeIdsByName[$operationType];

    // On force data_categorie a contenir aussi la classe de base => doublon attendu avant correction.
    $dossier = Dossier::create([
        'candidat_id' => $candidat->id,
        'auto_ecole_id' => $autoEcole->id,
        'formation_id' => $formation->id,
        'type_demande_id' => $typeDemandeId,
        'statut' => 'en_attente',
        'commentaires' => "Test payload {$operationType} (doublon classe attendu avant correction)",
        'numero_permis' => uniqid('GA') . '12345',
        'lieu_de_dobtention_du_permis' => 'Libreville',
        'date_de_dobtention_du_permis' => '2020-01-01',
        'date_expiration' => '2030-01-01',
        'data_categorie' => [
            [
                'classe' => $typePermisCode,
                'ville' => '45874',
                'codification_code' => '452211',
                'valable_du' => '2025-02-03',
                'jusqu_au' => '2025-02-03',
            ],
            [
                'classe' => $otherClasse,
                'ville' => 'Libreville',
                'codification_code' => '12340',
                'valable_du' => '2025-02-03',
                'jusqu_au' => '2030-02-03',
            ],
        ],
    ]);

    $fresh = $dossier->fresh(['candidat.personne', 'autoEcole.province', 'formation.typePermis']);
    $payload = $method->invoke($controller, $fresh, $typeDemandeId, collect($typeDemandeNames));

    if ($payload === null) {
        echo "[{$operationType}] payload = null (données manquantes) => SKIP\n";
        continue;
    }

    $classes = array_map(fn($c) => (string)($c['classe'] ?? ''), $payload['data']['categorie_vehicule'] ?? []);
    $classCounts = array_count_values($classes);

    echo "[{$operationType}] categorie_vehicule classes = [" . implode(', ', $classes) . "]\n";

    $hasDuplicates = false;
    foreach ($classCounts as $classe => $count) {
        if ($count > 1) {
            $hasDuplicates = true;
            echo "  - DUPLICATE: classe={$classe} count={$count}\n";
        }
    }

    if ($operationType === 'NOUVEAUPERMIS') {
        // Pour NOUVEAUPERMIS : data_categorie n'est pas ajoutée => seulement la classe de base.
        $expected = [$typePermisCode];
        $ok = (count($classes) === 1 && $classes[0] === $expected[0]);
        echo "  - Erwartet: [" . implode(', ', $expected) . "] => " . ($ok ? "OK" : "FAIL") . "\n";
    } else {
        $ok = !$hasDuplicates;
        echo "  - Doublons de classe => " . ($ok ? "OK" : "FAIL") . "\n";
    }

    echo "\n";
}

echo "=== Fin tests dry-run payload ===\n";

