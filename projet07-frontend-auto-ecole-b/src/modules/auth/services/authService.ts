// Service d'authentification
import { LoginRequest, CaptchaResponse } from './types';

import axiosClient from '../../../shared/utils/axiosConfig';

// Éviter de logger plusieurs fois la même indisponibilité captcha (ex. double mount React)
let captchaUnavailableLastLog = 0;
const CAPTCHA_LOG_COOLDOWN_MS = 5000;
import { Person } from '../../cnepc/forms/updateinfoAutoEcole';
import { ChangePasswordForm } from '../../eleves/types/changepassword';
import { FormDataEmail } from '../forms/LoginForm';
import { ResetPasswordFormData } from '../forms/resetpassword';
import { AutoEcoleListApiResponse, AutoEcoleDetailResponse } from '../../cnepc/types/auto-ecole';
import { logger } from '../../../shared/utils/logger';

export class AuthService {
  /**
   * Récupère un nouveau captcha.
   * En dev : /api/auth/captcha est relayé par le proxy Vite vers le backend de production.
   */
  async getCaptcha(): Promise<CaptchaResponse> {
    try {
      const response = await axiosClient.get('/auth/captcha');
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const isCorsError = error?.code === 'ERR_NETWORK' ||
                         error?.message?.includes('CORS') ||
                         error?.message?.includes('Network Error');

      if (isCorsError) {
        logger.warn('⚠️ Erreur CORS lors de la récupération du captcha. Vérifiez la configuration CORS du serveur.');
      } else if (status >= 500) {
        const now = Date.now();
        if (now - captchaUnavailableLastLog >= CAPTCHA_LOG_COOLDOWN_MS) {
          captchaUnavailableLastLog = now;
          const backendDetail = error?.response?.data;
          if (backendDetail) {
            logger.warn('⚠️ Service captcha — réponse serveur 500:', typeof backendDetail === 'object' ? JSON.stringify(backendDetail) : backendDetail);
          } else {
            logger.warn('⚠️ Service captcha temporairement indisponible (erreur serveur). Réessayez.');
          }
        }
        throw new Error('Service captcha temporairement indisponible. Cliquez sur « Actualiser » pour réessayer.');
      } else {
        logger.error('❌ Erreur récupération captcha:', error);
      }

      throw new Error(error?.response?.data?.message || `Erreur récupération captcha: ${error.message}`);
    }
  }

  async login(credentials: LoginRequest): Promise<any> {
    try {
      logger.log('🔐 Tentative de connexion:', { identifier: credentials.identifier });

      // Utilisation de l'API d'authentification
      const response = await axiosClient.post("/auth/login-direct", credentials);

      logger.log('✅ Connexion réussie');

      return response;
    } catch (error: any) {
      logger.error('❌ ERREUR DE CONNEXION');
      logger.error('Message:', error.message);

      if (error.response) {
        logger.error('Statut HTTP:', error.response.status);
        logger.error('Données:', error.response.data);
      }

      throw new Error(`Erreur de connexion: ${error.message}`);
    }
  }

  async register(data: {
    email: string;
    password: string;
    password_confirmation: string;
    nom: string;
    prenom: string;
    contact: string;
    telephone?: string;
    adresse?: string;
    role: string;
    captcha_id?: string;
    captcha_code?: string;
  }): Promise<any> {
    try {
      // Normaliser les numéros (chiffres seuls) pour éviter les erreurs de validation backend
      const digitsOnly = (s: string) => (s || '').replace(/\D/g, '');
      const contactNorm = digitsOnly(data.contact) || data.contact;
      const telephoneNorm = data.telephone != null && data.telephone !== ''
        ? digitsOnly(data.telephone)
        : contactNorm;

      const payload: Record<string, unknown> = {
        ...data,
        contact: contactNorm,
        // Le backend exige le champ telephone : on envoie toujours (même valeur que contact si non renseigné)
        telephone: telephoneNorm,
      };

      logger.log('📝 Tentative d\'enregistrement:', { 
        email: data.email, 
        nom: data.nom, 
        prenom: data.prenom, 
        role: data.role,
        captcha_id: data.captcha_id ? 'présent' : 'absent',
        captcha_code: data.captcha_code ? 'présent' : 'absent'
      });
      
      logger.log('📤 Données complètes envoyées:', JSON.stringify(payload, null, 2));
      const base = axiosClient.defaults.baseURL || '';
      logger.log('📡 URL d\'inscription:', `${base}${base.endsWith('/') ? '' : '/'}auth/register`);
      
      const response = await axiosClient.post("/auth/register", payload);
      logger.log('✅ Enregistrement réussi');
      
      return response.data;
    } catch (error: any) {
      logger.error('❌ ERREUR D\'ENREGISTREMENT');
      logger.error('Message:', error.message);
      
      if (error.response) {
        logger.error('Statut HTTP:', error.response.status);
        logger.error('Données:', error.response.data);
        const errDetail = error.response.data?.errors;
        if (errDetail != null) {
          logger.error('Détail des erreurs de validation:', JSON.stringify(errDetail, null, 2));
        }
      }

      // Message utilisateur en cas d'indisponibilité du service IAM (Authentik)
      const backendError = error.response?.data?.error ?? '';
      const isIamUnreachable =
        typeof backendError === 'string' &&
        (backendError.includes('Could not resolve host') ||
          backendError.includes('iam.transports.gouv.ga') ||
          backendError.includes('Authentik'));
      if (error.response?.status === 500 && isIamUnreachable) {
        throw new Error(
          'Le service d\'authentification est temporairement indisponible. Veuillez réessayer plus tard ou contacter l\'administrateur.'
        );
      }

      const resData = error.response?.data;
      const message = resData?.message;
      const errors = resData?.errors;
      if (errors && typeof errors === 'object') {
        const parts: string[] = [];
        const fieldLabels: Record<string, string> = {
          telephone: 'Téléphone',
          contact: 'Contact',
          email: 'Email',
          password: 'Mot de passe',
          password_confirmation: 'Confirmation du mot de passe',
          nom: 'Nom',
          prenom: 'Prénom',
          adresse: 'Adresse',
          captcha_code: 'Code captcha',
        };
        for (const [field, msgs] of Object.entries(errors)) {
          const label = fieldLabels[field] ?? field;
          const list = Array.isArray(msgs) ? msgs : [msgs];
          for (const m of list) {
            const text = typeof m === 'string' ? m : (m && typeof m === 'object' && 'message' in m) ? (m as { message: string }).message : String(m);
            if (text) parts.push(`${label}: ${text}`);
          }
        }
        if (parts.length > 0) {
          throw new Error(parts.join(' • '));
        }
        // Format d'errors inattendu : renvoyer au moins le message général
        if (message && typeof message === 'string') {
          throw new Error(message);
        }
      }
      if (message && typeof message === 'string') {
        throw new Error(message);
      }
      throw error;
    }
  }

