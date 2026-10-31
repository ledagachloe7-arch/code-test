<?php

namespace App\Console\Commands;

use App\Models\AutoEcole;
use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\Personne;
use App\Models\TypeDemande;
use App\Models\Utilisateur;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateTestCandidat extends Command
{
    protected $signature = 'app:create-test-candidat
                            {--email=nouveau.candidat@test.com : Email du candidat}
                            {--password=Candidat123! : Mot de passe}';

    protected $description = 'Crée un nouveau candidat de test avec un dossier (pour tester l\'upload document).';

    public function handle(): int
    {
        $email = $this->option('email');
        $password = $this->option('password');
        $telephone = '06' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);

        $existing = Utilisateur::where('email', $email)->first();
        if ($existing) {
            $user = $existing;
            $personne = $user->personne;
            if (! $personne) {
                $personne = Personne::create([
                    'utilisateur_id' => $user->id,
                    'nom' => 'Nouveau',
                    'prenom' => 'Candidat',
                    'email' => $user->email,
                    'contact' => $user->telephone ?? $telephone,
                    'adresse' => 'Adresse test',
                ]);
                $this->info('Profil personne créé.');
            }
            $candidat = $personne->candidat;
            if (! $candidat) {
                $candidat = Candidat::create([
                    'personne_id' => $personne->id,
                    'numero_candidat' => 'CAN-TEST-' . substr((string) $user->id, 0, 8),
                    'date_naissance' => now()->subYears(20),
                    'lieu_naissance' => 'Paris',
                    'nip' => null,
                    'type_piece' => 'CNI',
                    'numero_piece' => 'PIECE' . substr((string) $user->id, 0, 8),
                    'nationalite' => 'Française',
                    'genre' => 'M',
                ]);
                $this->info('Profil candidat créé.');
            }
            $this->info("Utilisateur existant : {$user->email}");
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
                'numero_candidat' => 'CAN-TEST-' . substr((string) $user->id, 0, 8),
                'date_naissance' => now()->subYears(20),
                'lieu_naissance' => 'Paris',
                'nip' => null,
                'type_piece' => 'CNI',
                'numero_piece' => 'PIECE' . substr((string) $user->id, 0, 8),
                'nationalite' => 'Française',
                'genre' => 'M',
            ]);
            $this->info("Candidat créé : {$user->email}");
        }

        if (! $candidat) {
            $this->error('Profil candidat manquant.');
            return self::FAILURE;
        }

        $typeDemande = TypeDemande::first();
        $autoEcole = AutoEcole::first();
        $formation = $autoEcole
            ? \App\Models\FormationAutoEcole::where('auto_ecole_id', $autoEcole->id)->first()
            : null;

        if (! $typeDemande || ! $autoEcole || ! $formation) {
            $this->error('Données manquantes : TypeDemande, AutoEcole ou Formation.');
            return self::FAILURE;
        }

        $dossier = Dossier::where('candidat_id', $candidat->id)->first();
        if (! $dossier) {
            $dossier = Dossier::create([
                'candidat_id' => $candidat->id,
                'auto_ecole_id' => $autoEcole->id,
                'formation_id' => $formation->id,
                'type_demande_id' => $typeDemande->id,
                'statut' => 'en_attente',
            ]);
            $this->info("Dossier créé : {$dossier->id}");
        } else {
            $this->info("Dossier existant : {$dossier->id}");
        }

        $this->line('');
        $this->line('--- Identifiants pour le test ---');
        $this->line("EMAIL=$email");
        $this->line("PASSWORD=$password");
        $this->line("DOSSIER_ID={$dossier->id}");
        $this->line('--------------------------------');

        return self::SUCCESS;
    }
}
