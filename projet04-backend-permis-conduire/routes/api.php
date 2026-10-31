<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EtapeController;
use App\Http\Controllers\Api\StatutController;
use App\Http\Controllers\Api\CircuitController;
use App\Http\Controllers\Api\DossierController;
use App\Http\Controllers\Api\CandidatController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\AutoEcoleController;
use App\Http\Controllers\Api\TransitionController;
use App\Http\Controllers\Api\ReferentielController;
use App\Http\Controllers\Api\RoleHasPermissionController;
use App\Http\Controllers\Api\JournalTransitionController;
use App\Http\Controllers\Api\FormationAutoEcoleController;
use App\Http\Controllers\Api\PieceJustificativeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProgrammeSessionController;
use App\Http\Controllers\Api\ResultatController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\EmailSendController;
use App\Http\Controllers\Api\WirepickController;
use App\Http\Controllers\Api\{PaiementController, TypeDemandeController, UtilisateurController};
use App\Http\Controllers\HPermisController;
use App\Http\Controllers\{HEPermisController, ChangePermisController};

use App\Http\Controllers\Api\AlfrescoCrudController;
use App\Http\Controllers\Api\MoovPaymentController;
use App\Http\Controllers\Api\MoovRengusVerificationController;
use App\Http\Controllers\Api\PublicSmsController;
use App\Http\Controllers\Api\PaiementAirtelCallbackController;
use App\Http\Controllers\Api\PublicPaiementController;
use App\Http\Controllers\Api\PublicPermisUsagerController;
use App\Http\Controllers\Api\MinioController;
use App\Http\Controllers\Api\RoleController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Routes API pour l'authentification et la gestion de l'auto-école
|
*/

// Routes d'authentification publiques (sans authentification requise)
Route::prefix('auth')->group(function () {
    // Authentification OAuth avec Authentik (Authorization Code Flow)
    Route::get('/authentik/redirect', [AuthController::class, 'redirectToAuthentik'])
        ->name('auth.authentik.redirect');

    Route::get('/authentik/callback', [AuthController::class, 'handleAuthentikCallback'])
        ->name('auth.authentik.callback');

    // Obtenir l'URL d'authentification pour le frontend
    Route::get('/auth-url', [AuthController::class, 'getAuthUrl'])
        ->name('auth.url');

    // Inscription (crée l'utilisateur et retourne l'URL d'auth)
    Route::post('/register', [AuthController::class, 'register'])
        ->name('auth.register');

    // Générer un captcha pour la connexion
    Route::get('/captcha', [AuthController::class, 'generateCaptcha'])
        ->name('auth.captcha');

    // 🚀 NOUVELLE ROUTE : Connexion directe avec contournement Password Grant
    Route::post('/login-direct', [AuthController::class, 'loginDirect'])
        ->name('auth.login.direct');

    // ✅ ROUTES DE VÉRIFICATION DE COMPTE
    Route::post('/send-verification-code', [AuthController::class, 'sendVerificationCode'])
        ->name('auth.send-verification-code');

    Route::post('/verify-account', [AuthController::class, 'verifyAccount'])
        ->name('auth.verify-account');

    // 🔐 ROUTES DE RÉINITIALISATION DE MOT DE PASSE
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
        ->name('auth.forgot-password');

    Route::post('/reset-password', [AuthController::class, 'resetPassword'])
        ->name('auth.reset-password');

    // Rafraîchir le token d'accès (sans authentification car le token est expiré)
    Route::post('/refresh', [AuthController::class, 'refreshToken'])
        ->name('auth.refresh');

    // Déconnexion
    Route::post('/logout', [AuthController::class, 'logout'])
        ->name('auth.logout');

    // 👤 ROUTES DE GESTION DU PROFIL UTILISATEUR (déplacées vers routes protégées)

    // 🔍 ROUTES DE RÉCUPÉRATION DES GROUPES ET RÔLES
    Route::get('/group/{groupName}/roles', [AuthController::class, 'getGroupRoles'])
        ->name('auth.group.roles');

    Route::get('/group/{groupName}/details', [AuthController::class, 'getGroupDetails'])
        ->name('auth.group.details');
});

