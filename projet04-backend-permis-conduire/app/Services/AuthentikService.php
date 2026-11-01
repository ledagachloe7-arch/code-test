<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;
use Exception;

class AuthentikService
{
    protected Client $client;
    protected ?string $baseUrl = null;
    protected ?string $apiToken = null;

    public function __construct()
    {
        $this->baseUrl = (string) rtrim(config('services.authentik.base_url') ?? '', '/');
        $this->apiToken = (string) (config('services.authentik.api_token') ?? '');
        
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->apiToken,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'verify' => false, // Pour développement local, à activer en production
        ]);
    }

    /**
     * Créer un utilisateur dans Authentik
     *
     * @param array $userData
     * @return array|null
     */
    public function createUser(array $userData): ?array
    {
        try {
            // Utiliser le téléphone comme username principal (obligatoire)
            $username = $userData['telephone'] ?? $userData['email'] ?? null;
            if (!$username) {
                throw new Exception('Le téléphone est obligatoire pour créer un utilisateur dans Authentik.');
            }

            // Construire le payload JSON de manière conditionnelle
            $payload = [
                'username' => $username, // Téléphone comme username principal
                    'name' => ($userData['prenom'] ?? '') . ' ' . ($userData['nom'] ?? ''),
                    'is_active' => true,
                    'path' => 'users',
                    'attributes' => [
                        'role' => $userData['role'] ?? 'ROLE_CANDIDAT',
                        'contact' => $userData['contact'] ?? '',
                    'telephone' => $userData['telephone'] ?? '',
                        'adresse' => $userData['adresse'] ?? '',
                        'nom' => $userData['nom'] ?? '',
                        'prenom' => $userData['prenom'] ?? '',
                    ],
            ];

            // N'inclure l'email que s'il est fourni et non vide
            if (!empty($userData['email'])) {
                $payload['email'] = $userData['email'];
            }

            $response = $this->client->post('/api/v3/core/users/', [
                'json' => $payload
            ]);

            $user = json_decode($response->getBody()->getContents(), true);

            // Définir le mot de passe de l'utilisateur
            if (isset($userData['password'])) {
                $this->setUserPassword((int) $user['pk'], $userData['password']);
            }

            // Ajouter l'utilisateur au groupe correspondant à son rôle
            $role = $userData['role'] ?? 'ROLE_CANDIDAT';
            $this->addUserToRoleGroup($user['pk'], $role);

            Log::info('Utilisateur créé dans Authentik', [
                'user_id' => $user['pk'],
                'username' => $username,
                'email' => $userData['email'] ?? null,
                'telephone' => $userData['telephone'] ?? null,
                'role' => $role
            ]);

            return $user;

        } catch (GuzzleException $e) {
            $responseBody = null;
            
            // Vérifier si l'exception a une réponse (uniquement pour les RequestException et ResponseException)
            if ($e instanceof RequestException && $e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
            }
            
            Log::error('❌ Erreur création utilisateur Authentik', [
                'error' => $e->getMessage(),
                'response' => $responseBody,
                'exception_class' => get_class($e)
            ]);
            
            // ⚠️ MODE LOCAL : Retourner null au lieu de lancer une exception
            // Cela permet au système de continuer sans Authentik
            Log::warning('⚠️  Authentik non disponible, retour null (mode local)', [
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }

    /**
     * Définir le mot de passe d'un utilisateur
     *
     * @param int $userId
     * @param string $password
     * @return bool
     */
    public function setUserPassword(int $userId, string $password): bool
    {
        try {
            $this->client->post("/api/v3/core/users/{$userId}/set_password/", [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken,
                    'Content-Type' => 'application/json'
                ],
                'json' => [
                    'password' => $password
                ]
            ]);

            Log::info('Mot de passe défini pour utilisateur Authentik', ['user_id' => $userId]);
            return true;

        } catch (GuzzleException $e) {
            $responseBody = null;
            if ($e instanceof RequestException && $e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
            }
            
            Log::error('Erreur définition mot de passe Authentik', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'response' => $responseBody,
                'exception_class' => get_class($e)
            ]);
            return false;
        }
    }

    /**
     * Authentifier un utilisateur via Authentik (méthode originale)
     * Accepte maintenant username (téléphone ou email) au lieu de seulement email
     *
     * @param string $username Email ou téléphone (username dans Authentik)
     * @param string $password
     * @return array|null
     */
    public function authenticateUser(string $username, string $password): ?array
    {
        try {
            // Authentik utilise OAuth2 Password Grant
            // Le username peut être soit l'email soit le téléphone (qui est le username principal)
            $response = $this->client->post('/application/o/token/', [
                'form_params' => [
                    'grant_type' => 'password',
                    'username' => $username, // Peut être email ou téléphone
                    'password' => $password,
                    'client_id' => config('services.authentik.client_id'),
                    'client_secret' => config('services.authentik.client_secret'),
                ],
                'headers' => [
                    'Content-Type' => 'application/x-www-form-urlencoded',
                    'Accept' => 'application/json',
                ]
            ]);

            $tokens = json_decode($response->getBody()->getContents(), true);

            // Récupérer les informations utilisateur avec le token
            $userInfo = $this->getUserInfo($tokens['access_token']);

            Log::info('Authentification réussie via Authentik', [
                'username' => $username
            ]);

            return [
                'tokens' => $tokens,
                'user' => $userInfo,
            ];

        } catch (GuzzleException $e) {
            Log::warning('Échec authentification Authentik', [
                'username' => $username,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }

    /**
     * 🚀 NOUVELLE MÉTHODE : Authentification directe via API Authentik
     * Contour Adventure du problème Password Grant
     * Accepte maintenant email OU téléphone comme identifiant
     *
     * @param string $identifier Email ou numéro de téléphone
     * @param string $password
     * @return array
     */
    public function authenticateUserDirect(string $identifier, string $password): array
    {
        try {
            Log::info('Tentative d\'authentification directe', ['identifier' => $identifier]);

            // Détecter si c'est un email ou un téléphone
            $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL) !== false;
            
            // 1. Chercher l'utilisateur dans la base de données locale
            $localUser = null;
            $authentikUsername = null;
            
            if ($isEmail) {
                // Chercher par email
                $localUser = \App\Models\Utilisateur::where('email', $identifier)->first();
                $authentikUsername = $identifier; // Pour Authentik, utiliser l'email
            } else {
                // Chercher par téléphone
                $localUser = \App\Models\Utilisateur::where('telephone', $identifier)->first();
                if ($localUser) {
                    // Pour Authentik, utiliser le téléphone comme username (car c'est le username principal)
                    $authentikUsername = $localUser->telephone;
                }
            }
            
            if ($localUser && \Illuminate\Support\Facades\Hash::check($password, $localUser->password)) {
                Log::info('Authentification locale réussie', [
                    'identifier' => $identifier,
                    'user_id' => $localUser->id
                ]);
                
                // Récupérer les données Authentik
                $authentikUser = null;
                if ($isEmail) {
                    $authentikUser = $this->getUserByEmailFromAuthentik($identifier);
                } else {
                    // Chercher par username (téléphone) dans Authentik
                    $authentikUser = $this->getUserByUsernameFromAuthentik($authentikUsername);
                }
                
                if ($authentikUser) {
                    // Générer des tokens avec les données Authentik
                    $tokens = $this->generateCustomTokens($authentikUser);
                    
                    return [
                        'success' => true,
                        'user' => $authentikUser,
                        'tokens' => $tokens
                    ];
                } else {
                    // Si pas dans Authentik, créer un utilisateur basique
                    $userData = [
                        'pk' => $localUser->id,
                        'email' => $localUser->email,
                        'username' => $localUser->telephone ?? $localUser->email,
                        'groups' => [],
                        'attributes' => []
                    ];
                    
                    $tokens = $this->generateCustomTokens($userData);
                    
                    return [
                        'success' => true,
                        'user' => $userData,
                        'tokens' => $tokens
                    ];
                }
            }

            // Si l'authentification locale échoue, essayer avec Authentik OAuth2
            try {
                // Pour OAuth2, utiliser le username (téléphone ou email)
                $oauthResult = $this->authenticateUser($authentikUsername ?? $identifier, $password);
                
                if ($oauthResult) {
                    Log::info('Authentification OAuth2 réussie', ['identifier' => $identifier]);
                    return [
                        'success' => true,
                        'user' => $oauthResult['user'],
                        'tokens' => $oauthResult['tokens']
                    ];
                }
            } catch (Exception $e) {
                Log::warning('Échec authentification OAuth2', [
                    'identifier' => $identifier,
                    'error' => $e->getMessage()
                ]);
            }

            return [
                'success' => false,
                'message' => 'Identifiants incorrects. Veuillez vérifier votre identifiant (email ou téléphone) et mot de passe.'
            ];

        } catch (Exception $e) {
            Log::error('Erreur authentification directe', [
                'identifier' => $identifier,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'authentification: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Obtenir un token d'API avec Client Credentials
     *
     * @return string|null
     */
    private function getApiAccessToken(): ?string
    {
        try {
            $response = $this->client->post('/application/o/token/', [
                'form_params' => [
                    'grant_type' => 'client_credentials',
                    'client_id' => config('services.authentik.client_id'),
                    'client_secret' => config('services.authentik.client_secret'),
                    'scope' => 'goauthentik.io/api'
                ],
                'headers' => [
                    'Content-Type' => 'application/x-www-form-urlencoded',
                    'Accept' => 'application/json',
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            
            if (isset($data['access_token'])) {
                Log::info('Token d\'API obtenu avec succès');
                return $data['access_token'];
            }

            return null;

        } catch (GuzzleException $e) {
            Log::error('Erreur obtention token API', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Récupérer un utilisateur par email avec token d'API
     *
     * @param string $email
     * @param string $apiToken
     * @return array|null
     */
    private function getUserByEmailWithToken(string $email, string $apiToken): ?array
    {
        try {
            // Utiliser le token API existant au lieu du Client Credentials
            $response = $this->client->get('/api/v3/core/users/', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken, // Utiliser le token API configuré
                    'Accept' => 'application/json'
                ],
                'query' => ['email' => $email]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            return $data['results'][0] ?? null;

        } catch (GuzzleException $e) {
            Log::error('Erreur recherche utilisateur avec token API', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Vérifier le mot de passe directement via l'API
     * 
     * ⚠️ ATTENTION : Authentik ne fournit pas d'endpoint pour vérifier un mot de passe
     * sans le changer. Cette méthode utilise une approche alternative.
     *
     * @param int $userId
     * @param string $password
     * @param string $apiToken
     * @return bool
     */
    private function verifyPasswordDirect(int $userId, string $password, string $apiToken): bool
    {
        try {
            // Méthode alternative : utiliser l'API Token pour vérifier le mot de passe
            // en tentant de définir le même mot de passe (si c'est le bon, ça ne changera rien)
            
            // D'abord, récupérer l'utilisateur pour vérifier qu'il existe
            $response = $this->client->get("/api/v3/core/users/{$userId}/", [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken,
                    'Accept' => 'application/json'
                ]
            ]);

            $user = json_decode($response->getBody()->getContents(), true);
            if (!$user || !$user['is_active']) {
                Log::warning('Utilisateur inactif ou non trouvé', ['user_id' => $userId]);
                return false;
            }

            // Maintenant, utiliser une méthode différente : vérifier via l'authentification
            // en créant un token temporaire avec les credentials
            try {
                // Essayer d'obtenir un token avec les credentials
                $tokenResponse = $this->client->post('/application/o/token/', [
                    'form_params' => [
                        'grant_type' => 'password',
                        'username' => $user['email'],
                        'password' => $password,
                        'client_id' => config('services.authentik.client_id'),
                        'client_secret' => config('services.authentik.client_secret'),
                    ],
                    'headers' => [
                        'Content-Type' => 'application/x-www-form-urlencoded',
                        'Accept' => 'application/json',
                    ]
                ]);

                // Si on arrive ici, le mot de passe était correct
                Log::info('Mot de passe vérifié avec succès via OAuth2', ['user_id' => $userId]);
                return true;

            } catch (GuzzleException $e) {
                // Si erreur OAuth2, essayer une méthode alternative
                Log::info('OAuth2 Password Grant non disponible, utilisation méthode alternative', [
                    'user_id' => $userId,
                    'error' => $e->getMessage()
                ]);

                // Méthode alternative : vérifier via l'API en utilisant une approche différente
                // On va utiliser l'endpoint de vérification de session ou similaire
                return $this->verifyPasswordAlternative($userId, $password, $apiToken);
            }

        } catch (GuzzleException $e) {
            Log::warning('Erreur lors de la vérification du mot de passe', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Méthode alternative pour vérifier le mot de passe
     * Utilise une vérification locale temporaire
     *
     * @param int $userId
     * @param string $password
     * @param string $apiToken
     * @return bool
     */
    private function verifyPasswordAlternative(int $userId, string $password, string $apiToken): bool
    {
        try {
            // Vérification locale temporaire
            // On va vérifier dans notre base de données locale
            $user = \App\Models\Utilisateur::where('email', $this->getUserEmailById($userId, $apiToken))->first();
            
            if (!$user) {
                Log::warning('Utilisateur non trouvé en local', ['user_id' => $userId]);
                return false;
            }

            // Vérifier le mot de passe avec Hash::check
            if (\Illuminate\Support\Facades\Hash::check($password, $user->password)) {
                Log::info('Mot de passe vérifié localement', ['user_id' => $userId]);
                return true;
            }

            Log::warning('Mot de passe incorrect (vérification locale)', ['user_id' => $userId]);
            return false;

        } catch (Exception $e) {
            Log::error('Erreur méthode alternative', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Récupérer l'email d'un utilisateur par son ID
     *
     * @param int $userId
     * @param string $apiToken
     * @return string|null
     */
    private function getUserEmailById(int $userId, string $apiToken): ?string
    {
        try {
            $response = $this->client->get("/api/v3/core/users/{$userId}/", [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken,
                    'Accept' => 'application/json'
                ]
            ]);

            $user = json_decode($response->getBody()->getContents(), true);
            return $user['email'] ?? null;

        } catch (GuzzleException $e) {
            Log::error('Erreur récupération email utilisateur', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Vérifier si un utilisateur existe dans Authentik par email
     *
     * @param string $email
     * @return bool
     */
    public function userExistsInAuthentik(string $email): bool
    {
        try {
            $response = $this->client->get('/api/v3/core/users/', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken,
                    'Accept' => 'application/json'
                ],
                'query' => ['email' => $email]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            return !empty($data['results']);

        } catch (GuzzleException $e) {
            Log::error('Erreur vérification existence utilisateur Authentik', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Récupérer un utilisateur par email depuis Authentik
     *
     * @param string $email
     * @return array|null
     */
    public function getUserByEmailFromAuthentik(string $email): ?array
    {
        try {
            $response = $this->client->get('/api/v3/core/users/', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken,
                    'Accept' => 'application/json'
                ],
                'query' => ['email' => $email]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            return $data['results'][0] ?? null;

        } catch (GuzzleException $e) {
            Log::error('Erreur récupération utilisateur Authentik par email', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Récupérer un utilisateur par username (téléphone) depuis Authentik
     *
     * @param string $username
     * @return array|null
     */
    public function getUserByUsernameFromAuthentik(string $username): ?array
    {
        try {
            $response = $this->client->get('/api/v3/core/users/', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken,
                    'Accept' => 'application/json'
                ],
                'query' => ['username' => $username]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            return $data['results'][0] ?? null;

        } catch (GuzzleException $e) {
            Log::error('Erreur récupération utilisateur Authentik par username', [
                'username' => $username,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Réinitialiser le mot de passe d'un utilisateur dans Authentik
     *
     * @param string $email
     * @param string $newPassword
     * @return bool
     */
    public function resetUserPasswordInAuthentik(string $email, string $newPassword): bool
    {
        try {
            // Récupérer l'utilisateur depuis Authentik
            $user = $this->getUserByEmailFromAuthentik($email);
            if (!$user) {
                Log::warning('Utilisateur non trouvé dans Authentik pour réinitialisation', [
                    'email' => $email
                ]);
                return false;
            }

            // Définir le nouveau mot de passe
            $response = $this->client->post("/api/v3/core/users/{$user['pk']}/set_password/", [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiToken,
                    'Content-Type' => 'application/json'
                ],
                'json' => [
                    'password' => $newPassword
                ]
            ]);

            Log::info('Mot de passe réinitialisé dans Authentik', [
                'email' => $email,
                'user_id' => $user['pk']
            ]);

            return true;

        } catch (GuzzleException $e) {
            Log::error('Erreur réinitialisation mot de passe Authentik', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Réinitialiser le mot de passe d'un utilisateur dans la base de données locale
     *
     * @param string $email
     * @param string $newPassword
     * @return bool
     */
    public function resetUserPasswordLocally(string $email, string $newPassword): bool
    {
        try {
            $user = \App\Models\Utilisateur::where('email', $email)->first();
            if (!$user) {
                Log::warning('Utilisateur non trouvé en local pour réinitialisation', [
                    'email' => $email
                ]);
                return false;
            }

            $user->password = \Illuminate\Support\Facades\Hash::make($newPassword);
            $user->save();

            Log::info('Mot de passe réinitialisé en local', [
                'email' => $email,
                'user_id' => $user->id
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Erreur réinitialisation mot de passe local', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Réinitialiser le mot de passe d'un utilisateur dans les deux systèmes
     *
     * @param string $email
     * @param string $newPassword
     * @return array
     */
    public function resetUserPassword(string $email, string $newPassword): array
    {
        $results = [
            'authentik' => false,
            'local' => false,
            'success' => false,
            'message' => ''
        ];

        try {
            // Réinitialiser dans Authentik
            $results['authentik'] = $this->resetUserPasswordInAuthentik($email, $newPassword);

            // Réinitialiser en local
            $results['local'] = $this->resetUserPasswordLocally($email, $newPassword);

            // Déterminer le succès global
            if ($results['authentik'] && $results['local']) {
                $results['success'] = true;
                $results['message'] = 'Mot de passe réinitialisé avec succès dans les deux systèmes.';
            } elseif ($results['authentik']) {
                $results['success'] = true;
                $results['message'] = 'Mot de passe réinitialisé dans Authentik uniquement.';
            } elseif ($results['local']) {
                $results['success'] = true;
                $results['message'] = 'Mot de passe réinitialisé en local uniquement.';
            } else {
                $results['message'] = 'Échec de la réinitialisation dans les deux systèmes.';
            }

            Log::info('Résultat réinitialisation mot de passe', [
                'email' => $email,
                'results' => $results
            ]);

            return $results;

        } catch (\Exception $e) {
            Log::error('Erreur globale réinitialisation mot de passe', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);

            $results['message'] = 'Erreur lors de la réinitialisation : ' . $e->getMessage();
            return $results;
        }
    }

    /**
     * Générer des tokens personnalisés
     *
     * @param array $user
     * @return array
     */
    private function generateCustomTokens(array $user): array
    {
        $accessToken = $this->createJWTToken($user);
        $refreshToken = $this->createRefreshToken($user);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => 86400, // 24 heures (en secondes)
            'token_type' => 'Bearer'
        ];
    }

    /**
     * Créer un token JWT personnalisé
     *
     * @param array $user
     * @return string
     */
    private function createJWTToken(array $user): string
    {
        $payload = [
            'user_id' => $user['pk'],
            'email' => $user['email'],
            'username' => $user['username'],
            'groups' => $user['groups'] ?? [],
            'attributes' => $user['attributes'] ?? [],
            'exp' => time() + 86400, // 24 heures (86400 secondes)
            'iat' => time(),
            'iss' => config('app.url'),
            'method' => 'direct_auth' // Marquer comme authentification directe
        ];

        // Encoder en base64 (simplifié - en production, utiliser une vraie librairie JWT)
        return base64_encode(json_encode($payload));
    }

    /**
     * Créer un refresh token
     *
     * @param array $user
     * @return string
     */
    private function createRefreshToken(array $user): string
    {
        // Récupérer l'utilisateur local pour avoir son ID local
        $localUser = \App\Models\Utilisateur::where('email', $user['email'])->first();
        
        $payload = [
            'user_id' => $localUser ? $localUser->id : $user['pk'], // ID local si disponible
            'email' => $user['email'], // Ajouter l'email pour faciliter la récupération
            'type' => 'refresh',
            'exp' => time() + (30 * 24 * 3600), // 30 jours
            'iat' => time(),
            'method' => 'direct_auth'
        ];

        return base64_encode(json_encode($payload));
    }

    /**
     * Récupérer les informations d'un utilisateur
     *
     * @param string $accessToken
     * @return array|null
     */
    public function getUserInfo(string $accessToken): ?array
    {
        try {
            $response = $this->client->get('/application/o/userinfo/', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                ]
            ]);

            return json_decode($response->getBody()->getContents(), true);

        } catch (GuzzleException $e) {
            Log::error('Erreur récupération infos utilisateur Authentik', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Rechercher un utilisateur par email
     *
     * @param string $email
     * @return array|null
     */
    public function findUserByEmail(string $email): ?array
    {
        try {
            $response = $this->client->get('/api/v3/core/users/', [
                'query' => [
                    'email' => $email,
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            
            if (isset($data['results']) && count($data['results']) > 0) {
                return $data['results'][0];
            }

            return null;

        } catch (GuzzleException $e) {
            Log::error('Erreur recherche utilisateur Authentik', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Vérifier si un utilisateur existe
     *
     * @param string $email
     * @return bool
     */
    public function userExists(string $email): bool
    {
        return $this->findUserByEmail($email) !== null;
    }

    /**
     * Supprimer un utilisateur
     *
     * @param int $userId
     * @return bool
     */
    public function deleteUser(int $userId): bool
    {
        try {
            $this->client->delete("/api/v3/core/users/{$userId}/");
            
            Log::info('Utilisateur supprimé d\'Authentik', ['user_id' => $userId]);
            return true;

        } catch (GuzzleException $e) {
            Log::error('Erreur suppression utilisateur Authentik', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Mettre à jour un utilisateur
     *
     * @param int $userId
     * @param array $userData
     * @return array|null
     */
    public function updateUser(int $userId, array $userData): ?array
    {
        try {
            $response = $this->client->patch("/api/v3/core/users/{$userId}/", [
                'json' => $userData
            ]);

            $user = json_decode($response->getBody()->getContents(), true);

            Log::info('Utilisateur mis à jour dans Authentik', ['user_id' => $userId]);
            return $user;

        } catch (GuzzleException $e) {
            Log::error('Erreur mise à jour utilisateur Authentik', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Mettre à jour les attributs d'un utilisateur par email
     *
     * @param string $email
     * @param array $attributes
     * @return bool
     */
    public function updateUserAttributes(string $email, array $attributes): bool
    {
        try {
            // Trouver l'utilisateur par email
            $user = $this->findUserByEmail($email);
            
            if (!$user) {
                Log::warning('Utilisateur non trouvé pour mise à jour des attributs', ['email' => $email]);
                return false;
            }

            // Préparer les données pour la mise à jour
            $updateData = [];
            
            // Mettre à jour le nom complet si nom ou prénom changent
            if (isset($attributes['nom']) || isset($attributes['prenom'])) {
                $nom = $attributes['nom'] ?? $user['attributes']['nom'][0] ?? '';
                $prenom = $attributes['prenom'] ?? $user['attributes']['prenom'][0] ?? '';
                $updateData['name'] = trim($prenom . ' ' . $nom);
            }

            // Mettre à jour les attributs
            if (!empty($attributes)) {
                $updateData['attributes'] = array_merge($user['attributes'] ?? [], [
                    'nom' => [$attributes['nom'] ?? $user['attributes']['nom'][0] ?? ''],
                    'prenom' => [$attributes['prenom'] ?? $user['attributes']['prenom'][0] ?? ''],
                    'contact' => [$attributes['contact'] ?? $user['attributes']['contact'][0] ?? ''],
                    'adresse' => [$attributes['adresse'] ?? $user['attributes']['adresse'][0] ?? ''],
                ]);
            }

            // Effectuer la mise à jour
            $result = $this->updateUser($user['pk'], $updateData);
            
            if ($result) {
                Log::info('Attributs utilisateur mis à jour dans Authentik', [
                    'user_id' => $user['pk'],
                    'email' => $email,
                    'updated_attributes' => array_keys($attributes)
                ]);
                return true;
            }

            return false;

        } catch (Exception $e) {
            Log::error('Erreur mise à jour attributs utilisateur Authentik', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Récupérer un groupe par son nom
     *
     * @param string $groupName
     * @return array|null
     */
    public function getGroupByName(string $groupName): ?array
    {
        try {
            $response = $this->client->get('/api/v3/core/groups/', [
                'query' => [
                    'name' => $groupName,
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            
            if (isset($data['results']) && count($data['results']) > 0) {
                return $data['results'][0];
            }

            return null;

        } catch (GuzzleException $e) {
            Log::error('Erreur recherche groupe Authentik', [
                'group_name' => $groupName,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Créer un groupe s'il n'existe pas
     *
     * @param string $groupName
     * @param array $attributes
     * @return array|null
     */
    public function createGroupIfNotExists(string $groupName, array $attributes = []): ?array
    {
        // Vérifier si le groupe existe
        $existingGroup = $this->getGroupByName($groupName);
        
        if ($existingGroup) {
            return $existingGroup;
        }

        // Créer le groupe
        try {
            $response = $this->client->post('/api/v3/core/groups/', [
                'json' => [
                    'name' => $groupName,
                    'attributes' => $attributes,
                    'is_superuser' => false,
                ]
            ]);

            $group = json_decode($response->getBody()->getContents(), true);
            
            Log::info('Groupe créé dans Authentik', [
                'group_name' => $groupName,
                'group_id' => $group['pk']
            ]);

            return $group;

        } catch (GuzzleException $e) {
            Log::error('Erreur création groupe Authentik', [
                'group_name' => $groupName,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Ajouter un utilisateur à un groupe selon son rôle
     * Les rôles et groupes sont gérés directement dans Authentik
     * Le système ne crée aucun groupe automatiquement
     *
     * @param int $userId
     * @param string $role
     * @return bool
     */
    public function addUserToRoleGroup(int $userId, string $role): bool
    {
        // Chercher le groupe correspondant au rôle dans Authentik
        $group = $this->getGroupByName($role);
        
        if (!$group) {
            Log::info('Groupe non trouvé dans Authentik pour le rôle', [
                'role' => $role,
                'user_id' => $userId,
                'message' => 'L\'utilisateur sera créé sans groupe. Assurez-vous que le groupe existe dans Authentik.'
            ]);
            // Les groupes sont gérés dans Authentik, on ne crée rien automatiquement
            return true;
        }

        // Récupérer la liste actuelle des utilisateurs du groupe
        try {
            $currentUsers = $group['users'] ?? [];
            
            // Vérifier si l'utilisateur est déjà dans le groupe
            if (in_array($userId, $currentUsers)) {
                Log::info('Utilisateur déjà dans le groupe', [
                    'user_id' => $userId,
                    'group' => $group['name'],
                    'role' => $role
                ]);
                return true;
            }

            // Ajouter l'utilisateur à la liste
            $currentUsers[] = $userId;

            // Mettre à jour le groupe avec la nouvelle liste d'utilisateurs
            $response = $this->client->patch("/api/v3/core/groups/{$group['pk']}/", [
                'json' => [
                    'users' => $currentUsers
                ]
            ]);

            Log::info('Utilisateur ajouté au groupe Authentik', [
                'user_id' => $userId,
                'group' => $group['name'],
                'role' => $role,
                'total_users' => count($currentUsers)
            ]);

            return true;

        } catch (GuzzleException $e) {
            $responseBody = null;
            if ($e instanceof RequestException && $e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
            }
            
            Log::error('Erreur ajout utilisateur au groupe Authentik', [
                'user_id' => $userId,
                'group' => $group['name'] ?? $role,
                'role' => $role,
                'error' => $e->getMessage(),
                'response' => $responseBody,
                'exception_class' => get_class($e)
            ]);
            return false;
        }
    }

    /**
     * Récupérer les groupes d'un utilisateur
     *
     * @param int $userId
     * @return array
     */
    public function getUserGroups(int $userId): array
    {
        try {
            $response = $this->client->get("/api/v3/core/users/{$userId}/");
            $user = json_decode($response->getBody()->getContents(), true);

            return $user['groups'] ?? [];

        } catch (GuzzleException $e) {
            Log::error('Erreur récupération groupes utilisateur', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }

    /**
     * Révoquer un token d'accès Authentik
     *
     * @param string $accessToken
     * @return bool
     */
    public function revokeToken(string $accessToken): bool
    {
        try {
            // Authentik endpoint pour révoquer un token
            $this->client->post('/application/o/revoke/', [
                'form_params' => [
                    'token' => $accessToken,
                    'client_id' => config('services.authentik.client_id'),
                    'client_secret' => config('services.authentik.client_secret'),
                ],
                'headers' => [
                    'Content-Type' => 'application/x-www-form-urlencoded',
                ]
            ]);

            Log::info('Token révoqué dans Authentik', [
                'token_preview' => substr($accessToken, 0, 20) . '...'
            ]);

            return true;

        } catch (GuzzleException $e) {
            $responseBody = null;
            if ($e instanceof RequestException && $e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
            }
            
            Log::error('Erreur révocation token Authentik', [
                'error' => $e->getMessage(),
                'response' => $responseBody,
                'exception_class' => get_class($e)
            ]);
            return false;
        }
    }

    /**
     * Déconnecter un utilisateur (logout)
     * Révoque le token d'accès et le refresh token
     *
     * @param string $accessToken
     * @param string|null $refreshToken
     * @return bool
     */
    public function logout(string $accessToken, ?string $refreshToken = null): bool
    {
        $success = true;

        // Révoquer le access token
        if (!$this->revokeToken($accessToken)) {
            $success = false;
        }

        // Révoquer le refresh token si fourni
        if ($refreshToken && !$this->revokeToken($refreshToken)) {
            $success = false;
        }

        if ($success) {
            Log::info('Déconnexion complète réussie', [
                'access_token_revoked' => true,
                'refresh_token_revoked' => !empty($refreshToken)
            ]);
        }

        return $success;
    }

    /**
     * Rafraîchir un token d'accès
     *
     * @param string $refreshToken
     * @return array|null
     */
    public function refreshAccessToken(string $refreshToken): ?array
    {
        try {
            Log::info('Tentative de rafraîchissement token', [
                'token_preview' => substr($refreshToken, 0, 20) . '...'
            ]);
            
            // D'abord, essayer de décoder le refresh token pour voir s'il s'agit d'un token personnalisé
            $decodedToken = json_decode(base64_decode($refreshToken), true);
            
            Log::info('Token décodé', [
                'decoded' => $decodedToken,
                'is_array' => is_array($decodedToken),
                'has_type' => isset($decodedToken['type']),
                'type_value' => $decodedToken['type'] ?? 'not_set'
            ]);
            
            if ($decodedToken && isset($decodedToken['type']) && $decodedToken['type'] === 'refresh') {
                // C'est un token personnalisé généré par notre système
                Log::info('Rafraîchissement token personnalisé détecté', [
                    'user_id' => $decodedToken['user_id'] ?? 'unknown',
                    'email' => $decodedToken['email'] ?? 'unknown'
                ]);
                
                // Vérifier l'expiration
                if (isset($decodedToken['exp']) && $decodedToken['exp'] < time()) {
                    Log::warning('Refresh token personnalisé expiré', [
                        'exp' => $decodedToken['exp'],
                        'current_time' => time()
                    ]);
                    return null;
                }
                
                // Récupérer l'utilisateur depuis la base de données locale
                $user = \App\Models\Utilisateur::where('email', $decodedToken['email'])->first();
                
                if (!$user) {
                    Log::warning('Utilisateur non trouvé pour refresh token personnalisé', [
                        'email' => $decodedToken['email']
                    ]);
                    return null;
                }
                
                // Générer de nouveaux tokens personnalisés
                $userData = [
                    'pk' => $user->id,
                    'email' => $user->email,
                    'username' => $user->email,
                    'groups' => [],
                    'attributes' => []
                ];
                
                $newTokens = $this->generateCustomTokens($userData);
                
                Log::info('Token personnalisé rafraîchi avec succès', [
                    'user_id' => $user->id
                ]);
                
                return $newTokens;
            }
            
            Log::info('Token non reconnu comme personnalisé, tentative avec Authentik');
            
            // Sinon, essayer avec Authentik (pour les vrais tokens Authentik)
            $response = $this->client->post('/application/o/token/', [
                'form_params' => [
                    'grant_type' => 'refresh_token',
                    'refresh_token' => $refreshToken,
                    'client_id' => config('services.authentik.client_id'),
                    'client_secret' => config('services.authentik.client_secret'),
                ],
                'headers' => [
                    'Content-Type' => 'application/x-www-form-urlencoded',
                ]
            ]);

            $tokens = json_decode($response->getBody()->getContents(), true);

            Log::info('Token Authentik rafraîchi avec succès');

            return $tokens;

        } catch (GuzzleException $e) {
            Log::error('Erreur rafraîchissement token', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Vérifier si une chaîne est un UUID
     *
     * @param string $value
     * @return bool
     */
    private function isUuid(string $value): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value) === 1;
    }

    /**
     * Récupérer les rôles attachés à un groupe
     *
     * @param string $groupName
     * @return array
     */
    public function getGroupRoles(string $groupName): array
    {
        try {
            // Récupérer le groupe par son nom
            $group = $this->getGroupByName($groupName);
            
            if (!$group) {
                Log::warning('Groupe non trouvé', ['group_name' => $groupName]);
                return [];
            }

            Log::info('Groupe trouvé, récupération des détails', [
                'group_name' => $groupName,
                'group_id' => $group['pk']
            ]);

            // Récupérer les détails complets du groupe
            $response = $this->client->get("/api/v3/core/groups/{$group['pk']}/");

            $groupDetails = json_decode($response->getBody()->getContents(), true);

            // Logger toute la structure pour debug
            Log::info('Structure complète du groupe', [
                'group_details' => $groupDetails
            ]);

            // Extraire les rôles depuis différents endroits possibles
            $roles = [];
            $roleIds = []; // Pour stocker les IDs temporairement
            
            // Méthode 1: Récupérer les IDs des rôles depuis différents endroits
            if (isset($groupDetails['attributes']) && is_array($groupDetails['attributes'])) {
                foreach ($groupDetails['attributes'] as $key => $value) {
                    if (stripos($key, 'role') !== false) {
                        if (is_array($value)) {
                            foreach ($value as $item) {
                                if ($this->isUuid($item)) {
                                    $roleIds[] = $item;
                                }
                            }
                        } else if ($this->isUuid($value)) {
                            $roleIds[] = $value;
                        }
                    }
                }
            }

            // Méthode 2: Utiliser roles_obj qui contient déjà les noms
            if (isset($groupDetails['roles_obj']) && is_array($groupDetails['roles_obj'])) {
                foreach ($groupDetails['roles_obj'] as $role) {
                    if (isset($role['name']) && !empty($role['name'])) {
                        $roles[] = $role['name'];
                    }
                }
            }

            // Méthode 3: Si roles_obj n'existe pas, convertir les IDs en noms
            if (empty($roles) && !empty($roleIds)) {
                foreach ($roleIds as $roleId) {
                    try {
                        $roleDetails = $this->client->get("/api/v3/core/roles/{$roleId}/");
                        $roleInfo = json_decode($roleDetails->getBody()->getContents(), true);
                        if (isset($roleInfo['name']) && !empty($roleInfo['name'])) {
                            $roles[] = $roleInfo['name'];
                        }
                    } catch (GuzzleException $e) {
                        Log::warning('Impossible de convertir le rôle ID en nom', [
                            'role_id' => $roleId,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }

            // Méthode 4: Vérifier les permissions
            if (empty($roles) && isset($groupDetails['permissions_obj'])) {
                foreach ($groupDetails['permissions_obj'] as $permission) {
                    if (isset($permission['name'])) {
                        $roles[] = $permission['name'];
                    }
                }
            }

            // Méthode 5: Vérifier le champ 'role' ou 'roles' directement
            if (isset($groupDetails['role'])) {
                $roles[] = $groupDetails['role'];
            }
            if (isset($groupDetails['roles']) && is_array($groupDetails['roles'])) {
                foreach ($groupDetails['roles'] as $role) {
                    if (is_string($role)) {
                        $roles[] = $role;
                    } elseif (is_array($role) && isset($role['name'])) {
                        $roles[] = $role['name'];
                    }
                }
            }

            // Supprimer les doublons et filtrer les UUID
            $roles = array_filter(array_unique($roles), function($role) {
                // Exclure les UUID et garder seulement les noms de rôles
                return !$this->isUuid($role) && !empty($role);
            });
            
            // Réindexer le tableau
            $roles = array_values($roles);

            Log::info('Rôles récupérés pour le groupe', [
                'group_name' => $groupName,
                'group_id' => $group['pk'],
                'roles_count' => count($roles),
                'roles' => $roles,
                'structure_keys' => array_keys($groupDetails)
            ]);

            return $roles;

        } catch (GuzzleException $e) {
            $responseBody = null;
            if ($e instanceof RequestException && $e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
            }
            
            Log::error('Erreur récupération rôles du groupe', [
                'group_name' => $groupName,
                'error' => $e->getMessage(),
                'response' => $responseBody
            ]);
            return [];
        }
    }

    /**
     * Récupérer toutes les informations d'un groupe avec ses utilisateurs et rôles
     *
     * @param string $groupName
     * @return array|null
     */
    public function getGroupDetails(string $groupName): ?array
    {
        try {
            // Récupérer le groupe par son nom
            $group = $this->getGroupByName($groupName);
            
            if (!$group) {
                Log::warning('Groupe non trouvé', ['group_name' => $groupName]);
                return null;
            }

            // Récupérer les détails complets du groupe
            $response = $this->client->get("/api/v3/core/groups/{$group['pk']}/");
            $groupDetails = json_decode($response->getBody()->getContents(), true);

            // Récupérer les utilisateurs du groupe
            $users = [];
            if (isset($groupDetails['users'])) {
                foreach ($groupDetails['users'] as $userId) {
                    try {
                        $userResponse = $this->client->get("/api/v3/core/users/{$userId}/");
                        $user = json_decode($userResponse->getBody()->getContents(), true);
                        $users[] = [
                            'id' => $user['pk'],
                            'email' => $user['email'],
                            'username' => $user['username'],
                            'name' => $user['name']
                        ];
                    } catch (GuzzleException $e) {
                        Log::warning('Erreur récupération utilisateur', [
                            'user_id' => $userId,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }

            // Récupérer les rôles
            $roles = $this->getGroupRoles($groupName);

            $result = [
                'group' => [
                    'id' => $groupDetails['pk'],
                    'name' => $groupDetails['name'],
                    'attributes' => $groupDetails['attributes'] ?? []
                ],
                'users' => $users,
                'users_count' => count($users),
                'roles' => $roles,
                'roles_count' => count($roles)
            ];

            Log::info('Détails du groupe récupérés', [
                'group_name' => $groupName,
                'users_count' => count($users),
                'roles_count' => count($roles)
            ]);

            return $result;

        } catch (GuzzleException $e) {
            $responseBody = null;
            if ($e instanceof RequestException && $e->hasResponse()) {
                $responseBody = $e->getResponse()->getBody()->getContents();
            }
            
            Log::error('Erreur récupération détails du groupe', [
                'group_name' => $groupName,
                'error' => $e->getMessage(),
                'response' => $responseBody
            ]);
            return null;
        }
    }
}

