<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protège l’UI Scramble (/docs/api) et l’export OpenAPI par HTTP Basic si SCRAMBLE_DOCS_USER / PASSWORD sont définis.
 */
class ScrambleDocsBasicAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedUser = (string) config('scramble.basic_auth.user', '');
        $expectedPass = (string) config('scramble.basic_auth.password', '');

        // Les deux doivent être renseignés pour activer la protection (évite un mot de passe vide par erreur).
        if ($expectedUser === '' || $expectedPass === '') {
            return $next($request);
        }

        [$user, $password] = $this->basicCredentials($request) ?? [null, null];

        if ($user !== null
            && $password !== null
            && hash_equals($expectedUser, $user)
            && hash_equals($expectedPass, $password)) {
            return $next($request);
        }

        return response('Documentation API — authentification requise.', 401, [
            'WWW-Authenticate' => 'Basic realm="Documentation API"',
        ]);
    }

    /**
     * @return array{0: string, 1: string}|null
     */
    private function basicCredentials(Request $request): ?array
    {
        $header = $request->header('Authorization', '');
        if (! is_string($header) || ! str_starts_with($header, 'Basic ')) {
            return null;
        }

        $decoded = base64_decode(substr($header, 6), true);
        if ($decoded === false || ! str_contains($decoded, ':')) {
            return null;
        }

        return explode(':', $decoded, 2);
    }
}
