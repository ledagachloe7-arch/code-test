<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthHelper;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use Dedoc\Scramble\Attributes\Endpoint;
use Dedoc\Scramble\Attributes\Group;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use App\Http\Requests\Auth\SendVerificationCodeRequest;
use App\Http\Requests\Auth\VerifyAccountRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Mail\PasswordResetMail;
use App\Models\Personne;
use App\Models\Utilisateur;
use App\Services\AuthentikService;
use App\Services\CaptchaService;
use App\Services\VerificationService;
use App\Notifications\AccountCreatedNotification;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use App\Mail\CreateAccountEmailService;
use App\Mail\ResetPasswordEmailService;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * @OA\Info(
 *     title="🚗 Auto-École API - Authentification Authentik",
 *     version="1.0.0",
 *     description="API complète pour la gestion de l'authentification avec Authentik comme IAM central. Cette API permet l'inscription, la connexion, la gestion des utilisateurs et des tokens avec un système de contournement du Password Grant Flow.",
 *     @OA\Contact(
 *         name="Support Auto-École API",
 *         email="support@auto-ecole-api.com",
 *         url="https://auto-ecole-api.com"
 *     ),
 *     @OA\License(
 *         name="MIT",
 *         url="https://opensource.org/licenses/MIT"
 *     )
 * )
 * 
 * @OA\Server(
 *     url="http://localhost:8000",
 *     description="Serveur de développement local"
 * )
 * 
 * @OA\Server(
 *     url="https://9c8r7bbvybn.preview.infomaniak.website",
 *     description="Serveur de production Infomaniak"
 * )
 * 
 * @OA\SecurityScheme(
 *     securityScheme="BearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Token d'accès JWT obtenu via l'authentification"
 * )
 * 
 * @OA\Tag(
 *     name="🔐 Authentification",
 *     description="Endpoints d'authentification avec Authentik"
 * )
 * 
 * @OA\Tag(
 *     name="🔄 Tokens",
 *     description="Gestion des tokens d'accès et de rafraîchissement"
 * )
 */
#[Group('Authentification', description: 'Inscription (telephone, email, password, nom, prenom, contact, adresse, role, centre_id ; captcha obligatoire pour ROLE_CANDIDAT), connexion, vérification de compte, mot de passe oublié / réinitialisation.')]
class AuthController extends Controller
{
    protected AuthentikService $authentikService;
    protected CaptchaService $captchaService;
    protected VerificationService $verificationService;

    public function __construct(
        AuthentikService $authentikService,
        CaptchaService $captchaService,
        VerificationService $verificationService
    ) {
        $this->authentikService = $authentikService;
        $this->captchaService = $captchaService;
        $this->verificationService = $verificationService;
    }

