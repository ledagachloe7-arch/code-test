<?php
use Illuminate\Console\Scheduling\Schedule;

function schedule(Schedule $schedule)
{
    // Toutes les heures
    $schedule->command('app:paiement-cron-job')
        ->everyFifteenMinutes()
        ->withoutOverlapping()
        ->runInBackground()
        ->appendOutputTo(storage_path('logs/paiement_cron.log'));
}