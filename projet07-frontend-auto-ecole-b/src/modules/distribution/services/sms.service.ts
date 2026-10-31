import axiosClient from '../../../shared/utils/axiosConfig';
import type { SmsPayload, SmsResponse } from '../types';
import { SMS_MAX_LENGTH } from '../types';

/** Extrait un message lisible depuis une réponse d'erreur Axios (422, 400…). */
function extractApiErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return "Erreur lors de l'envoi du SMS.";
  const axiosErr = err as { response?: { data?: unknown; status?: number } };
  const data = axiosErr.response?.data;
  const status = axiosErr.response?.status;

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;

    // Laravel / standard: { errors: { field: [msg, ...] } }
    if (d.errors && typeof d.errors === 'object') {
      const messages = Object.values(d.errors as Record<string, string[]>)
        .flat()
        .filter(Boolean);
      if (messages.length) return messages.join(' — ');
    }

    // { message: "..." }
    if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
  }

  if (err instanceof Error && err.message) return err.message;
  return `Erreur ${status ?? ''} lors de l'envoi du SMS.`.trim();
}

/**
 * Normalise un numéro gabonais vers le format international Airtel (+241XXXXXXXX).
 * - "077804665"   → "+24177804665"
 * - "0077804665"  → "+24177804665"
 * - "+24177804665"→ "+24177804665" (inchangé)
 * - "24177804665" → "+24177804665"
 */
export function normalizeGabonPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // Déjà en format international complet : 24177XXXXXXX (11 chiffres, commence par 241)
  if (digits.startsWith('241') && digits.length === 11) {
    return `+${digits}`;
  }

  // Format local : commence par 0 + 8 chiffres → retire le 0, ajoute +241
  if (digits.startsWith('0') && digits.length === 9) {
    return `+241${digits.slice(1)}`;
  }

  // Format local sans 0 : 8 chiffres (ex: 77804665)
  if (digits.length === 8) {
    return `+241${digits}`;
  }

  // Fallback : on renvoie avec + si absent
  return raw.startsWith('+') ? raw : `+${digits}`;
}

/**
 * Envoie un SMS via Airtel.
 * Endpoint public — aucune authentification requise.
 * Le message est limité à 160 caractères (contrainte Airtel).
 */
export async function sendSms(payload: SmsPayload): Promise<SmsResponse> {
  const message = payload.message.slice(0, SMS_MAX_LENGTH);
  const numero = normalizeGabonPhone(payload.numero.trim());

  try {
    const response = await axiosClient.post<SmsResponse>(
      '/public/sms',
      { numero, message },
      { headers: { 'X-Skip-Auth': '1' } },
    );

    // Le backend peut répondre 200 avec success:false
    const data = response.data;
    if (data && typeof data === 'object' && (data as { success?: boolean }).success === false) {
      const msg = (data as { message?: string }).message ?? "Échec de l'envoi du SMS.";
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    const raw = (err as { response?: { data?: unknown; status?: number } })?.response;
    if (raw !== undefined) {
      console.error('[SMS] status:', raw.status, '| réponse backend:', raw.data);
    }
    if (err instanceof Error) throw err;
    throw new Error(extractApiErrorMessage(err));
  }
}

/** Statut attendu par l'endpoint /notifier-carte-disponible */
export const STATUT_ENVOI_BIOMETRIE = 'DOSSIER ENVOYER';

/** Dossier retourné par /dossiers/envoi-biometrie */
export interface DossierBiometrie {
  id: string;
  candidat_id?: string;
  statut?: string;
  statut_libelle?: string;
  date_creation?: string;
  created_at?: string;
  commentaires?: string;
  type_demande?: { id: string; name: string };
  candidat?: {
    id?: string;
    numero_candidat?: string;
    personne?: {
      nom?: string;
      prenom?: string;
      contact?: string;
      email?: string;
    };
  };
  formation?: { id: string; type_permis?: { libelle?: string; code?: string } };
  auto_ecole?: { id: string; nom_auto_ecole?: string };
  [key: string]: unknown;
}

/** Récupère la liste des dossiers prêts pour envoi biométrie. */
export async function fetchDossiersBiometrie(): Promise<DossierBiometrie[]> {
  const response = await axiosClient.get<unknown>('/dossiers/envoi-biometrie');
  const raw = response.data as Record<string, unknown>;
  // Gère { data: [...] } ou directement un tableau
  if (Array.isArray(raw)) return raw as DossierBiometrie[];
  if (raw && Array.isArray(raw.data)) return raw.data as DossierBiometrie[];
  if (raw && Array.isArray(raw.dossiers)) return raw.dossiers as DossierBiometrie[];
  return [];
}

/** Erreur typée pour les échecs Airtel */
export class AirtelSmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AirtelSmsError';
  }
}

/**
 * Notifie un candidat que sa carte est disponible.
 * Endpoint : POST /dossiers/{id}/notifier-carte-disponible
 * Corps : vide — Auth : Bearer (géré par axiosClient).
 * Succès : statut du dossier passe à CARTE_DISPONIBLE_AU_CENTRE.
 * Échec Airtel : statut inchangé, backend renvoie success:false.
 */
export async function notifierCarteDisponible(dossierId: string, overridePhone?: string): Promise<void> {
  try {
    const body = overridePhone?.trim() ? { telephone: overridePhone.trim() } : undefined;
    const response = await axiosClient.post<unknown>(`/dossiers/${dossierId}/notifier-carte-disponible`, body);
    const data = response.data as Record<string, unknown> | null;
    if (data && typeof data === 'object' && data.success === false) {
      const msg = typeof data.message === 'string' ? data.message : 'Échec de la notification.';
      // Distinguer un échec Airtel d'un autre type d'erreur
      const isAirtelFailure =
        msg.toLowerCase().includes('sms') ||
        msg.toLowerCase().includes('airtel') ||
        msg.toLowerCase().includes('envoi') ||
        msg.toLowerCase().includes('échoué');
      if (isAirtelFailure) throw new AirtelSmsError(msg);
      throw new Error(msg);
    }
  } catch (err) {
    if (err instanceof AirtelSmsError) throw err;
    // Erreur HTTP (4xx/5xx)
    const axiosErr = err as { response?: { data?: Record<string, unknown>; status?: number } };
    const msg = axiosErr.response?.data?.message;
    if (typeof msg === 'string') {
      const isAirtelFailure =
        msg.toLowerCase().includes('sms') ||
        msg.toLowerCase().includes('airtel') ||
        msg.toLowerCase().includes('envoi') ||
        msg.toLowerCase().includes('échoué');
      if (isAirtelFailure) throw new AirtelSmsError(msg);
      throw new Error(msg);
    }
    throw err;
  }
}

export const smsService = { sendSms, fetchDossiersBiometrie, notifierCarteDisponible };
