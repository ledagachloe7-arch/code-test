<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PublicApiIpWhitelistMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $raw = (string) config('services.public_api.allowed_ips', '');
        $allowed = array_values(array_filter(array_map('trim', explode(',', $raw)), static fn (string $ip) => $ip !== ''));

        if ($allowed === []) {
            return $next($request);
        }

        $clientIp = $this->resolveClientIp($request);
        if (!in_array($clientIp, $allowed, true)) {
            return response()->json([
                'message' => 'Adresse IP source non autorisée.',
            ], 403);
        }

        return $next($request);
    }

    private function resolveClientIp(Request $request): string
    {
        $xff = $request->headers->get('X-Forwarded-For');
        if (is_string($xff) && $xff !== '') {
            $parts = array_map('trim', explode(',', $xff));
            if ($parts[0] !== '') {
                return $parts[0];
            }
        }

        return (string) $request->ip();
    }
}
