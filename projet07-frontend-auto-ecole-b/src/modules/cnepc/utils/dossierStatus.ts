import { CircuitSuivi, EtapeCircuit, circuitSuiviService } from '../../reception/services/circuit-suivi.service';
import { Dossier } from '../types/auto-ecole';
import { TypeDemande } from '../types/type-demande';

/**
 * Calcule le statut du dossier basé sur les étapes du circuit
 * Suit la même logique que CircuitEtapesCard.tsx
 */
export const calculateDossierStatusFromCircuit = async (
  dossier: Dossier,
  typeDemande?: TypeDemande | null
): Promise<string> => {
  try {
    // Récupérer le nom_entite depuis le type de demande (utiliser le name comme nom_entite)
    const nomEntite = typeDemande?.name || dossier.type_demande?.name;
    
    if (!nomEntite) {
      // Si pas de nom_entite, retourner le statut actuel du dossier
      return dossier.statut || 'en_attente';
    }

    // Récupérer le circuit
    const circuit = await circuitSuiviService.getCircuitByNomEntite(nomEntite);
    
    if (!circuit || !circuit.etapes || circuit.etapes.length === 0) {
      // Si pas de circuit ou d'étapes, retourner le statut actuel
      return dossier.statut || 'en_attente';
    }

    // Compter les étapes complétées (basé sur statut_libelle)
    const completedEtapes = circuit.etapes.filter(etape => {
      if (!etape.statut_libelle) return false;
      const statutLower = etape.statut_libelle.toLowerCase();
      return (
        statutLower.includes('complété') ||
        statutLower.includes('complete') ||
        statutLower.includes('terminé') ||
        statutLower.includes('termine')
      );
    });

    const totalEtapes = circuit.etapes.length;
    const completedCount = completedEtapes.length;

    // Si toutes les étapes sont complétées
    if (completedCount === totalEtapes && totalEtapes > 0) {
      return 'valide'; // ou 'transmis' selon votre logique métier
    }

    // Si certaines étapes sont complétées
    if (completedCount > 0) {
      return 'en_cours';
    }

    // Si aucune étape n'est complétée
    return 'en_attente';
  } catch (error) {
    console.error('Erreur lors du calcul du statut du dossier:', error);
    // En cas d'erreur, retourner le statut actuel du dossier
    return dossier.statut || 'en_attente';
  }
};

/**
 * Calcule le statut du dossier de manière synchrone si le circuit est déjà chargé
 */
export const calculateDossierStatusFromCircuitSync = (
  circuit: CircuitSuivi | null,
  dossierStatut?: string
): string => {
  try {
    if (!circuit || !circuit.etapes || circuit.etapes.length === 0) {
      return dossierStatut || 'en_attente';
    }

    // Compter les étapes complétées (basé sur statut_libelle)
    const completedEtapes = circuit.etapes.filter(etape => {
      if (!etape.statut_libelle) return false;
      const statutLower = etape.statut_libelle.toLowerCase();
      return (
        statutLower.includes('complété') ||
        statutLower.includes('complete') ||
        statutLower.includes('terminé') ||
        statutLower.includes('termine')
      );
    });

    const totalEtapes = circuit.etapes.length;
    const completedCount = completedEtapes.length;

    // Si toutes les étapes sont complétées
    if (completedCount === totalEtapes && totalEtapes > 0) {
      return 'valide';
    }

    // Si certaines étapes sont complétées
    if (completedCount > 0) {
      return 'en_cours';
    }

    // Si aucune étape n'est complétée
    return 'en_attente';
  } catch (error) {
    console.error('Erreur lors du calcul du statut du dossier:', error);
    return dossierStatut || 'en_attente';
  }
};

