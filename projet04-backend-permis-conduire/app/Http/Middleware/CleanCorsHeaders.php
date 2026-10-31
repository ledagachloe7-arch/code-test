<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CleanCorsHeaders
{
    /**
     * Handle an incoming request.
     * 
     * Ce middleware nettoie les headers CORS dupliqués qui peuvent être ajoutés
     * à la fois par le serveur web (Apache/Nginx) et par Laravel.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Liste des headers CORS à nettoyer
        $corsHeaders = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers',
            'Access-Control-Expose-Headers',
            'Access-Control-Allow-Credentials',
            'Access-Control-Max-Age',
        ];

        // Nettoyer chaque header CORS pour éviter les duplications
        foreach ($corsHeaders as $headerName) {
            if ($response->headers->has($headerName)) {
                // Récupérer toutes les valeurs du header (peut être un tableau si dupliqué)
                $allValues = $response->headers->all($headerName);
                
                if (count($allValues) > 1) {
                    // Si plusieurs valeurs, nettoyer
                    $cleanValue = $this->cleanHeaderValue($headerName, $allValues);
                    
                    // Supprimer toutes les occurrences et ajouter une seule valeur propre
                    $response->headers->remove($headerName);
                    $response->headers->set($headerName, $cleanValue, true);
                } elseif (count($allValues) === 1) {
                    // Une seule valeur mais peut contenir des virgules (duplication dans la valeur)
                    $value = is_array($allValues[0]) ? $allValues[0][0] : $allValues[0];
                    
                    // Vérifier si la valeur contient des duplications (ex: "origin1, origin1")
                    if (strpos($value, ',') !== false) {
                        $parts = array_map('trim', explode(',', $value));
                        $uniqueParts = array_unique($parts);
                        $cleanValue = implode(', ', $uniqueParts);
                        
                        // Pour Access-Control-Allow-Origin, une seule origine est autorisée
                        if ($headerName === 'Access-Control-Allow-Origin' && count($uniqueParts) > 1) {
                            $cleanValue = $this->selectBestOrigin($uniqueParts, $request);
                        }
                        
                        $response->headers->set($headerName, $cleanValue, true);
                    }
                }
            }
        }

        return $response;
    }

    /**
     * Nettoie la valeur d'un header CORS
     */
    private function cleanHeaderValue(string $headerName, array $values): string
    {
        // Aplatir le tableau si nécessaire
        $flatValues = [];
        foreach ($values as $value) {
            if (is_array($value)) {
                $flatValues = array_merge($flatValues, $value);
            } else {
                $flatValues[] = $value;
            }
        }

        // Pour Access-Control-Allow-Origin, une seule valeur est autorisée
        if ($headerName === 'Access-Control-Allow-Origin') {
            // Si '*' est présent, utiliser '*'
            if (in_array('*', $flatValues)) {
                return '*';
            }
            // Sinon, prendre la première valeur unique
            $unique = array_unique($flatValues);
            return reset($unique);
        }

        // Pour les autres headers, fusionner les valeurs uniques
        $unique = array_unique($flatValues);
        return implode(', ', $unique);
    }

    /**
     * Sélectionne la meilleure origine parmi plusieurs
     */
    private function selectBestOrigin(array $origins, Request $request): string
    {
        $requestOrigin = $request->headers->get('Origin');
        
        // Si l'origine de la requête correspond à l'une des origines, l'utiliser
        if ($requestOrigin && in_array($requestOrigin, $origins)) {
            return $requestOrigin;
        }
        
        // Sinon, prendre la première
        return reset($origins);
    }
}

