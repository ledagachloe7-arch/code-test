/**
 * Service pour envoyer un ou plusieurs dossiers à la CNEDDT (biométrie).
 * Réutilise la même logique que useCNEDDTTransfer / EtapeAccordion "Finaliser le dossier".
 */
import axiosClient from '../../../shared/utils/axiosConfig';
import { CircuitSuivi, circuitSuiviService } from './circuit-suivi.service';

export class SendToCNEDDTError extends Error {
  constructor(
    message: string,
    public dossierId?: string,
    public cause?: unknown,
    /** Instantané aplati du dossier (diagnostic transfert non éligible, etc.). */
    public dossierSnapshot?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SendToCNEDDTError';
  }
}

const FK_FOR_REL_NAME: Record<string, string> = {
  candidat: 'candidat_id',
  auto_ecole: 'auto_ecole_id',
  formation: 'formation_id',
  type_demande: 'type_demande_id',
  province: 'province_id',
  centre: 'centre_id',
  referentiel: 'referenciel_id',
  referenciel: 'referentiel_id',
};

function fkColumnForRelationshipName(relName: string): string {
  return FK_FOR_REL_NAME[relName] ?? `${relName}_id`;
}

function hydrateFromJsonApiRelationships(target: Record<string, unknown>, relationships: unknown): void {
  if (relationships == null || typeof relationships !== 'object' || Array.isArray(relationships)) return;
  for (const [relName, relDesc] of Object.entries(relationships as Record<string, unknown>)) {
    const payload =
      relDesc && typeof relDesc === 'object' && !Array.isArray(relDesc)
        ? ((relDesc as Record<string, unknown>).data ?? null)
        : null;
    if (payload != null && typeof payload === 'object' && !Array.isArray(payload)) {
      const id = (payload as Record<string, unknown>).id;
      if (id == null || id === '') continue;
      const col = fkColumnForRelationshipName(relName);
      if (target[col] == null || String(target[col]).trim() === '') target[col] = id;
      if (
        (relName === 'referentiel' || relName === 'referenciel') &&
        (target.referenciel_id == null || String(target.referenciel_id).trim() === '')
      ) {
        target.referenciel_id = id;
        target.referentiel_id = id;
      }
    }
    if (Array.isArray(payload) && payload.length > 0) {
      const first = payload[0];
      if (first != null && typeof first === 'object' && !Array.isArray(first)) {
        const id = (first as Record<string, unknown>).id;
        if (id != null && id !== '') {
          const col = fkColumnForRelationshipName(relName);
          if (target[col] == null || String(target[col]).trim() === '') target[col] = id;
        }
      }
    }
  }
}

/** Extrait `{ data }` / premier élément / objet brut. */
function normalizeDossierNode(input: unknown): Record<string, unknown> | null {
  if (input == null || typeof input !== 'object') return null;
  const root = input as Record<string, unknown>;
  let node: unknown = Object.prototype.hasOwnProperty.call(root, 'data') ? root.data : root;
  if (Array.isArray(node)) node = node[0];
  if (node == null || typeof node !== 'object' || Array.isArray(node)) return null;
  return node as Record<string, unknown>;
}

/**
 * Réponse Laravel plate ou JSON:API → cliché dossier aplati (+ relations imbriquées conservées pour enrichissements futurs).
 * Utilisé par `fetchDossierForEdition`, le diagnostic transfert NouvelleDemandeePage, etc.
 */
export function buildDossierTransfertEligibilitySnapshot(input: unknown): Record<string, unknown> {
  const node = normalizeDossierNode(input);
  if (!node) return {};

  const attrs = node.attributes;
  let snapshot: Record<string, unknown>;
  if (attrs != null && typeof attrs === 'object' && !Array.isArray(attrs)) {
    snapshot = { ...(attrs as Record<string, unknown>) };
    if (node.id != null) snapshot.id = node.id;
    hydrateFromJsonApiRelationships(snapshot, node.relationships);
    // garder quelques blobs utiles depuis la racine si l’API les met à côté des attributes
    for (const k of ['candidat', 'formation', 'auto_ecole', 'type_demande', 'province', 'centre', 'referentiel', 'referenciel']) {
      if (node[k] != null && snapshot[k] == null) snapshot[k] = node[k];
    }
    if (node.data_categorie != null && snapshot.data_categorie == null) snapshot.data_categorie = node.data_categorie;
  } else {
    snapshot = { ...node };
  }

  const setFkFromNested = (nestedKey: string, fkKeys: string[]) => {
    const nested = snapshot[nestedKey];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return;
    const id = String((nested as Record<string, unknown>).id ?? '').trim();
    if (!id) return;
    for (const fk of fkKeys) {
      if (snapshot[fk] == null || String(snapshot[fk]).trim() === '') snapshot[fk] = id;
    }
  };

  setFkFromNested('candidat', ['candidat_id']);
  setFkFromNested('auto_ecole', ['auto_ecole_id']);
  setFkFromNested('formation', ['formation_id']);
  setFkFromNested('type_demande', ['type_demande_id']);
  setFkFromNested('province', ['province_id']);
  setFkFromNested('centre', ['centre_id']);
  setFkFromNested('referentiel', ['referenciel_id', 'referentiel_id']);
  setFkFromNested('referenciel', ['referenciel_id', 'referentiel_id']);

  const numPerm = snapshot.numero_permis ?? snapshot.numeroPermis;
  const numOrig = snapshot.numero_origine_permis ?? snapshot.numeroOriginePermis;
  if (numPerm != null && snapshot.numero_permis == null) snapshot.numero_permis = String(numPerm).trim();
  if (numOrig != null && snapshot.numero_origine_permis == null)
    snapshot.numero_origine_permis = String(numOrig).trim();

  return snapshot;
}

