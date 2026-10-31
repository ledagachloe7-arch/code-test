<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Alias de test ciblant explicitement l’opération CNEDDT `DUPLICATAFICHEENREGISTREMENT`.
 * Exige un enregistrement `type_demandes` avec `name` = **DUPLICATAFICHEENREGISTREMENT** (casse exacte).
 */
class TestCneddtDuplicataFicheCommand extends Command
{
    protected $signature = 'app:test-cneddt-duplicata-fiche';

    protected $description = 'Test envoi CNEDDT : type d’opération **DUPLICATAFICHEENREGISTREMENT** (équivalent à `app:test-cneddt-transfert --type=DUPLICATAFICHEENREGISTREMENT`).';

    public function handle(): int
    {
        $this->info('Lancement test CNEDDT — DUPLICATAFICHEENREGISTREMENT…');
        $this->newLine();

        return (int) $this->call('app:test-cneddt-transfert', [
            '--type' => 'DUPLICATAFICHEENREGISTREMENT',
        ]);
    }
}