    /**
     * Génère une image captcha (base64) et son identifiant UUID. À utiliser avant l'inscription pour les candidats : l'utilisateur recopie le code dans captcha_code.
     *
     * @OA\Get(
     *     path="/api/auth/captcha",
     *     operationId="generateCaptcha",
     *     tags={"🔐 Authentification"},
     *     summary="Générer un captcha pour sécuriser la connexion",
     *     description="Retourne une image captcha (base64) et son identifiant. L'utilisateur doit recopier le code dans le champ prévu lors de la connexion.",
     *     @OA\Response(
     *         response=200,
     *         description="✅ Captcha généré",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="captcha_id", type="string", example="f1d3c7d2-3b44-4da0-b54f-6d1b6a7a2f2a"),
     *             @OA\Property(property="image", type="string", example="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...", description="Image captcha encodée en base64"),
     *             @OA\Property(property="expires_in", type="integer", example=180)
     *         )
     *     ),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    #[Endpoint(title: 'Générer un captcha', description: 'Génère une image captcha (base64) et son identifiant UUID. À utiliser avant l\'inscription pour les candidats : l\'utilisateur recopie le code dans captcha_code.')]
    #[ScrambleResponse(200, 'Captcha généré : success, captcha_id (UUID), image (base64), expires_in (secondes).')]
    #[ScrambleResponse(500, 'Erreur serveur lors de la génération du captcha.')]
    public function generateCaptcha(): JsonResponse
    {
        $captcha = $this->captchaService->generateCaptcha();

        return response()->json([
            'success' => true,
            'captcha_id' => $captcha['captcha_id'],
            'image' => $captcha['image'],
            'expires_in' => (int) config('captcha.ttl', 180),
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/auth/register",
     *     operationId="registerUser",
     *     tags={"🔐 Authentification"},
     *     summary="📝 Inscription d'un nouvel utilisateur",
     *     description="Crée un nouvel utilisateur dans Authentik (si disponible) et dans la base locale. Champs obligatoires : telephone, password, password_confirmation, nom, prenom, contact. Pour role = ROLE_CANDIDAT (ou non fourni), captcha_id et captcha_code sont obligatoires (obtenir l'image via GET /api/auth/captcha).",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"telephone","password","password_confirmation","nom","prenom","contact"},
     *             @OA\Property(property="telephone", type="string", example="0612345678", maxLength=20, description="Numéro de téléphone obligatoire et unique (max 20 caractères). Utilisé comme identifiant principal."),
     *             @OA\Property(property="email", type="string", format="email", example="jean.dupont@example.com", maxLength=255, nullable=true, description="Adresse email optionnelle, doit être unique si fournie."),
     *             @OA\Property(property="password", type="string", format="password", example="Password123!", minLength=8, description="Mot de passe (min 8 caractères). Doit être confirmé via password_confirmation."),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="Password123!", description="Confirmation du mot de passe (doit être identique à password)."),
     *             @OA\Property(property="nom", type="string", example="Dupont", maxLength=255, description="Nom de famille (obligatoire)."),
     *             @OA\Property(property="prenom", type="string", example="Jean", maxLength=255, description="Prénom (obligatoire)."),
     *             @OA\Property(property="contact", type="string", example="0612345678", maxLength=20, description="Numéro de contact (obligatoire, max 20 caractères)."),
     *             @OA\Property(property="adresse", type="string", example="123 Rue de la Paix, Paris", maxLength=500, nullable=true, description="Adresse postale (optionnelle, max 500 caractères)."),
     *             @OA\Property(property="role", type="string", enum={"ROLE_CANDIDAT","ROLE_RESPONSABLE_AUTO_ECOLE","ROLE_ADMIN"}, example="ROLE_CANDIDAT", maxLength=100, nullable=true, description="Rôle. Défaut : ROLE_CANDIDAT. Si ROLE_CANDIDAT ou non défini, captcha_id et captcha_code sont obligatoires."),
     *             @OA\Property(property="captcha_id", type="string", format="uuid", example="f1d3c7d2-3b44-4da0-b54f-6d1b6a7a2f2a", nullable=true, description="UUID du captcha (obligatoire si role = ROLE_CANDIDAT ou non défini). Obtenu via GET /api/auth/captcha."),
     *             @OA\Property(property="captcha_code", type="string", example="T8K4LM", maxLength=10, nullable=true, description="Code saisi par l'utilisateur (obligatoire si role = ROLE_CANDIDAT ou non défini, max 10 caractères)."),
     *             @OA\Property(property="centre_id", type="string", format="uuid", example="019a0e63-a1cd-7012-9586-57868bb66c6f", nullable=true, description="UUID du centre (référentiel) auquel l'utilisateur est rattaché. Optionnel ; utilisé pour les agents (restriction par centre).")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="✅ Inscription réussie",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Inscription réussie. Veuillez vérifier votre compte avec le code reçu.", description="Pour candidat : vérification requise ; pour autre rôle : compte activé automatiquement."),
     *             @OA\Property(property="requires_verification", type="boolean", example=true, description="True si l'utilisateur est candidat et doit vérifier son compte (email/SMS)."),
     *             @OA\Property(property="user", type="object",
     *                 @OA\Property(property="id", type="string", example="019a0e63-a1cd-7012-9586-57868bb66c6f"),
     *                 @OA\Property(property="telephone", type="string", example="0612345678"),
     *                 @OA\Property(property="email", type="string", example="jean.dupont@example.com", nullable=true),
     *                 @OA\Property(property="role", type="string", example="ROLE_CANDIDAT"),
     *                 @OA\Property(property="centre_id", type="string", format="uuid", example="019a0e63-a1cd-7012-9586-57868bb66c6f", nullable=true, description="UUID du centre (référentiel) si fourni à l'inscription."),
     *                 @OA\Property(property="created_at", type="string", format="date-time", example="2025-10-23T00:00:00+00:00"),
     *                 @OA\Property(property="personne", type="object",
     *                     @OA\Property(property="id", type="string", example="019a0e63-a1cd-7012-9586-57868bb66c6f"),
     *                     @OA\Property(property="nom", type="string", example="Dupont"),
     *                     @OA\Property(property="prenom", type="string", example="Jean"),
     *                     @OA\Property(property="nom_complet", type="string", example="Jean Dupont"),
     *                     @OA\Property(property="email", type="string", example="jean.dupont@example.com", nullable=true),
     *                     @OA\Property(property="contact", type="string", example="0612345678"),
     *                     @OA\Property(property="adresse", type="string", example="123 Rue de la Paix, Paris", nullable=true)
     *                 )
     *             ),
     *             @OA\Property(property="verification", type="object", description="Présent si requires_verification = true.",
     *                 @OA\Property(property="channels", type="array", @OA\Items(type="object",
     *                     @OA\Property(property="method", type="string", example="email"),
     *                     @OA\Property(property="sent", type="boolean", example=true),
     *                     @OA\Property(property="message", type="string", example="Code envoyé par email.")
     *                 )),
     *                 @OA\Property(property="message", type="string", example="Un code de vérification a été envoyé sur les canaux disponibles.")
     *             ),
     *             @OA\Property(property="auth_url", type="string", example="http://5.189.156.115:31015/application/o/authorize/?client_id=...", nullable=true, description="Présent uniquement si Authentik est disponible."),
     *             @OA\Property(property="authentik", type="object", nullable=true, description="Présent uniquement si Authentik est disponible.",
     *                 @OA\Property(property="user_id", type="integer", example=28),
     *                 @OA\Property(property="username", type="string", example="0612345678", description="Le téléphone est utilisé comme username dans Authentik.")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="❌ Erreur de validation",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Erreur de validation des données."),
     *             @OA\Property(property="errors", type="object", description="Détail des champs en erreur (clé = nom du champ, valeur = tableau de messages).")
     *         )
     *     ),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    #[Endpoint(title: 'Inscription', description: 'Crée un nouvel utilisateur dans Authentik (si disponible) et en base. Champs obligatoires : telephone, password, password_confirmation, nom, prenom, contact. Pour role = ROLE_CANDIDAT, captcha_id et captcha_code obligatoires (obtenir l\'image via GET /api/auth/captcha). Optionnels : email, adresse, role, centre_id.')]
    #[ScrambleResponse(201, 'Inscription réussie. Retourne user (id, telephone, email, role, centre_id, personne), requires_verification, verification (si candidat), auth_url et authentik si disponible.')]
    #[ScrambleResponse(422, 'Erreur de validation des données (champs requis : telephone, password, password_confirmation, nom, prenom, contact ; optionnels : email, adresse, role, centre_id ; captcha_id et captcha_code obligatoires si role = ROLE_CANDIDAT).', type: 'array{success: bool, message: string, errors: object}')]
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            Log::info('Tentative d\'inscription', [
                'telephone' => $request->telephone,
                'email' => $request->email,
                'role' => $request->role,
                'DEBUG_AUTHENTIK_URL' => config('services.authentik.base_url'),
                'DEBUG_ENV_URL' => env('AUTHENTIK_BASE_URL')
            ]);

            Log::info('🔍 [VERBOSE] Début de la tentative Authentik');
            
            // ===== TENTATIVE AUTHENTIK (OPTIONNEL EN LOCAL) =====
            $authentikUser = $this->authentikService->createUser([
                'telephone' => $request->telephone,
                'email' => $request->email,
                'password' => $request->password,
                'nom' => $request->nom,
                'prenom' => $request->prenom,
                'contact' => $request->contact,
                'adresse' => $request->adresse,
                'role' => $request->role ?? 'ROLE_CANDIDAT',
            ]);
            
            $authentikAvailable = ($authentikUser !== null);
            
            if ($authentikAvailable) {
                Log::info('✅ Utilisateur créé dans Authentik', [
                    'authentik_pk' => $authentikUser['pk']
                ]);
            } else {
                Log::warning('⚠️  Authentik non disponible, mode local uniquement');
            }
            
            Log::info('🔍 [VERBOSE] Après tentative Authentik', [
                'authentik_available' => $authentikAvailable,
                'authentik_user_exists' => $authentikUser !== null
            ]);

            // ===== CRÉATION EN BASE DE DONNÉES LOCALE (TOUJOURS) =====
            $userData = [
                'telephone' => $request->telephone,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role ?? 'ROLE_CANDIDAT',
            ];
            if ($request->filled('centre_id')) {
                $userData['centre_id'] = $request->centre_id;
            }
            $user = Utilisateur::create($userData);

            // Créer la personne associée
            Personne::create([
                'utilisateur_id' => $user->id,
                'nom' => $request->nom,
                'prenom' => $request->prenom,
                'email' => $request->email ?? null, // Email optionnel
                'contact' => $request->contact,
                'adresse' => $request->adresse,
            ]);

            DB::commit();

            // ===== ENVOI NOTIFICATION DE BIENVENUE (AVEC SMS) =====
            $user->notify(new AccountCreatedNotification($user, $request->password));

            // Vérifier si l'utilisateur est un candidat (seuls les candidats doivent vérifier leur compte)
            // Accepter 'ROLE_CANDIDAT' (Backend) ou 'candidat' (Frontend)
            $isCandidat = in_array($user->role, ['ROLE_CANDIDAT', 'candidat']);
            $verificationChannels = [];
            $verificationSent = false;

            if ($isCandidat) {
                // Pour les candidats : envoyer le code de vérification sur tous les canaux disponibles
                $code = $this->verificationService->generateVerificationCode();

            if (!empty($user->email)) {
                $sentEmail = $this->verificationService->sendVerificationCodeByEmail($user, $code);
                $verificationChannels[] = [
                    'method' => 'email',
                    'sent' => $sentEmail,
                    'message' => $sentEmail
                        ? 'Code envoyé par email.'
                        : 'Impossible d\'envoyer le code par email.'
                ];
            }

            if (!empty($user->telephone)) {
                $sentSms = $this->verificationService->sendVerificationCodeBySms($user, $code);
                $verificationChannels[] = [
                    'method' => 'sms',
                    'sent' => $sentSms,
                    'message' => $sentSms
                        ? 'Code envoyé par SMS.'
                        : 'L\'envoi par SMS n\'est pas encore disponible. Le code est enregistré pour vérification.'
                ];
            }

            $verificationSent = collect($verificationChannels)->contains(function ($channel) {
                return $channel['sent'] === true;
            });
            } else {
                // Pour les autres rôles : activer automatiquement le compte
                $user->verified_at = now();
                $user->save();

                Log::info('Compte activé automatiquement (non-candidat)', [
                    'user_id' => $user->id,
                    'role' => $user->role
                ]);
            }

            // ===== URL AUTHENTIK (SI DISPONIBLE) =====
            $authUrl = null;
            if ($authentikAvailable) {
                try {
                    $authUrl = Socialite::driver('authentik')
                        ->stateless()
                        ->redirect()
                        ->getTargetUrl();
                } catch (Exception $e) {
                    Log::warning('Impossible de générer l\'URL Authentik', [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Recharger l'utilisateur avec ses relations
            $user->load('personne');

            Log::info('✅ Inscription réussie', [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'email' => $user->email,
                'role' => $user->role,
                'authentik_available' => $authentikAvailable,
                'authentik_pk' => $authentikUser['pk'] ?? null,
                'verification_channels' => $verificationChannels,
                'mode' => $authentikAvailable ? 'AUTHENTIK+LOCAL' : 'LOCAL_ONLY'
            ]);

            // envoi notification de bienvenue par email
            if ($user->email) {
                $data = [
                    'name' => $request->nom,
                    'email' => $user->email,
                    'titre' => 'Inscription Auto Ecole',
                    'message' => 'Votre compte a été créé avec succès. Vous pouvez dès maintenant accéder à votre espace personnel pour gérer votre dossier de permis de conduire.'
                ];
                Mail::to($data['email'])->queue(new CreateAccountEmailService($data));
            }

            // ===== RÉPONSE ADAPTÉE =====
            $response = [
                'success' => true,
                'message' => $isCandidat 
                    ? 'Inscription réussie. Veuillez vérifier votre compte avec le code reçu.'
                    : 'Inscription réussie. Votre compte a été activé automatiquement.',
                'requires_verification' => $isCandidat,
                'user' => [
                    'id' => $user->id,
                    'telephone' => $user->telephone,
                    'email' => $user->email,
                    'role' => $user->role,
                    'centre_id' => $user->centre_id,
                    'created_at' => $user->created_at->toIso8601String(),
                    'personne' => [
                        'id' => $user->personne->id,
                        'nom' => $user->personne->nom,
                        'prenom' => $user->personne->prenom,
                        'nom_complet' => $user->personne->prenom . ' ' . $user->personne->nom,
                        'email' => $user->personne->email,
                        'contact' => $user->personne->contact,
                        'adresse' => $user->personne->adresse,
                    ]
                ],
                'verification' => [
                    'channels' => $verificationChannels,
                    'message' => $verificationSent
                        ? 'Un code de vérification a été envoyé sur les canaux disponibles.'
                        : 'Aucun code n\'a pu être envoyé. Veuillez contacter l\'administrateur.'
                ]
            ];
            
            // Ajouter les infos Authentik seulement si disponible
            if ($authentikAvailable && $authUrl) {
                $response['auth_url'] = $authUrl;
                $response['authentik'] = [
                    'user_id' => $authentikUser['pk'],
                    'username' => $authentikUser['username'],
                ];
            }

            return response()->json($response, 201);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('❌ Erreur lors de l\'inscription', [
                'telephone' => $request->telephone,
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'inscription.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue lors de la création du compte.'
            ], 500);
        }
    }

    /**
     * Connexion directe par email ou téléphone + mot de passe. Retourne access_token et refresh_token (JWT). Aucun captcha requis.
     *
     * @OA\Post(
     *     path="/api/auth/login-direct",
     *     operationId="loginDirect",
     *     tags={"🔐 Authentification"},
     *     summary="🚀 Connexion directe (Contournement Password Grant)",
     *     description="Authentifie un utilisateur directement via l'API Authentik en contournant le problème du Password Grant Flow. Cette méthode utilise l'API Authentik directement pour vérifier les identifiants et génère des tokens personnalisés. L'utilisateur peut se connecter avec son email OU son numéro de téléphone. Aucun captcha n'est requis pour la connexion.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"identifier","password"},
     *             @OA\Property(property="identifier", type="string", example="0612345678", description="Email (ex: jean.dupont@example.com) ou numéro de téléphone (ex: 0612345678) - l'un ou l'autre est accepté"),
     *             @OA\Property(property="password", type="string", format="password", example="Password123!")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Connexion réussie",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Connexion réussie !"),
     *             @OA\Property(property="user", type="object",
     *                 @OA\Property(property="id", type="string", example="019a0e34-d153-7330-8cb6-80b14fd8811c"),
     *                 @OA\Property(property="telephone", type="string", example="0612345678"),
     *                 @OA\Property(property="email", type="string", example="jean.dupont@example.com", nullable=true),
     *                 @OA\Property(property="role", type="string", example="candidat"),
     *                 @OA\Property(property="created_at", type="string", format="date-time", example="2025-10-23T00:00:00+00:00"),
     *                 @OA\Property(property="personne", type="object",
     *                     @OA\Property(property="id", type="string", example="019a0e34-d153-7330-8cb6-80b14fd8811c"),
     *                     @OA\Property(property="nom", type="string", example="Dupont"),
     *                     @OA\Property(property="prenom", type="string", example="Jean"),
     *                     @OA\Property(property="nom_complet", type="string", example="Jean Dupont"),
     *                     @OA\Property(property="email", type="string", example="jean.dupont@example.com"),
     *                     @OA\Property(property="contact", type="string", example="0612345678"),
     *                     @OA\Property(property="adresse", type="string", example="123 Rue de la Paix, Paris")
     *                 )
     *             ),
     *             @OA\Property(property="access_token", type="string", example="eyJ1c2VyX2lkIjoyOCwiZW1haWwiOi..."),
     *             @OA\Property(property="refresh_token", type="string", example="eyJ1c2VyX2lkIjoyOCwidHlwZSI6In..."),
     *             @OA\Property(property="token_type", type="string", example="Bearer"),
     *             @OA\Property(property="expires_in", type="integer", example=86400),
     *             @OA\Property(property="method", type="string", example="direct_auth"),
     *             @OA\Property(property="authentik", type="object",
     *                 @OA\Property(property="user_id", type="integer", example=28),
     *                 @OA\Property(property="username", type="string", example="0612345678", description="Le téléphone est utilisé comme username principal dans Authentik")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="❌ Identifiants incorrects",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Identifiants incorrects. Veuillez vérifier votre identifiant (email ou téléphone) et mot de passe.")
     *         )
     *     ),
     *     @OA\Response(response=422, description="❌ Erreur de validation"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    #[Endpoint(title: 'Connexion directe', description: 'Connexion par email ou téléphone + mot de passe. Retourne access_token et refresh_token (JWT). Aucun captcha requis.')]
    #[ScrambleResponse(200, 'Connexion réussie : success, message, user (id, telephone, email, role, personne), access_token, refresh_token, token_type, expires_in, authentik.')]
    #[ScrambleResponse(401, 'Identifiants incorrects (identifier ou mot de passe invalide).')]
    #[ScrambleResponse(422, 'Erreur de validation (identifier et password requis).')]
    #[ScrambleResponse(500, 'Erreur serveur lors de l\'authentification.')]
    public function loginDirect(LoginRequest $request): JsonResponse
    {
        try {
            $identifier = trim((string) $request->identifier);

            Log::info('Tentative de connexion locale', [
                'identifier' => $identifier,
                'ip' => $request->ip(),
            ]);

            $query = Utilisateur::query();

            if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
                $query->whereRaw('LOWER(email) = ?', [mb_strtolower($identifier)]);
            } else {
                $query->where('telephone', $identifier);
            }

            $user = $query->first();

            if (!$user || !Hash::check((string) $request->password, (string) $user->password)) {
                Log::warning('Échec de connexion locale', ['identifier' => $identifier]);

                return response()->json([
                    'success' => false,
                    'message' => 'Identifiants incorrects. Veuillez vérifier votre identifiant (email ou téléphone) et mot de passe.',
                ], 401);
            }

            $user->load('personne');

            $accessToken = $user->createToken('access-token', ['access'], now()->addHour());
            $refreshToken = $user->createToken('refresh-token', ['refresh'], now()->addDays(30));
            $personne = $user->personne;

            Log::info('Connexion locale réussie', [
                'user_id' => $user->id,
                'method' => 'local_auth',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Connexion réussie !',
                'user' => [
                    'id' => $user->id,
                    'telephone' => $user->telephone,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at?->toIso8601String(),
                    'personne' => $personne ? [
                        'id' => $personne->id,
                        'nom' => $personne->nom,
                        'prenom' => $personne->prenom,
                        'nom_complet' => trim(($personne->prenom ?? '') . ' ' . ($personne->nom ?? '')),
                        'email' => $personne->email,
                        'contact' => $personne->contact,
                        'adresse' => $personne->adresse,
                    ] : null,
                ],
                'access_token' => $accessToken->plainTextToken,
                'refresh_token' => $refreshToken->plainTextToken,
                'token_type' => 'Bearer',
                'expires_in' => 3600,
                'method' => 'local_auth',
                'authentik' => null,
            ]);
        } catch (Exception $e) {
            Log::error('Erreur lors de la connexion locale', [
                'identifier' => $request->identifier,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la connexion.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue.',
            ], 500);
        }
    }

    /**
     * Demande de réinitialisation de mot de passe. Envoie un code par email ; l'utilisateur utilise ce code avec POST /api/auth/reset-password.
     *
     * @OA\Post(
     *     path="/api/auth/forgot-password",
     *     operationId="forgotPassword",
     *     tags={"🔐 Authentification"},
     *     summary="📧 Demande de réinitialisation de mot de passe",
     *     description="Envoie un code de réinitialisation par email à l'utilisateur qui a oublié son mot de passe.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email"},
     *             @OA\Property(property="email", type="string", format="email", example="jean.dupont@example.com")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Code de réinitialisation envoyé",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Un code de réinitialisation a été envoyé à votre adresse email."),
     *             @OA\Property(property="reset_url", type="string", example="http://localhost:3000/reset-password")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="❌ Erreur de validation",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Cette adresse email n'existe pas dans notre système."),
     *             @OA\Property(property="errors", type="object")
     *         )
     *     ),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    #[Endpoint(title: 'Mot de passe oublié', description: 'Demande de réinitialisation. Envoie un code par email ; utiliser ce code avec POST /api/auth/reset-password.')]
    #[ScrambleResponse(200, 'Code envoyé par email : success, message, reset_url, expires_in (minutes).')]
    #[ScrambleResponse(422, 'Email inexistant dans le système.')]
    #[ScrambleResponse(500, 'Erreur lors de l\'envoi du code.')]
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $email = $request->validated()['email'];
          
            Log::info('Demande de réinitialisation de mot de passe', [
                'email' => $email,
                'ip' => $request->ip()
            ]);

            // Vérifier que l'utilisateur existe dans Authentik
            if (!$this->authentikService->userExistsInAuthentik($email)) {
                Log::warning('Tentative de réinitialisation pour utilisateur inexistant dans Authentik', [
                    'email' => $email
                ]);



                return response()->json([
                    'success' => false,
                    'message' => 'Cette adresse email n\'existe pas dans notre système.'
                ], 422);
            }

            // Créer le code de réinitialisation
            $passwordReset = \App\Models\PasswordReset::createReset($email);

            // Envoyer l'email avec le code
            // $this->sendPasswordResetEmail($email, $passwordReset->code);

            $data = [
                 
                'email' => $email,
                'titre' => 'Réinitialiser mot de passe',
                'message' => 'Veuillez saisir ce code pour réinitialiser votre mot de passe :',
                'code' => $passwordReset->code,
                'time' => '15 minutes'
            ];
           
            // Envoyer l'email avec le code
            Mail::to($data['email'])->queue(new ResetPasswordEmailService($data));

            Log::info('Code de réinitialisation créé et envoyé', [
                'email' => $email,
                'code' => $passwordReset->code,
                'expires_at' => $passwordReset->expires_at
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Un code de réinitialisation a été envoyé à votre adresse email.',
                'reset_url' => config('app.frontend_url') . '/reset-password',
                'expires_in' => 15 // minutes
            ]);

        } catch (Exception $e) {
            Log::error('Erreur lors de la demande de réinitialisation', [
                'email' => $request->email ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi du code de réinitialisation.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue.'
            ], 500);
        }
    }

    /**
     * Réinitialise le mot de passe avec le code reçu par email (après forgot-password). Body : email, code, password, password_confirmation.
     *
     * @OA\Post(
     *     path="/api/auth/reset-password",
     *     operationId="resetPassword",
     *     tags={"🔐 Authentification"},
     *     summary="🔄 Réinitialisation de mot de passe",
     *     description="Réinitialise le mot de passe de l'utilisateur avec le code reçu par email.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email","code","password","password_confirmation"},
     *             @OA\Property(property="email", type="string", format="email", example="jean.dupont@example.com"),
     *             @OA\Property(property="code", type="string", example="123456"),
     *             @OA\Property(property="password", type="string", format="password", example="NewPassword123!"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="NewPassword123!")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Mot de passe réinitialisé avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Votre mot de passe a été réinitialisé avec succès."),
     *             @OA\Property(property="login_url", type="string", example="http://localhost:3000/login")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="❌ Erreur de validation ou code invalide",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Le code de réinitialisation est invalide ou a expiré."),
     *             @OA\Property(property="errors", type="object")
     *         )
     *     ),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    #[Endpoint(title: 'Réinitialiser le mot de passe', description: 'Réinitialise le mot de passe avec le code reçu par email (après forgot-password). Body : email, code, password, password_confirmation.')]
    #[ScrambleResponse(200, 'Mot de passe réinitialisé : success, message, login_url.')]
    #[ScrambleResponse(422, 'Code invalide ou expiré, ou erreur de validation.')]
    #[ScrambleResponse(500, 'Erreur serveur.')]
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();
            $email = $data['email'];
            $code = $data['code'];
            $newPassword = $data['password'];

            Log::info('Tentative de réinitialisation de mot de passe', [
                'email' => $email,
                'ip' => $request->ip()
            ]);

            // Vérifier que le code est valide
            if (!\App\Models\PasswordReset::isValidCode($email, $code)) {
                Log::warning('Tentative de réinitialisation avec code invalide', [
                    'email' => $email,
                    'code' => $code
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Le code de réinitialisation est invalide ou a expiré.'
                ], 422);
            }

            // Réinitialiser le mot de passe dans les deux systèmes
            $result = $this->authentikService->resetUserPassword($email, $newPassword);

            if ($result['success']) {
                // Marquer le code comme utilisé
                \App\Models\PasswordReset::markAsUsed($email, $code);

                Log::info('Mot de passe réinitialisé avec succès', [
                    'email' => $email,
                    'authentik_success' => $result['authentik'],
                    'local_success' => $result['local']
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Votre mot de passe a été réinitialisé avec succès.',
                    'login_url' => config('app.frontend_url') . '/login',
                    'details' => $result
                ]);
            } else {
                Log::error('Échec de la réinitialisation', [
                    'email' => $email,
                    'result' => $result
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 500);
            }

        } catch (Exception $e) {
            Log::error('Erreur lors de la réinitialisation', [
                'email' => $request->email ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la réinitialisation du mot de passe.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue.'
            ], 500);
        }
    }

    /**
     * Envoyer l'email de réinitialisation de mot de passe
     *
     * @param string $email
     * @param string $code
     * @return void
     */
    private function sendPasswordResetEmail(string $email, string $code): void
    {
        try {
            // Envoyer l'email avec Laravel Mail
            Mail::to($email)->queue(new PasswordResetMail($code));

            Log::info('📧 EMAIL DE RÉINITIALISATION ENVOYÉ', [
                'to' => $email,
                'code' => $code,
                'reset_url' => config('app.frontend_url') . '/reset-password'
            ]);

        } catch (Exception $e) {
            Log::error('Erreur envoi email réinitialisation', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);

            // En cas d'erreur d'envoi, on log quand même le code pour le développement
            Log::info('📧 CODE DE RÉINITIALISATION (envoi email échoué)', [
                'to' => $email,
                'code' => $code,
                'message' => "Votre code de réinitialisation est : {$code}. Ce code expire dans 15 minutes."
            ]);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/auth/auth-url",
     *     operationId="getAuthUrl",
     *     tags={"🔐 Authentification"},
     *     summary="🔗 Obtenir l'URL d'authentification",
     *     description="Génère l'URL d'authentification pour l'Authorization Code Flow avec Authentik. Cette URL doit être utilisée pour rediriger l'utilisateur vers Authentik pour s'authentifier.",
     *     @OA\Response(
     *         response=200,
     *         description="✅ URL d'authentification générée",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="auth_url", type="string", example="http://5.189.156.115:31015/application/o/authorize/?client_id=..."),
     *             @OA\Property(property="message", type="string", example="Redirigez l'utilisateur vers cette URL pour s'authentifier.")
     *         )
     *     ),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function getAuthUrl(): JsonResponse
    {
        try {
            $authUrl = Socialite::driver('authentik')
                ->stateless()
                ->redirect()
                ->getTargetUrl();

            return response()->json([
                'success' => true,
                'auth_url' => $authUrl,
                'message' => 'Redirigez l\'utilisateur vers cette URL pour s\'authentifier.'
            ]);
        } catch (Exception $e) {
            Log::error('Erreur génération URL Authentik', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de l\'URL d\'authentification.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue.'
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/auth/authentik/redirect",
     *     operationId="redirectToAuthentik",
     *     tags={"🔐 Authentification"},
     *     summary="🔄 Redirection vers Authentik",
     *     description="Redirige l'utilisateur vers Authentik pour l'authentification OAuth.",
     *     @OA\Response(
     *         response=302,
     *         description="🔄 Redirection vers Authentik"
     *     ),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function redirectToAuthentik()
    {
        try {
            Log::info('Redirection vers Authentik pour authentification');
            return Socialite::driver('authentik')->stateless()->redirect();
        } catch (Exception $e) {
            Log::error('Erreur lors de la redirection vers Authentik', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la redirection vers Authentik.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue.'
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/auth/authentik/callback",
     *     operationId="handleAuthentikCallback",
     *     tags={"🔐 Authentification"},
     *     summary="📞 Callback d'authentification Authentik",
     *     description="Gère le callback d'authentification après que l'utilisateur s'est connecté sur Authentik.",
     *     @OA\Parameter(
     *         name="code",
     *         in="query",
     *         description="Code d'autorisation fourni par Authentik",
     *         required=true,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Authentification réussie",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Authentification réussie."),
     *             @OA\Property(property="user", type="object"),
     *             @OA\Property(property="access_token", type="string"),
     *             @OA\Property(property="token_type", type="string", example="Bearer")
     *         )
     *     ),
     *     @OA\Response(response=400, description="❌ Erreur de callback"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function handleAuthentikCallback(): JsonResponse
    {
        try {
             $identifier = trim($request->input('identifier'));
        $password = $request->input('password');

        Log::info('Tentative de connexion locale', [
            'identifier' => $identifier,
            'ip' => $request->ip(),
        ]);

        // Rechercher le compte par email ou téléphone.
        $user = Utilisateur::query()
            ->where('email', $identifier)
            ->orWhere('telephone', $identifier)
            ->first();

        // Ne pas révéler si le compte existe.
        if (!$user || !Hash::check($password, $user->password)) {
            Log::warning('Échec de connexion locale', [
                'identifier' => $identifier,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Identifiants incorrects.',
            ], 401);
        }

        // Charger la relation de la personne.
        $user->loadMissing('personne');

        // Générer un jeton d'accès et un jeton de renouvellement Sanctum.
        $accessToken = $user->createToken(
            'access-token',
            ['access'],
            now()->addHour()
        );

        $refreshToken = $user->createToken(
            'refresh-token',
            ['refresh'],
            now()->addDays(30)
        );

        $personne = $user->personne;

        Log::info('Connexion locale réussie', [
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie !',
            'user' => [
                'id' => $user->id,
                'telephone' => $user->telephone,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at?->toIso8601String(),
                'personne' => $personne ? [
                    'id' => $personne->id,
                    'nom' => $personne->nom,
                    'prenom' => $personne->prenom,
                    'nom_complet' => trim(
                        ($personne->prenom ?? '') . ' ' .
                        ($personne->nom ?? '')
                    ),
                    'email' => $personne->email,
                    'contact' => $personne->contact,
                    'adresse' => $personne->adresse,
                ] : null,
            ],
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => 3600,
            'method' => 'local_auth',
            'authentik' => null,
        ]);
    } catch (\Throwable $e) {
        Log::error('Erreur lors de la connexion locale', [
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la connexion.',
            'error' => config('app.debug')
                ? $e->getMessage()
                : 'Une erreur est survenue.',
        ], 500);
        }
    }


    /**
     * @OA\Post(
     *     path="/api/auth/logout",
     *     operationId="logoutUser",
     *     tags={"🔄 Tokens"},
     *     summary="🚪 Déconnexion de l'utilisateur",
     *     description="Déconnecte l'utilisateur en révoquant ses tokens d'accès et de rafraîchissement dans Authentik.",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         @OA\JsonContent(
     *             @OA\Property(property="refresh_token", type="string", example="eyJ1c2VyX2lkIjoyOCwidHlwZSI6In...")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Déconnexion réussie",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Déconnexion réussie. À bientôt !")
     *         )
     *     ),
     *     @OA\Response(response=401, description="❌ Token manquant"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
   
public function logout(Request $request): JsonResponse
{
    try {
        $plainTextToken = $request->bearerToken();

        if (!$plainTextToken) {
            return response()->json([
                'success' => false,
                'message' => "Token d'authentification manquant.",
            ], 401);
        }

        // Rechercher le jeton d'accès dans la base Sanctum.
        $accessToken = PersonalAccessToken::findToken($plainTextToken);

        if (!$accessToken || !$accessToken->can('access')) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide ou non autorisé.',
            ], 401);
        }

        $user = $accessToken->tokenable;

        if (!$user instanceof Utilisateur) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé.',
            ], 401);
        }

        // Vérifier l'expiration du jeton d'accès.
        if (
            ($accessToken->expires_at !== null &&
                $accessToken->expires_at->isPast()) ||
            (config('sanctum.expiration') &&
                $accessToken->created_at &&
                $accessToken->created_at->lte(
                    now()->subMinutes(config('sanctum.expiration'))
                ))
        ) {
            $accessToken->delete();

            return response()->json([
                'success' => false,
                'message' => 'Token expiré. Veuillez vous reconnecter.',
            ], 401);
        }

        // Révoquer le jeton d'accès.
        $accessToken->delete();

        // Révoquer également le refresh token fourni,
        // uniquement s'il appartient au même utilisateur.
        $refreshTokenValue = $request->input('refresh_token');

        if (is_string($refreshTokenValue) && $refreshTokenValue !== '') {
            $refreshToken = PersonalAccessToken::findToken(
                $refreshTokenValue
            );

            if (
                $refreshToken &&
                $refreshToken->tokenable instanceof Utilisateur &&
                (string) $refreshToken->tokenable->getKey() ===
                    (string) $user->getKey() &&
                $refreshToken->can('refresh')
            ) {
                $refreshToken->delete();
            }
        }

        Log::info('Déconnexion locale réussie', [
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie. À bientôt !',
        ]);
    } catch (\Throwable $e) {
        Log::error('Erreur lors de la déconnexion locale', [
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la déconnexion.',
            'error' => config('app.debug')
                ? $e->getMessage()
                : 'Une erreur est survenue.',
        ], 500);
    }
}


    /**
     * @OA\Post(
     *     path="/api/auth/refresh",
     *     operationId="refreshToken",
     *     tags={"🔄 Tokens"},
     *     summary="🔄 Rafraîchir le token d'accès",
     *     description="Renouvelle le token d'accès en utilisant le token de rafraîchissement.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"refresh_token"},
     *             @OA\Property(property="refresh_token", type="string", example="eyJ1c2VyX2lkIjoyOCwidHlwZSI6In...")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Token rafraîchi avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Token rafraîchi avec succès."),
     *             @OA\Property(property="access_token", type="string"),
     *             @OA\Property(property="refresh_token", type="string"),
     *             @OA\Property(property="token_type", type="string", example="Bearer"),
     *             @OA\Property(property="expires_in", type="integer", example=3600)
     *         )
     *     ),
     *     @OA\Response(response=400, description="❌ Refresh token manquant"),
     *     @OA\Response(response=401, description="❌ Refresh token invalide"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function refreshToken(Request $request): JsonResponse
    {
        $request->validate([
            'refresh_token' => ['required', 'string'],
        ]);

        try {
            $plainRefreshToken = (string) $request->input('refresh_token');
            $storedRefreshToken = \Laravel\Sanctum\PersonalAccessToken::findToken($plainRefreshToken);

            if (
                !$storedRefreshToken ||
                !$storedRefreshToken->can('refresh') ||
                ($storedRefreshToken->expires_at && $storedRefreshToken->expires_at->isPast())
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Jeton de renouvellement invalide ou expiré. Veuillez vous reconnecter.',
                ], 401);
            }

            $user = $storedRefreshToken->tokenable;
            if (!$user instanceof Utilisateur) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé.',
                ], 401);
            }

            // Rotation du refresh token : l'ancien ne peut plus être réutilisé.
            $storedRefreshToken->delete();

            $accessToken = $user->createToken('access-token', ['access'], now()->addHour());
            $newRefreshToken = $user->createToken('refresh-token', ['refresh'], now()->addDays(30));

            return response()->json([
                'success' => true,
                'message' => 'Token rafraîchi avec succès.',
                'access_token' => $accessToken->plainTextToken,
                'refresh_token' => $newRefreshToken->plainTextToken,
                'token_type' => 'Bearer',
                'expires_in' => 3600,
            ]);
        } catch (Exception $e) {
            Log::error('Erreur de renouvellement du token local', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du renouvellement du token.',
                'error' => config('app.debug') ? $e->getMessage() : 'Une erreur est survenue.',
            ], 500);
        }
    }

    private function synchronizeUserFromAuthentik(array $authentikUser): Utilisateur
    {
        // Chercher par username (téléphone) d'abord, puis par email si disponible
        $user = null;
        $telephone = $authentikUser['username'] ?? $authentikUser['attributes']['telephone'][0] ?? null;
        $email = $authentikUser['email'] ?? null;

        if ($telephone) {
            $user = Utilisateur::where('telephone', $telephone)->first();
        }
        
        if (!$user && $email) {
            $user = Utilisateur::where('email', $email)->first();
        }

        if (!$user) {
            $user = Utilisateur::create([
                'telephone' => $telephone ?? throw new Exception('Le téléphone est obligatoire pour créer un utilisateur.'),
                'email' => $email,
                'password' => Hash::make(Str::random(32)),
                'role' => $authentikUser['attributes']['role'][0] ?? 'ROLE_CANDIDAT',
            ]);

            Personne::create([
                'utilisateur_id' => $user->id,
                'nom' => $authentikUser['attributes']['nom'][0] ?? 'Non renseigné',
                'prenom' => $authentikUser['attributes']['prenom'][0] ?? $authentikUser['name'],
                'email' => $email ?? null, // Email optionnel
                'contact' => $authentikUser['attributes']['contact'][0] ?? $telephone ?? '',
                'adresse' => $authentikUser['attributes']['adresse'][0] ?? '',
            ]);

            Log::info('Utilisateur créé via synchronisation Authentik', [
                'user_id' => $user->id,
                'telephone' => $user->telephone,
                'email' => $user->email
            ]);

            // Envoyer la notification de bienvenue
            $user->notify(new AccountCreatedNotification($user));
        }

        return $user;
    }

    /**

     * @OA\Post(
     *     path="/api/auth/change-password",
     *     operationId="changePassword",
     *     tags={"🔐 Authentification"},
     *     summary="🔑 Changement de mot de passe",
     *     description="Permet à un utilisateur connecté de changer son mot de passe.",

     * @OA\Get(
     *     path="/api/auth/me",
     *     operationId="getCurrentUser",
     *     tags={"🔐 Authentification"},
     *     summary="👤 Informations de l'utilisateur connecté",
     *     description="Récupère les informations de l'utilisateur actuellement connecté (id, telephone, email, role, centre_id, centre_nom, personne).",
     *     security={{"BearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="✅ Informations utilisateur récupérées",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="user", type="object",
     *                 @OA\Property(property="id", type="string", example="uuid"),
     *                 @OA\Property(property="telephone", type="string", example="0612345678"),
     *                 @OA\Property(property="email", type="string", example="jean.dupont@example.com", nullable=true),
     *                 @OA\Property(property="role", type="string", example="ROLE_CANDIDAT"),
     *                 @OA\Property(property="centre_id", type="string", format="uuid", nullable=true, description="UUID du centre (référentiel) si l'utilisateur est agent rattaché à un centre"),
     *                 @OA\Property(property="centre_nom", type="string", nullable=true, description="Libellé du centre (null si pas de centre)"),
     *                 @OA\Property(property="created_at", type="string", format="date-time"),
     *                 @OA\Property(property="personne", type="object", nullable=true,
     *                     @OA\Property(property="id", type="string"),
     *                     @OA\Property(property="nom", type="string", example="Dupont"),
     *                     @OA\Property(property="prenom", type="string", example="Jean"),
     *                     @OA\Property(property="nom_complet", type="string", example="Jean Dupont"),
     *                     @OA\Property(property="email", type="string", nullable=true),
     *                     @OA\Property(property="contact", type="string", example="0612345678"),
     *                     @OA\Property(property="adresse", type="string", example="123 Rue de Paris")
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=500, description="Erreur serveur")
     * )
     */
    #[Endpoint(title: 'Utilisateur connecté', description: 'Récupère les informations de l\'utilisateur connecté : id, telephone, email, role, centre_id, centre_nom, personne (nom, prénom, contact, adresse).')]
    #[ScrambleResponse(200, 'success, user (id, telephone, email, role, centre_id, centre_nom, created_at, personne)')]
    #[ScrambleResponse(401, 'Non authentifié')]
    #[ScrambleResponse(500, 'Erreur lors de la récupération des informations utilisateur.')]
    public function me(Request $request): JsonResponse
    {
        try {
            $user = AuthHelper::getAuthenticatedUser($request);
            $user->load(['personne', 'centre']);

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'telephone' => $user->telephone,
                    'email' => $user->email,
                    'role' => $user->role,
                    'centre_id' => $user->centre_id,
                    'centre_nom' => $user->centre?->libelle,
                    'created_at' => $user->created_at->toIso8601String(),
                    'personne' => $user->personne ? [
                        'id' => $user->personne->id,
                        'nom' => $user->personne->nom,
                        'prenom' => $user->personne->prenom,
                        'nom_complet' => $user->personne->prenom . ' ' . $user->personne->nom,
                        'email' => $user->personne->email,
                        'contact' => $user->personne->contact,
                        'adresse' => $user->personne->adresse,
                    ] : null
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Erreur récupération utilisateur', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des informations utilisateur.'
            ], 500);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/auth/update-profile",
     *     operationId="updateProfile",
     *     tags={"🔐 Authentification"},
     *     summary="✏️ Modifier les informations personnelles",
     *     description="Permet à un utilisateur connecté de modifier ses informations personnelles (nom, prénom, contact, adresse)",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="nom", type="string", example="Dupont"),
     *             @OA\Property(property="prenom", type="string", example="Jean"),
     *             @OA\Property(property="contact", type="string", example="0612345678"),
     *             @OA\Property(property="adresse", type="string", example="123 Rue de Paris")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Profil mis à jour",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Profil mis à jour avec succès."),
     *             @OA\Property(property="user", type="object")
     *         )
     *     ),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")
     * )
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $user = AuthHelper::getAuthenticatedUser($request);

