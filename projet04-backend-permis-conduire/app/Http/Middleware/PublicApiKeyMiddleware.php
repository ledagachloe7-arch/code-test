<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class PublicApiKeyMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $provided = trim((string) $request->header('X-API-KEY', $request->header('x-api-key', '')));
        $expected = trim((string) config('services.public_api.key', ''));

        $revokedRaw = (string) config('services.public_api.revoked_keys', '');
        foreach (array_map('trim', explode(',', $revokedRaw)) as $revoked) {
            if ($revoked !== '' && $provided !== '' && hash_equals($revoked, $provided)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Clé API révoquée.',
                ], 403);
            }
        }

        if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
            return response()->json([
                'success' => false,
                'message' => 'Clé API invalide.',
            ], 401);
        }

        return $next($request);
    }
}

