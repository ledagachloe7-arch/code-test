import type { NavigateFunction } from 'react-router-dom';
import axiosClient from '../../../shared/utils/axiosConfig';
import { ROUTES } from '../../../shared/constants';

/**
 * Verrouille le dossier côté API puis ouvre l’écran de traitement réception (circuit),
 * comme depuis la liste réception.
 */
export async function openDossierAndGoToTraitementCircuit(
  navigate: NavigateFunction,
  dossierId: string,
  options?: { code_paiement?: string | null }
): Promise<void> {
  await axiosClient.post(`/dossiers/${dossierId}/open`);
  const code = options?.code_paiement?.trim();
  navigate(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT.replace(':id', dossierId), {
    state: {
      openToNextStep: true,
      ...(code ? { code_paiement: code } : {}),
    },
  });
}