// SMS public (sans auth.token)
Route::post('/public/sms', [PublicSmsController::class, 'send'])->name('public.sms.send');

// Paiement public (sans auth.token) - protégé par X-API-KEY
Route::get('/public/paiements/exists', [PublicPaiementController::class, 'exists'])
    ->middleware('x.api.key')
    ->name('public.paiements.exists');

// Permis — recherche usager (intégration externe, v1)
Route::get('/v1/permis/usager', [PublicPermisUsagerController::class, 'show'])
    ->middleware(['x.api.key', 'public.api.ip.whitelist'])
    ->name('public.permis.usager');

// Route de test pour le middleware
Route::middleware(['auth.token'])->group(function () {
    Route::get('/test-auth', function () {
        return response()->json([
            'success' => true,
            'message' => 'Middleware fonctionne !',
            'user' => Auth::user()
        ]);
    });
});

// Callback Airtel / Paynala (webhook technique, sans auth.token)
Route::post('/paiement/airtel/callback', [PaiementAirtelCallbackController::class, 'handle'])
    ->name('paiement.airtel.callback');

// Route protégée pour le changement de mot de passe
Route::middleware(['auth.token'])->group(function () {
    Route::post('/auth/change-password', [AuthController::class, 'changePassword'])
        ->name('auth.change-password');
});

