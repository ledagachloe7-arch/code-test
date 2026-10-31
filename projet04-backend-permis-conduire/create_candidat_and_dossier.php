<?php
/**
 * Script pour créer un nouveau candidat + dossier (à exécuter avec: php artisan tinker < create_candidat_and_dossier.php)
 * Ou copier-coller dans tinker.
 */
use App\Models\Utilisateur;
use App\Models\Personne;
use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\TypeDemande;
use App\Models\AutoEcole;
use App\Models\FormationAutoEcole;
use Illuminate\Support\Facades\Hash;

$email = 'nouveau.candidat@test.com';
$telephone = '0699999999';
$password = 'Candidat123!';

// Vérifier si l'utilisateur existe déjà
$existing = Utilisateur::where('email', $email)->orWhere('telephone', $telephone)->first();
if ($existing) {
    echo "Utilisateur existe déjà: {$existing->email}\n";
    echo "ID: {$existing->id}\n";
    $user = $existing;
    $personne = $user->personne;
    $candidat = $personne?->candidat;
} else {
    $user = Utilisateur::create([
        'email' => $email,
        'telephone' => $telephone,
        'password' => Hash::make($password),
        'role' => 'ROLE_CANDIDAT',
    ]);
    $personne = Personne::create([
        'utilisateur_id' => $user->id,
        'nom' => 'Nouveau',
        'prenom' => 'Candidat',
        'email' => $email,
        'contact' => $telephone,
        'adresse' => 'Adresse test',
    ]);
    $candidat = Candidat::create([
        'personne_id' => $personne->id,
        'numero_candidat' => 'CAN-TEST-' . substr($user->id, 0, 8),
    ]);
    echo "Candidat créé: {$user->email}\n";
}

$typeDemande = TypeDemande::first();
$autoEcole = AutoEcole::first();
$formation = FormationAutoEcole::where('auto_ecole_id', $autoEcole->id)->first();

if (!$typeDemande || !$autoEcole || !$formation) {
    echo "Données manquantes (TypeDemande, AutoEcole ou Formation).\n";
    exit(1);
}

$dossierExist = Dossier::where('candidat_id', $candidat->id)->first();
if ($dossierExist) {
    echo "Dossier existant: {$dossierExist->id}\n";
    $dossierId = $dossierExist->id;
} else {
    $dossier = Dossier::create([
        'candidat_id' => $candidat->id,
        'auto_ecole_id' => $autoEcole->id,
        'formation_id' => $formation->id,
        'type_demande_id' => $typeDemande->id,
        'statut' => 'en_attente',
    ]);
    $dossierId = $dossier->id;
    echo "Dossier créé: {$dossierId}\n";
}

echo "EMAIL:$email\n";
echo "PASSWORD:$password\n";
echo "DOSSIER_ID:$dossierId\n";
