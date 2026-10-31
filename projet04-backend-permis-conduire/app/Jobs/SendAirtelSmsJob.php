<?php

namespace App\Jobs;

use App\Services\AirtelSmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendAirtelSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(
        protected string $phone,
        protected string $message,
        protected ?string $context = null
    ) {}

    public function handle(AirtelSmsService $smsService): void
    {
        $sent = $smsService->send($this->phone, $this->message);
        if ($sent && $this->context) {
            Log::info('[SMS] Envoi Airtel réussi (job)', ['context' => $this->context, 'phone' => $this->phone]);
        }
        if (!$sent) {
            Log::warning('[SMS] Envoi Airtel échoué (job)', ['context' => $this->context ?? 'unknown', 'phone' => $this->phone]);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SendAirtelSmsJob failed', [
            'phone' => $this->phone,
            'context' => $this->context,
            'error' => $exception->getMessage(),
        ]);
    }
}
