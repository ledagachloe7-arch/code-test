<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Utilisateur;
use Illuminate\Support\Facades\DB;

$email = 'moctarsidibe3@gmail.com';
$phone = '077724499';

echo "\n🗑️  SUPPRESSION DE L'UTILISATEUR DE TEST\n";
echo "----------------------------------------\n";

$user = Utilisateur::where('email', $email)->orWhere('telephone', $phone)->first();

if ($user) {
    echo "✅ Utilisateur trouvé : {$user->email} (ID: {$user->id})\n";
    
    try {
        DB::beginTransaction();
        
        // Supprimer les codes de vérification liés
        DB::table('verification_codes')->where('utilisateur_id', $user->id)->delete();
        echo "   - Codes de vérification supprimés\n";
        
        // Supprimer la personne liée si elle existe
        if ($user->personne) {
            $user->personne->delete();
            echo "   - Profil 'Personne' supprimé\n";
        }
        
        // Supprimer l'utilisateur
        $user->delete();
        // Si SoftDeletes est activé, on force la suppression définitive
        if (method_exists($user, 'forceDelete')) {
            $user->forceDelete();
        }
        
        DB::commit();
        echo "✅ SUCCESS: Utilisateur supprimé définitivement !\n";
        
    } catch (\Exception $e) {
        DB::rollBack();
        echo "❌ ERREUR: " . $e->getMessage() . "\n";
    }
} else {
    echo "⚠️  Utilisateur non trouvé (il est déjà supprimé ?)\n";
}
echo "----------------------------------------\n";
