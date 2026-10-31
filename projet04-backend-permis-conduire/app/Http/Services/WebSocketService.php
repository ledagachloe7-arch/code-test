<?php

namespace App\Http\Services;

use App\Models\SocketMessage;
use App\Services\AuthentikService;
use App\Events\StatutDossierChange;

class WebSocketService
{
    protected $authentik;

    public function __construct(AuthentikService $authentik)
    {
        $this->authentik = $authentik;
    }

    public function statutDossierToPayWs(string $message): void
    {
        $roles = $this->authentik->getGroupRoles('DGTT');

        // Filtre uniquement les rôles qui nous intéressent
        $targetRoles = array_values(array_filter($roles, fn($r) => in_array($r, ['ROLE_CNEPC'])));

        if (empty($targetRoles)) {
            return; // Aucun destinataire
        }

        // Broadcast un message par rôle
        foreach ($targetRoles as $role) {
            broadcast(new StatutDossierChange($message, [$role]));
            SocketMessage::create([
                'message' => ['text' => $message],
                'role' => $role,
            ]);
        }

        \Log::info('Broadcasting WS', [
            'roles' => $targetRoles,
            'message' => $message
        ]);
    }
}
