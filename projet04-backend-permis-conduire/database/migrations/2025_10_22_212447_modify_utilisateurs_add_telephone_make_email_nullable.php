<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE utilisateurs ALTER COLUMN email DROP NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('utilisateurs', function (Blueprint $table) {
                // Rendre email nullable
                $table->string('email')->nullable()->change();
            });
        }

        // Vérifier si la colonne telephone existe déjà
        $hasTelephoneColumn = Schema::hasColumn('utilisateurs', 'telephone');
        
        if (!$hasTelephoneColumn) {
            // Ajouter téléphone SANS contrainte unique d'abord
            Schema::table('utilisateurs', function (Blueprint $table) {
                $table->string('telephone')->nullable()->after('email');
            });
        }

        // Remplir les valeurs vides avec des valeurs uniques depuis la table personnes
        // ou générer des valeurs temporaires uniques
        // Vérifier si la table personnes existe avant de faire le JOIN
        $hasPersonnesTable = Schema::hasTable('personnes');
        
        if ($hasPersonnesTable) {
            $utilisateurs = DB::table('utilisateurs')
                ->leftJoin('personnes', 'utilisateurs.id', '=', 'personnes.utilisateur_id')
                ->where(function($query) {
                    $query->whereNull('utilisateurs.telephone')
                          ->orWhere('utilisateurs.telephone', '');
                })
                ->select('utilisateurs.id', 'personnes.contact')
                ->get();
        } else {
            // Si la table personnes n'existe pas encore, récupérer uniquement les utilisateurs
            $utilisateurs = DB::table('utilisateurs')
                ->where(function($query) {
                    $query->whereNull('telephone')
                          ->orWhere('telephone', '');
                })
                ->select('id')
                ->get()
                ->map(function($user) {
                    return (object) ['id' => $user->id, 'contact' => null];
                });
        }

        foreach ($utilisateurs as $utilisateur) {
            $telephone = null;
            
            // Essayer d'utiliser le contact de la personne si disponible
            if ($utilisateur->contact && !empty($utilisateur->contact)) {
                $telephone = $utilisateur->contact;
            } else {
                // Générer un numéro temporaire unique basé sur l'ID
                $telephone = 'TEMP_' . substr(str_replace('-', '', $utilisateur->id), 0, 10);
            }
            
            // Vérifier que ce téléphone n'existe pas déjà
            $exists = DB::table('utilisateurs')
                ->where('telephone', $telephone)
                ->where('id', '!=', $utilisateur->id)
                ->exists();
            
            if ($exists) {
                // Si existe, ajouter un suffixe unique
                $telephone = $telephone . '_' . substr($utilisateur->id, 0, 8);
            }
            
            DB::table('utilisateurs')
                ->where('id', $utilisateur->id)
                ->update(['telephone' => $telephone]);
        }

        // Vérifier si la contrainte unique existe déjà
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'pgsql') {
            // PostgreSQL : vérifier l'existence de l'index unique
            $hasUniqueIndex = DB::select("
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'utilisateurs_telephone_unique'
            ");
        } else {
            // MySQL/MariaDB
            $hasUniqueIndex = DB::select("SHOW INDEXES FROM utilisateurs WHERE Key_name = 'utilisateurs_telephone_unique'");
        }
        
        if (empty($hasUniqueIndex)) {
            // Remplir les valeurs NULL restantes avant d'ajouter la contrainte
            $nullTelephones = DB::table('utilisateurs')
                ->whereNull('telephone')
                ->orWhere('telephone', '')
                ->get();
            
            foreach ($nullTelephones as $user) {
                $telephone = 'TEMP_' . substr(str_replace('-', '', $user->id), 0, 10) . '_' . time();
                DB::table('utilisateurs')
                    ->where('id', $user->id)
                    ->update(['telephone' => $telephone]);
            }
            
            // Maintenant ajouter la contrainte unique et rendre non-nullable
            if ($driver === 'pgsql') {
                // PostgreSQL : utiliser ALTER TABLE directement
                DB::statement('ALTER TABLE utilisateurs ALTER COLUMN telephone SET NOT NULL');
                DB::statement('CREATE UNIQUE INDEX utilisateurs_telephone_unique ON utilisateurs(telephone)');
            } else {
                // MySQL/MariaDB : utiliser Schema Builder
                Schema::table('utilisateurs', function (Blueprint $table) {
                    $table->string('telephone')->nullable(false)->unique()->change();
                });
            }
        } else {
            // Si l'index unique existe mais que la colonne est nullable, la rendre non-nullable
            $nullCount = DB::table('utilisateurs')->whereNull('telephone')->orWhere('telephone', '')->count();
            
            if ($nullCount > 0) {
                // Remplir les valeurs NULL
                $nullTelephones = DB::table('utilisateurs')
                    ->whereNull('telephone')
                    ->orWhere('telephone', '')
                    ->get();
                
                foreach ($nullTelephones as $user) {
                    $telephone = 'TEMP_' . substr(str_replace('-', '', $user->id), 0, 10) . '_' . time();
                    DB::table('utilisateurs')
                        ->where('id', $user->id)
                        ->update(['telephone' => $telephone]);
                }
            }
            
            // Rendre non-nullable si ce n'est pas déjà le cas
            if ($driver === 'pgsql') {
                // PostgreSQL : utiliser ALTER TABLE directement
                DB::statement('ALTER TABLE utilisateurs ALTER COLUMN telephone SET NOT NULL');
            } else {
                // MySQL/MariaDB : utiliser Schema Builder
                Schema::table('utilisateurs', function (Blueprint $table) {
                    $table->string('telephone')->nullable(false)->change();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        Schema::table('utilisateurs', function (Blueprint $table) {
            // Supprimer le téléphone
            $table->dropColumn('telephone');
        });

        if ($driver === 'pgsql') {
            // PostgreSQL : utiliser ALTER TABLE directement
            DB::statement('ALTER TABLE utilisateurs ALTER COLUMN email SET NOT NULL');
        } else {
            // MySQL/MariaDB : utiliser Schema Builder
            Schema::table('utilisateurs', function (Blueprint $table) {
                // Remettre email obligatoire
                $table->string('email')->nullable(false)->change();
            });
        }
    }
};

