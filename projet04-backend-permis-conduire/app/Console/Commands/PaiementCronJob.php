<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\PaiementService;
class PaiementCronJob extends Command
{
      /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:paiement-cron-job';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Exécute les dossiers en attente de paiement';

    protected $service;

    public function __construct(PaiementService $service)
    {
        parent::__construct();
        $this->service = $service;
    }

    public function handle(): int
    {
        $this->service->dossierPendingPayments();
        return \Symfony\Component\Console\Command\Command::SUCCESS;
    }

}
