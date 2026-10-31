<?php

namespace App\Console\Commands;

use App\Models\AutoEcole;
use App\Models\Candidat;
use App\Models\Dossier;
use App\Models\FormationAutoEcole;
use App\Models\Personne;
use App\Models\Referentiel;
use App\Models\TypeDemande;
use App\Models\Utilisateur;
use App\Services\AirtelSmsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Crée un jeu minimal candidat + dossier (statut DOSSIER ENVOYER) et envoie le SMS modèle « carte disponible » (Airtel).
 * Usage ponctuel pour valider numéro / passerelle ; ne pas exposer en production sans garde-fous.
 */
class TestSmsCarteDisponibleCommand extends Command
{
    protected $signature = 'app:test-sms-carte-disponible
                            {telephone : Numéro Gabon (ex. 077773851)}
                            {--email= : Email du compte test (sinon généré)}';

    protected $description = 'Crée un candidat + dossier (DOSSIER ENVOYER) et envoie le SMS « carte disponible » au numéro indiqué.';

    public function handle(): int
    {
        $telephone = trim((string) $this->argument('telephone'));
        $email = $this->option('email') ?: ('sms-test-' . time() . '@example.invalid');

        $typeDemande = TypeDemande::query()->first();
        $autoEcole = AutoEcole::query()->first();
        $formation = $autoEcole
            ? FormationAutoEcole::query()->where('auto_ecole_id', $autoEcole->id)->first()
            : null;
        $centre = Referentiel::query()->where('type_ref', 'centre')->first();

        if (! $typeDemande || ! $autoEcole || ! $formation) {
            $this->error('Données manquantes : TypeDemande, AutoEcole ou Formation (seed la base).');

            return self::FAILURE;
        }

        $existing = Utilisateur::query()->where('email', $email)->first();
        if ($existing) {
            $user = $existing;
            $personne = $user->personne;
            if (! $personne) {
                $personne = Personne::create([
                    'utilisateur_id' => $user->id,
                    'nom' => 'Test',
                    'prenom' => 'SMS',
                    'email' => $user->email,
                    'contact' => $telephone,
                    'adresse' => 'Test SMS',
                ]);
            }
            $candidat = $personne->candidat;
            if (! $candidat) {
                $candidat = Candidat::create([
                    'personne_id' => $personne->id,
                    'numero_candidat' => 'CAN-SMS-' . substr((string) $user->id, 0, 8),
                    'date_naissance' => now()->subYears(22),
                    'lieu_naissance' => 'Libreville',
                    'nip' => null,
                    'type_piece' => 'CNI',
                    'numero_piece' => 'SMS' . substr((string) $user->id, 0, 8),
                    'nationalite' => 'Gabonaise',
                    'genre' => 'M',
                ]);
            }
            $this->info("Compte existant réutilisé : {$user->email}");
        } else {
            $user = Utilisateur::create([
                'email' => $email,
                'telephone' => $telephone,
                'password' => Hash::make('SmsTest123!'),
                'role' => 'ROLE_CANDIDAT',
            ]);
            $personne = Personne::create([
                'utilisateur_id' => $user->id,
                'nom' => 'Test',
                'prenom' => 'SMS',
                'email' => $email,
                'contact' => $telephone,
                'adresse' => 'Test SMS',
            ]);
            $candidat = Candidat::create([
                'personne_id' => $personne->id,
                'numero_candidat' => 'CAN-SMS-' . substr((string) $user->id, 0, 8),
                'date_naissance' => now()->subYears(22),
                'lieu_naissance' => 'Libreville',
                'nip' => null,
                'type_piece' => 'CNI',
                'numero_piece' => 'SMS' . substr((string) $user->id, 0, 8),
                'nationalite' => 'Gabonaise',
                'genre' => 'M',
            ]);
            $this->info("Compte test créé : {$email} / SmsTest123!");
        }

        $user->update(['telephone' => $telephone]);
        $personne->update(['contact' => $telephone]);

        $dossier = Dossier::query()->where('candidat_id', $candidat->id)->first();
        if (! $dossier) {
            $dossier = Dossier::create([
                'candidat_id' => $candidat->id,
                'auto_ecole_id' => $autoEcole->id,
                'formation_id' => $formation->id,
                'type_demande_id' => $typeDemande->id,
                'statut' => 'en_attente',
                'centre_id' => $centre?->id,
            ]);
            $this->info("Dossier créé : {$dossier->id}");
        } else {
            $dossier->update([
                'centre_id' => $centre?->id ?? $dossier->centre_id,
            ]);
            $this->info("Dossier existant : {$dossier->id}");
        }

        $dossier->update(['statut' => Dossier::STATUT_DOSSIER_ENVOYER]);

        $centreNom = 'votre centre d\'enregistrement';
        if ($centre && is_string($centre->libelle) && trim($centre->libelle) !== '') {
            $centreNom = trim($centre->libelle);
        }
        $message = 'DGTT: Votre carte est disponible. Vous pouvez la retirer au centre : ' . $centreNom . '.';
        if (strlen($message) > 160) {
            $message = substr($message, 0, 157) . '...';
        }

        $this->line('');
        $this->line('Envoi SMS Airtel…');
        $diag = (new AirtelSmsService())->sendWithDiagnostics($telephone, $message);

        if (($diag['success'] ?? false) === true) {
            $this->info('SMS envoyé avec succès.');
            $this->line('Réponse : ' . json_encode($diag, JSON_UNESCAPED_UNICODE));
        } else {
            $this->error('Échec envoi SMS.');
            $this->line(json_encode($diag, JSON_UNESCAPED_UNICODE));

            return self::FAILURE;
        }

        $this->line('');
        $this->line('--- Récap ---');
        $this->line("DOSSIER_ID={$dossier->id}");
        $this->line("TELEPHONE={$telephone}");
        $this->line("STATUT_DOSSIER=" . Dossier::STATUT_DOSSIER_ENVOYER . ' (inchangé après SMS ; pas de passage auto à CARTE_DISPONIBLE)');
        $this->line('-------------');

        return self::SUCCESS;
    }
}