  // async register(data: {
  //   email: string;
  //   password: string;
  //   password_confirmation: string;
  //   nom: string;
  //   prenom: string;
  //   contact: string;
  //   adresse?: string;
  //   role: string;
  // }): Promise<any> {
  //   try {
  //     console.log('📝 Tentative d\'enregistrement:', { 
  //       email: data.email, 
  //       nom: data.nom, 
  //       prenom: data.prenom, 
  //       role: data.role 
  //     });
      
  //     const response = await axiosAuthentifcation.post("/auth/register", data);
      
  //     console.log('✅ Enregistrement réussi !');
  //     console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //     console.log('👤 NOUVEL UTILISATEUR CRÉÉ');
  //     console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
  //     if (response.data && response.data.user) {
  //       const user = response.data.user;
        
  //       console.log('📋 Identité:');
  //       console.log('  • ID Utilisateur:', user.id);
  //       console.log('  • Email:', user.email);
  //       console.log('  • Rôle:', user.role);
        
  //       if (user.personne) {
  //         console.log('\n👨‍💼 Informations Personnelles:');
  //         console.log('  • ID Personne:', user.personne.id);
  //         console.log('  • Nom:', user.personne.nom);
  //         console.log('  • Prénom:', user.personne.prenom);
  //         console.log('  • Contact:', user.personne.contact);
  //       }
        
  //       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //     }
      
  //     return response.data;
  //   } catch (error: any) {
  //     console.error('❌ ERREUR D\'ENREGISTREMENT');
  //     console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //     console.error('Message:', error.message);
      
  //     if (error.response) {
  //       console.error('Statut HTTP:', error.response.status);
  //       console.error('Données:', error.response.data);
  //     }
      
  //     console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
  //     throw error;
  //   }
  // }

  async logoutBackEnd(): Promise<void> {
    try {
      await axiosClient.post("/auth/logout");
    } catch (error: any) {
      throw new Error(`Erreur de déconnexion: ${error.message}`);
    }
  }

  async refreshToken(): Promise<{ token: string; refreshToken: string }> {
    try {
      logger.log('🔄 Rafraîchissement du token...');
      const response = await axiosClient.post("/auth/refresh");
      logger.log('✅ Token rafraîchi avec succès');
      return response.data;
    } catch (error: any) {
      logger.error('❌ Erreur de rafraîchissement du token:', error.message);
      throw new Error(`Erreur de rafraîchissement: ${error.message}`);
    }
  }

  async checkCNEPCStatus(): Promise<{ isOnline: boolean; lastCheck: string }> {
    try {
      logger.log('🔍 Vérification du statut CNEPC...');
      const response = await axiosClient.get("/cnepc/status");
      logger.log('✅ Statut CNEPC:', response.data);
      return response.data;
    } catch (error: any) {
      logger.error('❌ Erreur vérification CNEPC:', error.message);
      throw new Error(`Erreur de vérification CNEPC: ${error.message}`);
    }
  }

  async updateProfile(update: Person): Promise<any> {
    try {
      const response = await axiosClient.put("/auth/update-profile", update);
      return response.data;
    } catch (e) {
      logger.error('Erreur mise à jour profil:', e);
      throw e;
    }
  }
  
