import { EpreuveStatut } from '../../types';
import { CheckCircle, Timeline, Pending, Block } from '@mui/icons-material';

// Helpers for ReceptionDossierTypeTable component

export const getStatutEpreuveInfo = (statut: EpreuveStatut | undefined) => {
  switch (statut) {
    case 'reussi':
      return { label: 'Validé', color: 'success' as const };
    case 'echoue':
      return { label: 'Échoué', color: 'error' as const };
    case 'absent':
      return { label: 'Absent', color: 'warning' as const };
    case 'non_saisi':
    default:
      return { label: 'Non saisi', color: 'default' as const };
  }
};

export const getSuiviIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle color="success" />;
    case 'in_progress':
      return <Timeline color="primary" />;
    case 'blocked':
      return <Block color="error" />;
    default:
      return <Pending color="warning" />;
  }
};

export const getSuiviColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'primary';
    case 'blocked':
      return 'error';
    default:
      return 'warning';
  }
};

export const isNouveauPermisType = (
  typeDemandeName: string,
  suiviMap: Map<string, any>
): boolean => {
  // D'abord, essayer d'utiliser le circuit du suivi (plus fiable)
  if (suiviMap.size > 0) {
    const firstSuivi = Array.from(suiviMap.values())[0];
    if (firstSuivi?.circuit?.nom_entite) {
      const nomEntite = firstSuivi.circuit.nom_entite.toUpperCase();
      return nomEntite.includes('NOUVEAU PERMIS') || nomEntite === 'PERMIS_CONDUIRE';
    }
  }
  // Fallback: utiliser typeDemandeName
  const typeName = (typeDemandeName || '').toUpperCase();
  return typeName.includes('NOUVEAU PERMIS') || typeName === 'PERMIS_CONDUIRE' || typeName.includes('PERMIS');
};