            // Validation des données
            $validated = $request->validate([
                'nom' => 'sometimes|string|max:255',
                'prenom' => 'sometimes|string|max:255',
                'contact' => 'sometimes|string|max:20',
                'adresse' => 'sometimes|nullable|string|max:500',
            ]);

            // Mettre à jour les informations de la personne
            if ($user->personne) {
                $user->personne->update($validated);

                // Synchroniser avec Authentik si nécessaire
                try {
                    $this->authentikService->updateUserAttributes($user->email, $validated);
                } catch (Exception $e) {
                    Log::warning('Erreur synchronisation Authentik lors de la mise à jour du profil', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            DB::commit();

            Log::info('Profil utilisateur mis à jour', [
                'user_id' => $user->id,
                'updated_fields' => array_keys($validated)
            ]);

            // Recharger l'utilisateur avec ses relations
            $user->load('personne');

            return response()->json([
                'success' => true,
                'message' => 'Profil mis à jour avec succès.',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role,
                    'personne' => $user->personne ? [
                        'id' => $user->personne->id,
                        'nom' => $user->personne->nom,
                        'prenom' => $user->personne->prenom,
                        'nom_complet' => $user->personne->prenom . ' ' . $user->personne->nom,
                        'email' => $user->personne->email,
                        'contact' => $user->personne->contact,
                        'adresse' => $user->personne->adresse,
                    ] : null
                ]
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur mise à jour profil', [
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du profil.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Put(
     *     path="/api/auth/change-password",
     *     operationId="changePassword",
     *     tags={"🔐 Authentification"},
     *     summary="🔐 Changer le mot de passe",
     *     description="Permet à un utilisateur connecté de changer son mot de passe",

     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"current_password","new_password","new_password_confirmation"},

     *             @OA\Property(property="current_password", type="string", format="password", example="OldPassword123!"),
     *             @OA\Property(property="new_password", type="string", format="password", example="NewPassword123!"),
     *             @OA\Property(property="new_password_confirmation", type="string", format="password", example="NewPassword123!")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,

     *         description="✅ Mot de passe changé avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Votre mot de passe a été changé avec succès.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="❌ Non authentifié ou mot de passe actuel incorrect",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string", example="Mot de passe actuel incorrect.")
     *         )
     *     ),
     *     @OA\Response(response=422, description="❌ Erreur de validation"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")

     *         description="✅ Mot de passe changé",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Mot de passe changé avec succès.")
     *         )
     *     ),
     *     @OA\Response(response=400, description="❌ Mot de passe actuel incorrect"),
     *     @OA\Response(response=401, description="❌ Non authentifié"),
     *     @OA\Response(response=422, description="❌ Erreur de validation")