// Routes protégées (Authentification requise - tous les utilisateurs authentifiés)
Route::middleware(['auth.token'])->group(function () {

    //Routes statistic
    /* Route::get('/statistic-by-year',[YearStatisticController::class, 'statistiByYear']);
    Route::get('/statistic-by-month',[YearStatisticController::class,'statistiByMonth']); */
    // Routes de lecture (GET) - maintenant protégées (mes-dossiers avant {candidat} pour éviter que "mes-dossiers" soit pris pour un id)
    Route::get('/candidats', [CandidatController::class, 'index']);
    Route::get('/candidats/mes-dossiers', [CandidatController::class, 'mesDossiers'])->name('candidats.dossiers');
    Route::get('/candidats/{candidat}', [CandidatController::class, 'show']);
    Route::get('/auto-ecoles', [AutoEcoleController::class, 'index']);
    Route::get('/auto-ecoles/complets', [AutoEcoleController::class, 'indexComplets'])->name('auto-ecoles.complets');
    Route::get('/auto-ecoles/cnepc', [AutoEcoleController::class, 'showCnepc'])->name('auto-ecoles.cnepc');
    Route::get('/auto-ecoles/{auto_ecole}', [AutoEcoleController::class, 'show']);
    Route::get('/auto-ecoles/{auto_ecole}/formations', [AutoEcoleController::class, 'formations'])->name('auto-ecoles.formations');
    Route::get('/formations', [FormationAutoEcoleController::class, 'index']);
    Route::get('/formations/{formation}', [FormationAutoEcoleController::class, 'show']);
    Route::get('/formations/{formation}/documents-requis', [FormationAutoEcoleController::class, 'documentsRequis'])->name('formations.documents-requis');
    Route::get('/dossiers', [DossierController::class, 'index']);
    Route::get('/dossiers/historique', [DossierController::class, 'historique']);
    Route::get('/dossiers/historique-retour-cneddt', [DossierController::class, 'historiqueRetourCneddt']);
    Route::get('/dossiers/envoi-biometrie', [DossierController::class, 'indexEnvoiBiometrie']);
    Route::get('/dossiers/{dossier}', [DossierController::class, 'show']);
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::get('/utilisateurs/candidats', [UtilisateurController::class, 'indexCandidats'])->name('utilisateurs.candidats');
    Route::get('/utilisateurs/agents', [UtilisateurController::class, 'indexAgents'])->name('utilisateurs.agents');
    Route::put('/utilisateurs/{utilisateur}', [UtilisateurController::class, 'update'])->name('utilisateurs.update');
    Route::patch('/utilisateurs/{utilisateur}', [UtilisateurController::class, 'update'])->name('utilisateurs.update');
    Route::delete('/utilisateurs/{utilisateur}', [UtilisateurController::class, 'destroy'])->name('utilisateurs.destroy');
    Route::get('/referentiels', [ReferentielController::class, 'index']);
    Route::get('/referentiels/{referentiel}', [ReferentielController::class, 'show']);
    Route::post('/referentiels/link-centre-province', [ReferentielController::class, 'linkCentreProvince'])->name('referentiels.link-centre-province');

    // Gestion des rôles (table roles)
    Route::apiResource('roles', RoleController::class);

    // Rôles et permissions (role_has_permissions)
    Route::get('/role-has-permissions', [RoleHasPermissionController::class, 'index']);
    Route::get('/role-has-permissions/by-role/{role}', [RoleHasPermissionController::class, 'showByRole'])->where('role', '.*');
    Route::get('/role-has-permissions/{role_has_permission}', [RoleHasPermissionController::class, 'show']);

    // 👤 ROUTES DE GESTION DU PROFIL UTILISATEUR
    Route::get('/auth/me', [AuthController::class, 'me'])
        ->name('auth.me');
    Route::put('/auth/update-profile', [AuthController::class, 'updateProfile'])
        ->name('auth.update-profile');
    Route::put('/auth/change-password', [AuthController::class, 'changePassword'])
        ->name('auth.change-password');
    // Candidats yes
    Route::post('/candidats/complete-profile', [CandidatController::class, 'completeProfile'])->name('candidats.complete-profile');
    Route::post('/candidats/inscription-formation', [CandidatController::class, 'inscriptionFormation'])->name('candidats.inscription-formation');
    Route::post('/candidats', [CandidatController::class, 'store']);
    Route::put('/candidats/{candidat}', [CandidatController::class, 'update']);
    Route::patch('/candidats/{candidat}', [CandidatController::class, 'update']);
    Route::delete('/candidats/{candidat}', [CandidatController::class, 'destroy']);

    // Auto-écoles
    Route::get('/auto-ecoles/mes-dossiers', [AutoEcoleController::class, 'mesDossiers'])->name('auto-ecoles.mes-dossiers');
    Route::post('/auto-ecoles', [AutoEcoleController::class, 'store']);
    Route::put('/auto-ecoles/{auto_ecole}', [AutoEcoleController::class, 'update']);
    Route::patch('/auto-ecoles/{auto_ecole}', [AutoEcoleController::class, 'update']);
    Route::delete('/auto-ecoles/{auto_ecole}', [AutoEcoleController::class, 'destroy']);

    // Formations
    Route::post('/formations', [FormationAutoEcoleController::class, 'store']);
    Route::put('/formations/{formation}', [FormationAutoEcoleController::class, 'update']);
    Route::patch('/formations/{formation}', [FormationAutoEcoleController::class, 'update']);
    Route::delete('/formations/{formation}', [FormationAutoEcoleController::class, 'destroy']);

    // Dossiers
    Route::post('/dossiers', [DossierController::class, 'store']);
    Route::put('/dossiers/{dossier}', [DossierController::class, 'update']);
    Route::patch('/dossiers/{dossier}', [DossierController::class, 'update']);
    Route::delete('/dossiers/{dossier}', [DossierController::class, 'destroy']);
    Route::post('/dossiers/{dossier}/upload-document', [DossierController::class, 'uploadDocument'])->name('dossiers.upload-document');
    Route::post('/dossiers/{dossier}/notifier-carte-disponible', [DossierController::class, 'notifierCarteDisponibleCentre'])->name('dossiers.notifier-carte-disponible');
    Route::post('/dossiers/{dossier}/carte-remise-candidat', [DossierController::class, 'confirmerCarteRemiseAuCandidat'])->name('dossiers.carte-remise-candidat');
    Route::post('/dossiers/{dossier}/valider', [DossierController::class, 'valider'])->name('dossiers.valider');
    Route::get('/dossiers/{dossier}/complet', [DossierController::class, 'complet'])->name('dossiers.complet');
    Route::post('/dossiers/transfert', [DossierController::class, 'transfert'])->name('dossier.transfert');
    Route::post('/dossiers/{dossier}/open', [DossierController::class, 'open'])->name('dossiers.open');
    Route::post('/dossiers/{dossier}/close', [DossierController::class, 'close'])->name('dossiers.close');
    Route::post('/dossiers/{dossier}/initier-paiement-moov', [MoovPaymentController::class, 'initierPaiement'])->name('dossiers.initier-paiement-moov');
    Route::post('/paiements/moov/verifier-commande', [MoovRengusVerificationController::class, 'checkOrder'])->name('paiements.moov.verifier-commande');
    // Documents
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::put('/documents/{document}', [DocumentController::class, 'update']);
    Route::patch('/documents/{document}', [DocumentController::class, 'update']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
    Route::post('/documents/{document}/valider', [DossierController::class, 'validerDocument'])->name('documents.valider');
    Route::get('/documents/{document}/download', [DocumentController::class, 'download']);


    // Référentiels
    Route::post('/referentiels', [ReferentielController::class, 'store']);
    Route::put('/referentiels/{referentiel}', [ReferentielController::class, 'update']);
    Route::patch('/referentiels/{referentiel}', [ReferentielController::class, 'update']);
    Route::delete('/referentiels/{referentiel}', [ReferentielController::class, 'destroy']);

    // Rôles et permissions (role_has_permissions) - ajout, modification, suppression
    Route::post('/role-has-permissions', [RoleHasPermissionController::class, 'store']);
    Route::put('/role-has-permissions/{role_has_permission}', [RoleHasPermissionController::class, 'update']);
    Route::patch('/role-has-permissions/{role_has_permission}', [RoleHasPermissionController::class, 'update']);
    Route::delete('/role-has-permissions/{role_has_permission}', [RoleHasPermissionController::class, 'destroy']);

    // Programme Sessions
    Route::apiResource('programme-sessions', ProgrammeSessionController::class);

    // Résultats
    Route::apiResource('resultats', ResultatController::class);

    // Pièces justificatives
    Route::apiResource('pieces-justificatives', PieceJustificativeController::class);
    Route::get('/pieces-justificatives/{piece}/documents', [PieceJustificativeController::class, 'documents'])->name('pieces-justificatives.documents');
    Route::get('/pieces-justificatives/{piece}/documents/{document}/download', [PieceJustificativeController::class, 'downloadDocument'])->name('pieces-justificatives.download');
    Route::get('/pieces-justificatives/{piece}/documents/{document}/url', [PieceJustificativeController::class, 'getDocumentUrl'])->name('pieces-justificatives.document-url');

    // Types de demandes
    Route::apiResource('type-demandes', TypeDemandeController::class);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::get('/notifications/stats', [NotificationController::class, 'stats'])->name('notifications.stats');
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::patch('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Push Notifications
    Route::post('/push/subscribe', [PushSubscriptionController::class, 'subscribe'])->name('push.subscribe');
    Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])->name('push.unsubscribe');
    Route::get('/push/status', [PushSubscriptionController::class, 'status'])->name('push.status');

    // Routes Alfresco
    Route::prefix('alfresco')->group(function () {
        Route::get('/folder/{name}', [AlfrescoCrudController::class, 'createFolder']);
        // Route::get('/children', [AlfrescoCrudController::class, 'listChildren']);
        // Route::post('/upload', [AlfrescoCrudController::class, 'uploadFile']);
        // Route::put('/rename/{nodeId}', [AlfrescoCrudController::class, 'renameNode']);
        Route::delete('/delete/{nodeId}', [AlfrescoCrudController::class, 'deleteNode']);
        // Route::get('/search/{name}', [AlfrescoCrudController::class, 'searchFolderByName']);
        //ouvrir le fichier
        Route::get('/openfile/{nodeId}', [MinioController::class, 'getByPath']) ->where('nodeId', '.*');
        //televerser dans un dossier spécifique
        Route::post('/uploadinfolder', [AlfrescoCrudController::class, 'uploadInFolder']);
        //dossier du candidat
        Route::get('/readfile/{name}', [AlfrescoCrudController::class, 'readFile']);
    });

    Route::apiResource('paiements', PaiementController::class);
    Route::prefix('paiements')->group(function () {
        Route::get('{id}/pdf/view', [PaiementController::class, 'viewPdf']);     // visualiser
        Route::get('{id}/pdf/download', [PaiementController::class, 'downloadPdf']); // télécharger
    });

    // HPermis Routes
    Route::get('/change-permis/{nomNumeroPermis?}', [HPermisController::class, 'index']);
    Route::post('/change-permis', [HPermisController::class, 'index']);
    Route::get('/h-permis/recherche', [HPermisController::class, 'searchLike']);
    Route::post('/h-permis/recherche', [HPermisController::class, 'searchLike']);
    Route::post('/create', [HPermisController::class, 'store']);
    // H Permis avec des erreur Routes
    Route::get('/change-permis-default/{nomNumeroPermis}', [HEPermisController::class, 'index']);
    Route::post('/create-date_defaul', [HEPermisController::class, 'store']);

    Route::post('/historique-change-permis', [ChangePermisController::class, 'store']);
    //verification des paiements
    Route::get('/check-paiement', [DossierController::class, 'verifierPaiementsEnAttente']);
    Route::get('/dossiers/{dossier}/check-paiement', [DossierController::class, 'checkPaiement'])->name('dossiers.check-paiement');
    Route::get('/historic-paiement', [DossierController::class, 'historiquePayement']);
});

