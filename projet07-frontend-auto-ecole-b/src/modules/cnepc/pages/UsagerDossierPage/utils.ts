import { Dossier, Referentiel } from '../../types/auto-ecole';
import { TypeDemande } from '../../types/type-demande';

export const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'valide':
      return 'success';
    case 'en_cours':
      return 'info';
    case 'rejete':
      return 'error';
    case 'transmis':
    case 'Cnepc':
      return 'secondary';
    default:
      return 'warning';
  }
};

export const getStatutLabel = (statut: string) => {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    valide: 'Validé',
    rejete: 'Rejeté',
    transmis: 'Envoyé au CNEDDT', // Statut pour les dossiers prêts à être envoyés au CNEDDT
    Cnepc: 'CNEPC',
  };
  return labels[statut] || statut;
};

export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getTypePermisLabel = (
  d: Dossier,
  referentielsCache: Map<string, Referentiel>
): string => {
  const referencielId = (d as any).referenciel_id;
  
  // 1. Priorité absolue : referenciel_id à la racine du dossier
  if (referencielId) {
    // D'abord vérifier si l'objet référentiel est directement dans le dossier
    if (d.referentiel) {
      if (d.referentiel.libelle) {
        return d.referentiel.libelle;
      }
      if (d.referentiel.code) {
        return d.referentiel.code;
      }
    }
    
    // Sinon, vérifier le cache des référentiels
    const cachedReferentiel = referentielsCache.get(referencielId);
    if (cachedReferentiel) {
      if (cachedReferentiel.libelle) {
        return cachedReferentiel.libelle;
      }
      if (cachedReferentiel.code) {
        return cachedReferentiel.code;
      }
    }
  }
  
  // 2. Fallback : vérifier dans la formation (pour compatibilité)
  const formation = d.formation;
  if (formation) {
    // Vérifier type_permis (snake_case) - format principal selon l'API
    if (formation.type_permis) {
      if (typeof formation.type_permis === 'string') {
        return formation.type_permis;
      }
      // Type guard : vérifier si c'est un Referentiel (a libelle et code)
      if ('libelle' in formation.type_permis) {
        return formation.type_permis.libelle;
      }
      // Type guard : vérifier si c'est un TypePermis (a nom)
      if ('nom' in formation.type_permis) {
        return formation.type_permis.nom;
      }
    }
    
    // Vérifier typePermis (camelCase) - format alternatif
    if (formation.typePermis) {
      if (typeof formation.typePermis === 'string') {
        return formation.typePermis;
      }
      // Type guard : vérifier si c'est un Referentiel (a libelle et code)
      if ('libelle' in formation.typePermis) {
        return formation.typePermis.libelle;
      }
      // Type guard : vérifier si c'est un TypePermis (a nom)
      if ('nom' in formation.typePermis) {
        return formation.typePermis.nom;
      }
    }
  }
  
  return 'N/A';
};

export const getTypeDemandeName = (
  d: Dossier,
  typeDemandeCache: Map<string, TypeDemande>
): string => {
  // Priorité 1: type_demande directement dans le dossier
  if (d.type_demande?.name) {
    return d.type_demande.name;
  }
  // Priorité 2: cache des types de demande
  if (d.type_demande_id) {
    const cachedTypeDemande = typeDemandeCache.get(d.type_demande_id);
    if (cachedTypeDemande?.name) {
      return cachedTypeDemande.name;
    }
  }
  // Fallback: ID ou N/A
  return d.type_demande_id || 'N/A';
};

/** Libellé d'affichage pour le type de demande (ex. FICHEENREGISTREMENT → FICHE D'ENREGISTREMENT, NOUVEAUPERMIS → NOUVEAU PERMIS) */
export const getTypeDemandeDisplayName = (name: string | undefined | null): string => {
  if (!name) return 'N/A';
  if (name === 'FICHEENREGISTREMENT') return "FICHE D'ENREGISTREMENT";
  if (name === 'NOUVEAUPERMIS') return 'NOUVEAU PERMIS';
  return name;
};