     * )
     */
    public function changePassword(Request $request): JsonResponse
    {
        try {

            DB::beginTransaction();

            // Validation des données
            $validated = $request->validate([
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:8|confirmed',
            ]);

            $user = AuthHelper::getAuthenticatedUser($request);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié.'
                ], 401);
            }

            // Vérifier le mot de passe actuel
            // D'abord essayer avec le mot de passe local
            $localPasswordValid = Hash::check($request->current_password, $user->password);

            // Si le mot de passe local n'est pas valide, vérifier avec Authentik
            if (!$localPasswordValid) {
                $authentikValid = $this->authentikService->authenticateUserDirect($user->email, $request->current_password);
                if (!$authentikValid['success']) {
                    Log::warning('Tentative de changement de mot de passe avec mot de passe actuel incorrect', [
                        'user_id' => $user->id,
                        'email' => $user->email
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Le mot de passe actuel est incorrect.'
                    ], 401);
                }
            }

            $newPassword = $request->new_password;

            // Changer le mot de passe dans Authentik
            $authentikResult = $this->authentikService->setUserPassword((int) $user->id, $newPassword);

            // Changer le mot de passe en local
            $user->password = Hash::make($newPassword);
            $user->save();

            DB::commit();

            Log::info('Mot de passe changé avec succès', [
                'user_id' => $user->id,
                'email' => $user->email,
                'authentik_success' => $authentikResult
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Votre mot de passe a été changé avec succès.'
            ]);

        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation.',
                'errors' => $e->errors()
            ], 422);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Erreur changement mot de passe', [
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du changement de mot de passe.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    private function generateAccessToken(Utilisateur $user): string
    {
        $payload = [
            'user_id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'exp' => time() + 86400, // 24 heures
            'iat' => time(),
        ];

        return base64_encode(json_encode($payload));
    }

    /**
     * @OA\Get(
     *     path="/api/auth/group/{groupName}/roles",
     *     operationId="getGroupRoles",
     *     tags={"🔍 Groupes Authentik"},
     *     summary="🔍 Récupérer les rôles d'un groupe Authentik",
     *     description="Récupère tous les rôles attachés à un groupe spécifique dans Authentik.",
     *     @OA\Parameter(
     *         name="groupName",
     *         in="path",
     *         required=true,
     *         description="Le nom du groupe Authentik",
     *         @OA\Schema(type="string", example="DGTT")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Rôles récupérés avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="group_name", type="string", example="DGTT"),
     *             @OA\Property(property="roles", type="array", @OA\Items(type="string"), example={"Role1", "Role2"}),
     *             @OA\Property(property="roles_count", type="integer", example=2)
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Nom du groupe requis",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Erreur serveur",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string")
     *         )
     *     )
     * )
     *
     * Récupérer les rôles attachés à un groupe Authentik
     *
     * @param string $groupName
     * @return JsonResponse
     */
    public function getGroupRoles(string $groupName): JsonResponse
    {
        try {
            if (empty($groupName)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le nom du groupe est requis.'
                ], 400);
            }

            // Récupérer les rôles du groupe
            $roles = $this->authentikService->getGroupRoles($groupName);

            Log::info('Rôles du groupe récupérés', [
                'group_name' => $groupName,
                'roles_count' => count($roles)
            ]);

            return response()->json([
                'success' => true,
                'group_name' => $groupName,
                'roles' => $roles,
                'roles_count' => count($roles)
            ]);

        } catch (Exception $e) {
            Log::error('Erreur récupération rôles du groupe', [
                'group_name' => $groupName,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des rôles du groupe.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/auth/group/{groupName}/details",
     *     operationId="getGroupDetails",
     *     tags={"🔍 Groupes Authentik"},
     *     summary="🔍 Récupérer les détails complets d'un groupe Authentik",
     *     description="Récupère toutes les informations d'un groupe : utilisateurs, rôles, attributs.",
     *     @OA\Parameter(
     *         name="groupName",
     *         in="path",
     *         required=true,
     *         description="Le nom du groupe Authentik",
     *         @OA\Schema(type="string", example="DGTT")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Détails du groupe récupérés avec succès",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="group", type="object",
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="DGTT"),
     *                     @OA\Property(property="attributes", type="object", example={})
     *                 ),
     *                 @OA\Property(property="users", type="array", @OA\Items(type="object",
     *                     @OA\Property(property="id", type="integer"),
     *                     @OA\Property(property="email", type="string"),
     *                     @OA\Property(property="username", type="string"),
     *                     @OA\Property(property="name", type="string")
     *                 )),
     *                 @OA\Property(property="users_count", type="integer", example=5),
     *                 @OA\Property(property="roles", type="array", @OA\Items(type="string")),
     *                 @OA\Property(property="roles_count", type="integer", example=3)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Nom du groupe requis",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Groupe non trouvé",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Erreur serveur",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=false),
     *             @OA\Property(property="message", type="string")
     *         )
     *     )
     * )
     *
     * Récupérer les détails complets d'un groupe Authentik (avec utilisateurs et rôles)
     *
     * @param string $groupName
     * @return JsonResponse
     */
    public function getGroupDetails(string $groupName): JsonResponse
    {
        try {
            if (empty($groupName)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le nom du groupe est requis.'
                ], 400);
            }

            // Récupérer les détails du groupe
            $details = $this->authentikService->getGroupDetails($groupName);

            if (!$details) {
                return response()->json([
                    'success' => false,
                    'message' => "Le groupe '{$groupName}' n'a pas été trouvé."
                ], 404);
            }

            Log::info('Détails du groupe récupérés', [
                'group_name' => $groupName,
                'users_count' => $details['users_count'],
                'roles_count' => $details['roles_count']
            ]);

            return response()->json([
                'success' => true,
                'data' => $details
            ]);

        } catch (Exception $e) {
            Log::error('Erreur récupération détails du groupe', [
                'group_name' => $groupName,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des détails du groupe.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/auth/send-verification-code",
     *     operationId="sendVerificationCode",
     *     tags={"🔐 Authentification"},
     *     summary="📧 Envoyer un code de vérification",
     *     description="Envoie un code de vérification à 8 chiffres par email ou SMS selon l'identifiant fourni.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"identifier"},
     *             @OA\Property(property="identifier", type="string", example="0612345678", description="Email ou numéro de téléphone")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Code envoyé",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Un code de vérification a été envoyé par email."),
     *             @OA\Property(property="method", type="string", example="email")
     *         )
     *     ),
     *     @OA\Response(response=404, description="❌ Utilisateur non trouvé"),
     *     @OA\Response(response=422, description="❌ Erreur de validation"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function sendVerificationCode(SendVerificationCodeRequest $request): JsonResponse
    {
        try {
            $identifier = $request->identifier;
            $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL) !== false;

            // Trouver l'utilisateur
            $user = null;
            if ($isEmail) {
                $user = Utilisateur::where('email', $identifier)->first();
            } else {
                $user = Utilisateur::where('telephone', $identifier)->first();
            }

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé.'
                ], 404);
            }

            // Seuls les candidats peuvent demander un code de vérification
            if (!in_array($user->role, ['ROLE_CANDIDAT', 'candidat'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'La vérification de compte n\'est requise que pour les candidats.'
                ], 403);
            }

            // Vérifier si déjà vérifié
            if ($this->verificationService->isVerified($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce compte est déjà vérifié.'
                ], 400);
            }

            $code = $this->verificationService->generateVerificationCode();
            $verificationChannels = [];

            if (!empty($user->email)) {
                $sentEmail = $this->verificationService->sendVerificationCodeByEmail($user, $code);
                $verificationChannels[] = [
                    'method' => 'email',
                    'sent' => $sentEmail,
                    'message' => $sentEmail
                        ? 'Code envoyé par email.'
                        : 'Impossible d\'envoyer le code par email.'
                ];
            }

            if (!empty($user->telephone)) {
                $sentSms = $this->verificationService->sendVerificationCodeBySms($user, $code);
                $verificationChannels[] = [
                    'method' => 'sms',
                    'sent' => $sentSms,
                    'message' => $sentSms
                        ? 'Code envoyé par SMS.'
                        : 'L\'envoi par SMS n\'est pas encore disponible. Le code est enregistré pour vérification.'
                ];
            }

            $sentAny = collect($verificationChannels)->contains(function ($channel) {
                return $channel['sent'] === true;
            });

            if (!$sentAny) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible d\'envoyer le code de vérification.'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Un code de vérification a été envoyé sur les canaux disponibles.',
                'channels' => $verificationChannels
            ]);

        } catch (Exception $e) {
            Log::error('Erreur envoi code de vérification', [
                'identifier' => $request->identifier,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'envoi du code de vérification.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/auth/verify-account",
     *     operationId="verifyAccount",
     *     tags={"🔐 Authentification"},
     *     summary="✅ Vérifier un compte",
     *     description="Vérifie un compte avec le code à 8 chiffres reçu par email ou SMS.",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"identifier","code"},
     *             @OA\Property(property="identifier", type="string", example="0612345678", description="Email ou numéro de téléphone"),
     *             @OA\Property(property="code", type="string", example="12345678", description="Code de vérification à 8 chiffres")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="✅ Compte vérifié",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Votre compte a été vérifié avec succès."),
     *             @OA\Property(property="user", type="object")
     *         )
     *     ),
     *     @OA\Response(response=400, description="❌ Code invalide ou compte déjà vérifié"),
     *     @OA\Response(response=404, description="❌ Utilisateur non trouvé"),
     *     @OA\Response(response=422, description="❌ Erreur de validation"),
     *     @OA\Response(response=500, description="❌ Erreur serveur")
     * )
     */
    public function verifyAccount(VerifyAccountRequest $request): JsonResponse
    {
        try {
            $identifier = $request->identifier;
            $code = $request->code;
            $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL) !== false;

            // Trouver l'utilisateur
            $user = null;
            if ($isEmail) {
                $user = Utilisateur::where('email', $identifier)->first();
            } else {
                $user = Utilisateur::where('telephone', $identifier)->first();
            }

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non trouvé.'
                ], 404);
            }

            // Seuls les candidats peuvent vérifier leur compte
            if (!in_array($user->role, ['ROLE_CANDIDAT', 'candidat'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'La vérification de compte n\'est requise que pour les candidats.'
                ], 403);
            }

            // Vérifier si déjà vérifié
            if ($this->verificationService->isVerified($user)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce compte est déjà vérifié.'
                ], 400);
            }

            // Vérifier le code
            $method = $isEmail ? 'email' : 'sms';
            $isValid = $this->verificationService->verifyCode($user, $code, $method);

            if (!$isValid) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le code de vérification est invalide ou a expiré.'
                ], 400);
            }

            $user->load('personne');

            Log::info('Compte vérifié avec succès', [
                'user_id' => $user->id,
                'method' => $method
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Votre compte a été vérifié avec succès. Vous pouvez maintenant vous connecter.',
                'user' => [
                    'id' => $user->id,
                    'telephone' => $user->telephone,
                    'email' => $user->email,
                    'role' => $user->role,
                    'verified_at' => $user->verified_at?->toIso8601String(),
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Erreur vérification compte', [
                'identifier' => $request->identifier,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification du compte.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}

