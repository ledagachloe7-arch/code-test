/**
 * Service pour la todo list réception : dossiers groupés par type et par étape.
 */
import { API_CONFIG } from '../../../shared/constants/api';
import { autoEcoleService } from '../../cnepc/services/auto-ecole.service';
import type { DossierTodoItem } from '../types';

const DASHBOARD_REQUEST_CONFIG = { timeout: API_CONFIG.DASHBOARD_TIMEOUT };

function getCandidatLabel(d: { candidat?: { personne?: { nom?: string; prenom?: string }; numero_candidat?: string } }): string {
  const p = d.candidat?.personne;
  if (p?.nom || p?.prenom) {
    return [p.prenom, p.nom].filter(Boolean).join(' ').trim() || '—';
  }
  if (d.candidat?.numero_candidat) return `N° ${d.candidat.numero_candidat}`;
  return '—';
}

function formatTypeDemandeName(name: string | undefined): string {
  if (!name?.trim()) return 'Non renseigné';
  const upper = name.toUpperCase().replace(/\s+/g, '');
  if (upper === 'NOUVEAUPERMIS') return 'Nouveau permis';
  if (upper === 'FICHEENREGISTRMENT' || upper === 'FICHEENREGISTREMENT') return 'Fiche enregistrement';
  return name.trim();
}

/**
 * Récupère les dossiers pour la todo list (admin : toutes les auto-écoles).
 * Un seul passage sur les auto-écoles pour limiter les appels.
 */
export async function getDossiersForTodoAdmin(maxAutoEcoles: number = 30): Promise<DossierTodoItem[]> {
  const listResponse = await autoEcoleService.getAutoEcoles(1, maxAutoEcoles, undefined, DASHBOARD_REQUEST_CONFIG);
  const autoEcoles = listResponse?.data ?? [];
  if (autoEcoles.length === 0) return [];

  const results: DossierTodoItem[] = [];
  await Promise.all(
    autoEcoles.map(async (ae: { id: string; nom_auto_ecole?: string }) => {
      try {
        const res = await autoEcoleService.getDossiersByAutoEcoleId(ae.id, undefined, DASHBOARD_REQUEST_CONFIG);
        const dossiers = res?.dossiers ?? [];
        const nom = ae.nom_auto_ecole ?? ae.id;
        for (const d of dossiers) {
          const statut = (d.statut ?? '').toString().trim();
          const typeName = (d as { type_demande?: { name?: string } }).type_demande?.name;
          results.push({
            id: (d as { id?: string }).id ?? '',
            statut,
            typeDemandeName: formatTypeDemandeName(typeName),
            candidatLabel: getCandidatLabel(d as any),
            autoEcoleNom: nom,
          });
        }
      } catch {
        // ignore
      }
    })
  );
  return results.filter((item) => item.id);
}