  async changePassword(changePassword: ChangePasswordForm): Promise<any> {
    try {
      const response = await axiosClient.post("/auth/change-password", changePassword);
      return response.data;
    } catch (e) {
      logger.error('Erreur changement mot de passe:', e);
      throw e;
    }
  }

  async forgotPassword(email: FormDataEmail): Promise<any> {
    try {
      const response = await axiosClient.post("/auth/forgot-password", email);
      return response.data;
    } catch (e) {
      logger.error('Erreur mot de passe oublié:', e);
      throw e;
    }
  }

  async resetPassword(resetpassword: ResetPasswordFormData): Promise<any> {
    try {
      const response = await axiosClient.post("/auth/reset-password", resetpassword);
      return response.data;
    } catch (e) {
      logger.error('Erreur réinitialisation mot de passe:', e);
      throw e;
    }
  }

  async getCurrentUser(token: string): Promise<any> {
    try {
      logger.log('🔍 Vérification du rôle utilisateur via /auth/me...');
      
      const response = await axiosClient.get("/auth/me", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      logger.log('✅ Informations utilisateur récupérées avec succès');
      
      return response.data;
    } catch (error: any) {
      logger.error('❌ ERREUR LORS DE LA VÉRIFICATION DU RÔLE');
      logger.error('Message:', error.message);
      
      if (error.response) {
        logger.error('Statut HTTP:', error.response.status);
        logger.error('Données:', error.response.data);
      }
      
      throw new Error(`Erreur lors de la vérification du rôle: ${error.message}`);
    }
  }

  async getAllAutoEcoles(token: string): Promise<AutoEcoleListApiResponse> {
    try {
      logger.log('🏫 Récupération de toutes les auto-écoles...');
      
      const response = await axiosClient.get("/auto-ecoles", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      logger.log('✅ Liste des auto-écoles récupérée avec succès');
      
      return response.data;
    } catch (error: any) {
      logger.error('❌ ERREUR LORS DE LA RÉCUPÉRATION DES AUTO-ÉCOLES');
      logger.error('Message:', error.message);
      
      if (error.response) {
        logger.error('Statut HTTP:', error.response.status);
        logger.error('Données:', error.response.data);
      }
      
      throw new Error(`Erreur lors de la récupération des auto-écoles: ${error.message}`);
    }
  }

  async getAutoEcoleById(id: string, token: string): Promise<AutoEcoleDetailResponse> {
    try {
      logger.log(`🏫 Récupération des détails de l'auto-école ID: ${id}...`);
      
      const response = await axiosClient.get(`/auto-ecoles/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      logger.log('✅ Détails de l\'auto-école récupérés avec succès');
      
      return response.data;
    } catch (error: any) {
      logger.error('❌ ERREUR LORS DE LA RÉCUPÉRATION DES DÉTAILS AUTO-ÉCOLE');
      logger.error('Message:', error.message);
      
      if (error.response) {
        logger.error('Statut HTTP:', error.response.status);
        logger.error('Données:', error.response.data);
      }
      
      throw new Error(`Erreur lors de la récupération des détails auto-école: ${error.message}`);
    }
  }

  async findAutoEcoleByResponsableId(responsableId: string, token: string): Promise<AutoEcoleDetailResponse | null> {
    try {
      logger.log(`🔍 Recherche de l'auto-école pour le responsable ID: ${responsableId}...`);
      
      // Récupérer toutes les auto-écoles
      const autoEcolesResponse = await this.getAllAutoEcoles(token);
      
      // Chercher l'auto-école correspondant au responsable
      const autoEcole = autoEcolesResponse.data.find(ae => ae.responsable_id === responsableId);
      
      if (!autoEcole) {
        logger.warn('⚠️ Aucune auto-école trouvée pour ce responsable');
        return null;
      }
      
      logger.log(`✅ Auto-école trouvée: ${autoEcole.nom_auto_ecole} (ID: ${autoEcole.id})`);
      
      // Récupérer les détails complets de l'auto-école
      return await this.getAutoEcoleById(autoEcole.id, token);
      
    } catch (error: any) {
      logger.error('❌ ERREUR LORS DE LA RECHERCHE AUTO-ÉCOLE PAR RESPONSABLE');
      logger.error('Message:', error.message);
      
      if (error.response) {
        logger.error('Statut HTTP:', error.response.status);
        logger.error('Données:', error.response.data);
      }
      
      throw new Error(`Erreur lors de la recherche auto-école par responsable: ${error.message}`);
    }
  }
}

export const authService = new AuthService();

// Version API future (préparée mais commentée)
// import { apiClient } from '../../../shared/utils/axiosConfig';
// import { API_ENDPOINTS } from '../../../shared/constants/api';

// export class AuthService {
//   async login(credentials: LoginRequest): Promise<AuthResponse> {
//     try {
//       const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
//       return response.data;
//     } catch (error: any) {
//       throw new Error(`Erreur de connexion: ${error.response?.data?.message || error.message}`);
//     }
//   }
//   // ... autres méthodes API
// }