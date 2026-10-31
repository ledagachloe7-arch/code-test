<?php

namespace App\Jobs;

use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;      // Nombre max de tentatives
    public int $timeout = 20;   // Timeout du job (secondes)

    protected string $phone;
    protected string $template;
    protected array $variables;

    public function __construct(string $phone, string $template, array $variables)
    {
        $this->phone = $phone;
        $this->template = $template;
        $this->variables = $variables;
    }

    public function handle(SmsService $smsService): void
    {
        $smsService->send(
            $this->phone,
            $this->template,
            $this->variables
        );
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SendSmsJob failed', [
            'phone' => $this->phone,
            'error' => $exception->getMessage()
        ]);
    }
}