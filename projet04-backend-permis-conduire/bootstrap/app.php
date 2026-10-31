<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withBroadcasting(
        channels: __DIR__ . '/../routes/channels.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Enregistrer les middlewares personnalisés
        $middleware->alias([
            'auth.token' => \App\Http\Middleware\AuthentikTokenMiddleware::class,
            'role' => \App\Http\Middleware\CheckRoleMiddleware::class,
            'x.api.key' => \App\Http\Middleware\PublicApiKeyMiddleware::class,
            'public.api.ip.whitelist' => \App\Http\Middleware\PublicApiIpWhitelistMiddleware::class,
        ]);
        // Ajouter le middleware CORS globalement pour les routes API
        // CleanCorsHeaders nettoie les headers CORS dupliqués (peuvent venir du serveur web + Laravel)
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
        // Nettoyer les headers CORS dupliqués après que tous les middlewares aient été exécutés
        $middleware->api(append: [
            \App\Http\Middleware\CleanCorsHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