// Route::get('/downloadFile', [AlfrescoCrudController::class, 'downloadFile']);

// Route::post('/uploadinfolder', [AlfrescoCrudController::class, 'uploadInFolder']);
// Route::get('/openfiles/{nodeId}', [AlfrescoCrudController::class, 'openFile']);
// Callback Moov Money (Result URL) - appelé par la plateforme Moov, sans auth
Route::post('/paiement/moov/callback', [MoovPaymentController::class, 'callbackResult'])->name('paiement.moov.callback');

//send email
Route::post('/send-email-creation-account', [EmailSendController::class, 'sendEmailCreationAccount']);
//reset-password
Route::post('/reset-password', [EmailSendController::class, 'resetPassword']);
//password-modifier
Route::post('/password-modifier', [EmailSendController::class, 'passwordModifier']);

// Route pour le workflow
//password-modifier
Route::post('/resultat-biometrie', [EmailSendController::class, 'resultatBiometrie']);

//permis-disponible
Route::post('/permis-disponible', [EmailSendController::class, 'permisDisponible']);
//examen-permis
Route::post('/examen-permis', [EmailSendController::class, 'examenPermis']);


//envoi SMS via Wirepick
Route::post('/wirepick/send', [WirepickController::class, 'sendSMS']);
Route::post('/wirepick/flash', [WirepickController::class, 'sendFlash']);
Route::post('/wirepick/query', [WirepickController::class, 'query']);

