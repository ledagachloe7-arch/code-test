<?php

namespace Database\Seeders;

use App\Models\Candidat;
use App\Models\Personne;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CandidatSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Récupérer les personnes avec le rôle candidat
            $personnesCandidats = Personne::whereHas('utilisateur', function ($query) {
                $query->where('role', 'candidat');
            })->get();

            if ($personnesCandidats->isEmpty()) {
                $this->command->warn('⚠️ Aucune personne candidat trouvée. Exécutez d\'abord UtilisateurSeeder.');
                return;
            }

            $candidatsData = [
                [
                    'numero_candidat' => 'CAN-2025-001',
                    'date_naissance' => '1995-03-15',
                    'lieu_naissance' => 'Paris',
                    'nip' => '1234567890123',
                    'type_piece' => 'CNI',
                    'numero_piece' => '1234567890',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat1@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-002',
                    'date_naissance' => '1992-07-20',
                    'lieu_naissance' => 'Lyon',
                    'nip' => '9876543210987',
                    'type_piece' => 'Passeport',
                    'numero_piece' => '9876543210',
                    'nationalite' => 'Française',
                    'genre' => 'M',
                    'personne_email' => 'candidat2@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-003',
                    'date_naissance' => '1998-12-10',
                    'lieu_naissance' => 'Marseille',
                    'nip' => '1122334455667',
                    'type_piece' => 'CNI',
                    'numero_piece' => '1122334455',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat3@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-004',
                    'date_naissance' => '1993-05-25',
                    'lieu_naissance' => 'Toulouse',
                    'nip' => '2233445566778',
                    'type_piece' => 'CNI',
                    'numero_piece' => '2233445566',
                    'nationalite' => 'Française',
                    'genre' => 'M',
                    'personne_email' => 'candidat4@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-005',
                    'date_naissance' => '1996-09-18',
                    'lieu_naissance' => 'Nice',
                    'nip' => '3344556677889',
                    'type_piece' => 'Passeport',
                    'numero_piece' => '3344556677',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat5@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-006',
                    'date_naissance' => '1991-11-30',
                    'lieu_naissance' => 'Bordeaux',
                    'nip' => '4455667788990',
                    'type_piece' => 'CNI',
                    'numero_piece' => '4455667788',
                    'nationalite' => 'Française',
                    'genre' => 'M',
                    'personne_email' => 'candidat6@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-007',
                    'date_naissance' => '1997-02-14',
                    'lieu_naissance' => 'Lille',
                    'nip' => '5566778899001',
                    'type_piece' => 'CNI',
                    'numero_piece' => '5566778899',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat7@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-008',
                    'date_naissance' => '1994-08-22',
                    'lieu_naissance' => 'Strasbourg',
                    'nip' => '6677889900112',
                    'type_piece' => 'Passeport',
                    'numero_piece' => '6677889900',
                    'nationalite' => 'Française',
                    'genre' => 'M',
                    'personne_email' => 'candidat8@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-009',
                    'date_naissance' => '1999-01-05',
                    'lieu_naissance' => 'Montpellier',
                    'nip' => '7788990011223',
                    'type_piece' => 'CNI',
                    'numero_piece' => '7788990011',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat9@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-010',
                    'date_naissance' => '1990-06-12',
                    'lieu_naissance' => 'Nantes',
                    'nip' => '8899001122334',
                    'type_piece' => 'CNI',
                    'numero_piece' => '8899001122',
                    'nationalite' => 'Française',
                    'genre' => 'M',
                    'personne_email' => 'candidat10@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-011',
                    'date_naissance' => '1995-04-28',
                    'lieu_naissance' => 'Rennes',
                    'nip' => '9900112233445',
                    'type_piece' => 'Passeport',
                    'numero_piece' => '9900112233',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat11@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-012',
                    'date_naissance' => '1992-10-15',
                    'lieu_naissance' => 'Tours',
                    'nip' => '0011223344556',
                    'type_piece' => 'CNI',
                    'numero_piece' => '0011223344',
                    'nationalite' => 'Française',
                    'genre' => 'M',
                    'personne_email' => 'candidat12@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-013',
                    'date_naissance' => '1998-03-08',
                    'lieu_naissance' => 'Orléans',
                    'nip' => '1133445566778',
                    'type_piece' => 'CNI',
                    'numero_piece' => '1133445566',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat13@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-014',
                    'date_naissance' => '1993-12-03',
                    'lieu_naissance' => 'Reims',
                    'nip' => '2244556677889',
                    'type_piece' => 'Passeport',
                    'numero_piece' => '2244556677',
                    'nationalite' => 'Française',
                    'genre' => 'M',
                    'personne_email' => 'candidat14@email.com',
                    'telephone' => '0123456790',
                ],
                [
                    'numero_candidat' => 'CAN-2025-015',
                    'date_naissance' => '1996-07-19',
                    'lieu_naissance' => 'Metz',
                    'nip' => '3355667788990',
                    'type_piece' => 'CNI',
                    'numero_piece' => '3355667788',
                    'nationalite' => 'Française',
                    'genre' => 'F',
                    'personne_email' => 'candidat15@email.com',
                    'telephone' => '0123456790',
                ]
            ];

            $createdCount = 0;
            $skippedCount = 0;
            $errorCount = 0;

            // Vérifier l'unicité des NIP et numéros de pièce dans les données
            $nips = [];
            $numeroPieces = [];
            foreach ($candidatsData as $index => $data) {
                $nip = $data['nip'] ?? null;
                $numeroPiece = $data['numero_piece'] ?? null;
                
                if ($nip && isset($nips[$nip])) {
                    $this->command->error("❌ NIP dupliqué dans les données : {$nip} (index {$index} et {$nips[$nip]})");
                }
                if ($numeroPiece && isset($numeroPieces[$numeroPiece])) {
                    $this->command->error("❌ Numéro de pièce dupliqué dans les données : {$numeroPiece} (index {$index} et {$numeroPieces[$numeroPiece]})");
                }
                
                if ($nip) $nips[$nip] = $index;
                if ($numeroPiece) $numeroPieces[$numeroPiece] = $index;
            }

            foreach ($candidatsData as $candidatData) {
                try {
                    // Vérifier si le candidat existe déjà (par numéro candidat, NIP ou numéro de pièce)
                    $existingByNumero = Candidat::where('numero_candidat', $candidatData['numero_candidat'])->first();
                    $existingByNip = Candidat::where('nip', $candidatData['nip'])->first();
                    $existingByPiece = Candidat::where('numero_piece', $candidatData['numero_piece'])->first();
                    
                    if ($existingByNumero || $existingByNip || $existingByPiece) {
                        $skippedCount++;
                        $reason = [];
                        if ($existingByNumero) $reason[] = "numéro candidat ({$candidatData['numero_candidat']})";
                        if ($existingByNip) $reason[] = "NIP ({$candidatData['nip']})";
                        if ($existingByPiece) $reason[] = "numéro pièce ({$candidatData['numero_piece']})";
                        $this->command->warn("⚠️ Candidat existe déjà par " . implode(', ', $reason) . " - ignoré");
                        continue;
                    }

                    // Trouver la personne
                    $personne = $personnesCandidats->where('email', $candidatData['personne_email'])->first();
                    if (!$personne) {
                        $errorCount++;
                        $this->command->warn("⚠️ Personne {$candidatData['personne_email']} non trouvée");
                        continue;
                    }

                    // Vérifier si cette personne a déjà un candidat
                    $existingCandidatForPersonne = Candidat::where('personne_id', $personne->id)->first();
                    if ($existingCandidatForPersonne) {
                        $skippedCount++;
                        $this->command->warn("⚠️ La personne {$candidatData['personne_email']} a déjà un candidat associé - ignoré");
                        continue;
                    }

                    // Créer le candidat
                    Candidat::create([
                        'personne_id' => $personne->id,
                        'numero_candidat' => $candidatData['numero_candidat'],
                        'date_naissance' => $candidatData['date_naissance'],
                        'lieu_naissance' => $candidatData['lieu_naissance'],
                        'nip' => $candidatData['nip'],
                        'type_piece' => $candidatData['type_piece'],
                        'numero_piece' => $candidatData['numero_piece'],
                        'nationalite' => $candidatData['nationalite'],
                        'genre' => $candidatData['genre'],
                    ]);

                    $createdCount++;
                    $this->command->info("✅ Candidat créé : {$candidatData['numero_candidat']} - {$personne->prenom} {$personne->nom}");

                } catch (\Exception $e) {
                    $errorCount++;
                    $this->command->error("❌ Erreur création candidat {$candidatData['numero_candidat']}: " . $e->getMessage());
                    $this->command->error("   Détails: " . $e->getFile() . ":" . $e->getLine());
                }
            }

            $this->command->info("🎉 Seeders terminés :");
            $this->command->info("   - Candidats créés : {$createdCount}");
            $this->command->info("   - Candidats ignorés (déjà existants) : {$skippedCount}");
            $this->command->info("   - Erreurs : {$errorCount}");
            
            // Vérification finale
            $totalInDb = Candidat::count();
            $this->command->info("");
            $this->command->info("📊 Vérification finale :");
            $this->command->info("   - Total candidats dans la base de données : {$totalInDb}");
        });
    }
}