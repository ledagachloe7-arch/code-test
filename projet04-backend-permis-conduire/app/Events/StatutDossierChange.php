<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class StatutDossierChange implements ShouldBroadcast
{
    public function __construct(
        public string $message,
        public array $roles
    ) {}

    public function broadcastOn(): array
    {
        // Génère un Channel par rôle
        return collect($this->roles)
            ->map(fn($role) => new Channel("role.$role"))
            ->toArray();
    }

    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'role' => $this->roles[0] ?? null
        ];
    }

    public function broadcastAs(): string
    {
        return 'dossier.status.changed';
    }
}