//endpoint utilisateurs
Route::get('/utilisateurs', [UtilisateurController::class, 'index']);

Route::prefix('minio')->group(function () {
    Route::post('/upload', [MinioController::class, 'upload']);
    Route::get('/list', [MinioController::class, 'list']);
    Route::get('/get-by-path/{nodeId}', [MinioController::class, 'getByPath'])
     ->where('nodeId', '.*');
    Route::post('/update', [MinioController::class, 'update']);
    Route::delete('/delete', [MinioController::class, 'delete']);
});
// Route de test (publique)
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'API Auto-École fonctionnelle',
        'timestamp' => now()->toIso8601String(),
        'version' => '1.0.0',
        'environment' => config('app.env'),
    ]);
})->name('api.health');


// Route pour le workflow
Route::prefix('workflow')->group(function () {

    // Avant apiResource('etapes') : évite que « transmettre » soit résolu comme {etape} (UUID) → 404 ModelNotFound.
    // L’envoi CNEDDT est POST /dossiers/transfert (middleware auth.token), pas /workflow/etapes/…
    Route::match(['get', 'post', 'put', 'patch', 'delete'], '/etapes/transmettre', function () {
        return response()->json([
            'success' => false,
            'message' => 'Cette URL ne correspond pas à une étape du workflow. Pour transmettre un dossier au CNEDDT, appelez POST /api/dossiers/transfert avec un corps JSON (dossier_id + type_demande_id, ou dossiers[] en masse) et le header Authorization.',
        ], 422);
    })->name('workflow.etapes.transmettre.deprecated-hint');

    // CIRCUITS
    Route::apiResource('circuits', CircuitController::class);

    // ETAPES
    Route::apiResource('etapes', EtapeController::class);
    Route::post('/etapes/transitions', [EtapeController::class, 'moveModel']);


    // TRANSITIONS Ok
    Route::apiResource('transitions', TransitionController::class);

    // JOURNAL DES TRANSITIONS
    Route::apiResource('journal-transitions', JournalTransitionController::class);


    // STATUTS
    Route::apiResource('statuts', StatutController::class);
});

