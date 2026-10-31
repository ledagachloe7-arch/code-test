<?php

namespace App\Console\Commands;

use App\Models\Candidat;
use Illuminate\Console\Command;

class PermisListCandidatsEchantillonCommand extends Command
{
    protected $signature = 'permis:list-candidats-echantillon
                            {--limit=20 : Nombre maximum de lignes}';

    protected $description = 'Liste des candidats (nom, prénom, date de naissance, NIP, n° usager, n° permis si dossier) pour construire un GET /api/v1/permis/usager ou `permis:test-usager-api`.';

    public function handle(): int
    {
        $limit = max(1, min(100, (int) $this->option('limit')));

        $rows = Candidat::query()
            ->with(['personne', 'dossiers'])
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();

        $table = [];
        foreach ($rows as $candidat) {
            $p = $candidat->personne;
            if ($p === null) {
                continue;
            }
            $dob = $candidat->date_naissance;
            $dobStr = $dob instanceof \DateTimeInterface ? $dob->format('Y-m-d') : (string) $dob;
            $numeroPermis = '';
            foreach ($candidat->dossiers as $dossier) {
                $np = $dossier->numero_permis ?? '';
                if (is_string($np) && trim($np) !== '') {
                    $numeroPermis = trim($np);
                    break;
                }
            }
            $table[] = [
                'nom' => $p->nom,
                'prenom' => $p->prenom ?? '',
                'date_naissance' => $dobStr,
                'nip' => $candidat->nip ?? '',
                'numero_usager' => $candidat->numero_candidat,
                'numero_permis' => $numeroPermis,
            ];
        }

        if ($table === []) {
            $this->warn('Aucun candidat avec personne trouvé.');

            return self::SUCCESS;
        }

        $this->table(array_keys($table[0]), array_map('array_values', $table));

        $this->newLine();
        $this->comment('Exemple (numero_permis obligatoire ; sans NIP dans l’URL si le NIP est vide) :');
        $r = $table[0];
        if ($r['numero_permis'] === '') {
            $this->warn('Premier candidat sans numéro de permis sur un dossier : complète manuellement le 4e argument de permis:test-usager-api.');
        }
        $cmd = sprintf(
            'php artisan permis:test-usager-api %s %s %s %s',
            escapeshellarg($r['nom']),
            escapeshellarg($r['prenom']),
            escapeshellarg($r['date_naissance']),
            escapeshellarg($r['numero_permis'] !== '' ? $r['numero_permis'] : 'REMPLACER_NUMERO_PERMIS')
        );
        if ($r['nip'] !== '') {
            $cmd .= ' --nip=' . escapeshellarg($r['nip']);
        }
        $this->line($cmd);

        return self::SUCCESS;
    }
}