export interface SendToCNEDDTResult {
  /** Code caisse / dossier renvoyé par la CNEDDT (`data.cashier_short_code`), vide si absent. */
  shortCode: string;
  alreadyExistsAtBiometrie: boolean;
}

/** Lit `results[0].result.data` de l'enveloppe POST /dossiers/transfert (mode 1 dossier). */
function extractTransfertResult(body: any): { shortCode: string; message: string } {
  const cneddt = body?.results?.[0]?.result?.data;
  const inner = cneddt?.data;
  const shortCode = String(
    inner?.cashier_short_code ?? inner?.cashierShortCode ?? inner?.shortcode ?? cneddt?.cashier_short_code ?? cneddt?.shortcode ?? ''
  ).trim();
  return { shortCode, message: String(cneddt?.message ?? '') };
}

/**
 * Envoie un dossier à la CNEDDT (biométrie).
 * Lance SendToCNEDDTError en cas d'échec.
 */
export async function sendDossierToCNEDDT(
  dossierId: string,
  circuit?: CircuitSuivi | null,
  typeDemandeIdFallback?: string
): Promise<SendToCNEDDTResult> {
  let dossierData: any = null;
  let payload: any = null;

  try {
    const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`, {
      params: { include: 'auto_ecole,formation,formation.typePermis,formation.auto_ecole,candidat.personne' },
    });
    dossierData = dossierResponse.data?.data || dossierResponse.data;

    const typeDemandeId = dossierData?.type_demande_id || typeDemandeIdFallback;
    if (!typeDemandeId) {
      throw new SendToCNEDDTError(
        'Le type de demande est manquant. Impossible d\'envoyer le dossier à la CNEDDT.',
        dossierId
      );
    }

    const personne = dossierData?.candidat?.personne;
    const finalCandidatEmail = personne?.email || null;

    payload = {
      dossier_id: dossierId,
      type_demande_id: typeDemandeId,
    };
    if (finalCandidatEmail) {
      payload.personne_email = finalCandidatEmail;
      payload.candidat_email = finalCandidatEmail;
      payload.email = finalCandidatEmail;
    }

    const rawNumeroPermis = (dossierData?.numero_permis ?? (dossierData as any)?.numeroPermis ?? '').toString().trim();
    const rawNumeroOrigine = (dossierData?.numero_origine_permis ?? (dossierData as any)?.numeroOriginePermis ?? '').toString().trim();
    const numeroToUse = rawNumeroPermis || rawNumeroOrigine;
    if (numeroToUse) {
      payload.numero_driving_license = numeroToUse;
    }

    const response = await axiosClient.post('/dossiers/transfert', payload, { timeout: 60000 });

    if (response.data?.success === false) {
      throw new SendToCNEDDTError(
        response.data?.message || 'Erreur lors de l\'envoi à la CNEDDT',
        dossierId
      );
    }

    try {
      await circuitSuiviService.updateDossierStatut(dossierId, 'DOSSIER ENVOYER', { asStatutId: false });
    } catch (err) {
      console.warn('⚠️ Mise à jour du statut dossier après envoi CNEDDT:', err);
    }

    try {
      localStorage.setItem(`cneddt_sent_${dossierId}`, 'true');
    } catch {
      // ignore
    }

    const { shortCode, message } = extractTransfertResult(response.data);
    return {
      shortCode,
      alreadyExistsAtBiometrie: /existe\s+d[ée]j[àa]|already\s+exists/i.test(message),
    };
  } catch (err: any) {
    if (err instanceof SendToCNEDDTError) throw err;
    const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Erreur lors de l\'envoi à la CNEDDT';
    throw new SendToCNEDDTError(msg, dossierId, err);
  }
}