// Route publique pour récupérer la clé publique VAPID
Route::get('/push/vapid-public-key', [PushSubscriptionController::class, 'getVapidPublicKey'])->name('push.vapid-public-key');

Route::get('/dgdi-checkDocument', [CandidatController::class, 'checkIdentity']);

Route::post('/cneddt/receive', [DossierController::class, 'getDossierFromCneddt']);

/* Test WebSocket */
Route::get('/send-ws-notification', [DossierController::class, 'testWs']);

// Route::post('/documentsteste', [DocumentController::class, 'store']);

// Route::get('/health', function () {
//     return response()->json(['status' => 'ok']);
// });
// Route::post('/change-permis', [HPermisController::class, 'index']);
// Route::post('/change-permis-default', [HEPermisController::class, 'index']);
//  Route::post('/uploadinfolder', [AlfrescoCrudController::class, 'uploadInFolder']);

// Route::get('/openfiles/{nodeId}', [AlfrescoCrudController::class, 'openFile']);

// Route::post('/send-email-creation-account', [EmailSendController::class, 'sendEmailCreationAccount']);
// Route::post('/reset-password', [EmailSendController::class, 'resetPassword']);
// //password-modifier
// Route::post('/password-modifier', [EmailSendController::class, 'passwordModifier']);

// // Route pour le workflow
// //password-modifier
// Route::post('/resultat-biometrie', [EmailSendController::class, 'resultatBiometrie']);

// //permis-disponible
// Route::post('/permis-disponible', [EmailSendController::class, 'permisDisponible']);
// //examen-permis
// Route::post('/examen-permis', [EmailSendController::class, 'examenPermis']);

// Référentiels
// Route::post('/referentiels-teste', [ReferentielController::class, 'store']);
// Route::put('/referentiels-teste/{referentiel}', [ReferentielController::class, 'update']);
// Route::patch('/referentiels/{referentiel}', [ReferentielController::class, 'update']);
// Route::delete('/referentiels-teste/{referentiel}', [ReferentielController::class, 'destroy']);
// Route::get('/referentiels-teste', [ReferentielController::class, 'index']);
