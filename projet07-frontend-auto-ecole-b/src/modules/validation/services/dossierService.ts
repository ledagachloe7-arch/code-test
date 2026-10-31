// Service pour la gestion des dossiers complétés et des heures de cours
import { EleveValide } from '../../eleves/services/validationService';

export interface DossierComplet {
  id: string;
  eleve: EleveValide;
  dateCompletion: string;
  statut: 'en_cours' | 'complet' | 'envoye_cnepc';
  documentsCours: DocumentCours[];
  heuresTheoriques: HeureCours[];
  heuresPratiques: HeureCours[];
  dateCreation: string;
  dateModification: string;
}

export interface DocumentCours {
  id: string;
  nom: string;
  type: 'theorique' | 'pratique' | 'examen' | 'certificat';
  taille: string;
  dateUpload: string;
  url?: string;
  file?: File;
  isGenerated: boolean; // true si généré par formulaire, false si uploadé
  pdfUrl?: string; // URL du PDF généré pour les documents générés
}

export interface HeureCours {
  id: string;
  type: 'theorique' | 'pratique';
  date: string;
  duree: number; // en minutes
  instructeur: string;
  vehicule?: string; // pour les cours pratiques
  observations?: string;
  statut: 'planifie' | 'effectue' | 'annule';
}

// Mock data pour les dossiers complétés
const mockDossiersComplets: DossierComplet[] = [];

// Fonction pour persister les données (simulation localStorage)
const persistDossiers = () => {
  try {
    localStorage.setItem('dossiers_complets', JSON.stringify(mockDossiersComplets));
  } catch (error) {
    console.warn('Impossible de sauvegarder les dossiers:', error);
  }
};

// Fonction pour charger les données depuis localStorage
const loadDossiers = () => {
  try {
    const saved = localStorage.getItem('dossiers_complets');
    if (saved) {
      const parsed = JSON.parse(saved);
      mockDossiersComplets.length = 0; // Vider le tableau
      mockDossiersComplets.push(...parsed); // Ajouter les données sauvegardées
    }
  } catch (error) {
    console.warn('Impossible de charger les dossiers:', error);
  }
};

// Charger les données au démarrage
loadDossiers();

class DossierService {
  // Récupérer tous les dossiers complétés
  async getDossiersComplets(): Promise<DossierComplet[]> {
    try {
      return [...mockDossiersComplets];
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des dossiers: ${error.message}`);
    }
  }

  // Récupérer un dossier par ID
  async getDossierById(id: string): Promise<DossierComplet> {
    try {
      const dossier = mockDossiersComplets.find(d => d.id === id);
      if (!dossier) {
        throw new Error('Dossier non trouvé');
      }
      return dossier;
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération du dossier: ${error.message}`);
    }
  }

  // Créer un nouveau dossier complet à partir d'un élève validé
  async creerDossierComplet(eleve: EleveValide): Promise<DossierComplet> {
    try {
      const nouveauDossier: DossierComplet = {
        id: `dossier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eleve,
        dateCompletion: new Date().toISOString(),
        statut: 'en_cours',
        documentsCours: [],
        heuresTheoriques: [],
        heuresPratiques: [],
        dateCreation: new Date().toISOString(),
        dateModification: new Date().toISOString()
      };

      mockDossiersComplets.push(nouveauDossier);
      persistDossiers(); // Sauvegarder après ajout
      return nouveauDossier;
    } catch (error: any) {
      throw new Error(`Erreur lors de la création du dossier: ${error.message}`);
    }
  }

  // Ajouter un document de cours
  async ajouterDocumentCours(dossierId: string, document: Omit<DocumentCours, 'id' | 'dateUpload'>): Promise<DocumentCours> {
    try {
      const dossier = await this.getDossierById(dossierId);
      const nouveauDocument: DocumentCours = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dateUpload: new Date().toISOString(),
        ...document
      };

      dossier.documentsCours.push(nouveauDocument);
      dossier.dateModification = new Date().toISOString();
      persistDossiers(); // Sauvegarder après modification
      
      return nouveauDocument;
    } catch (error: any) {
      throw new Error(`Erreur lors de l'ajout du document: ${error.message}`);
    }
  }

  // Ajouter une heure de cours
  async ajouterHeureCours(dossierId: string, heure: Omit<HeureCours, 'id'>): Promise<HeureCours> {
    try {
      const dossier = await this.getDossierById(dossierId);
      const nouvelleHeure: HeureCours = {
        id: `heure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...heure
      };

      if (heure.type === 'theorique') {
        dossier.heuresTheoriques.push(nouvelleHeure);
      } else {
        dossier.heuresPratiques.push(nouvelleHeure);
      }
      
      dossier.dateModification = new Date().toISOString();
      persistDossiers(); // Sauvegarder après modification
      return nouvelleHeure;
    } catch (error: any) {
      throw new Error(`Erreur lors de l'ajout de l'heure de cours: ${error.message}`);
    }
  }

  // Mettre à jour le statut du dossier
  async mettreAJourStatut(dossierId: string, statut: DossierComplet['statut']): Promise<DossierComplet> {
    try {
      const dossier = await this.getDossierById(dossierId);
      dossier.statut = statut;
      dossier.dateModification = new Date().toISOString();
      persistDossiers(); // Sauvegarder après modification
      return dossier;
    } catch (error: any) {
      throw new Error(`Erreur lors de la mise à jour du statut: ${error.message}`);
    }
  }

  // Supprimer un document
  async supprimerDocument(dossierId: string, documentId: string): Promise<void> {
    try {
      const dossier = await this.getDossierById(dossierId);
      dossier.documentsCours = dossier.documentsCours.filter(doc => doc.id !== documentId);
      dossier.dateModification = new Date().toISOString();
      persistDossiers(); // Sauvegarder après modification
    } catch (error: any) {
      throw new Error(`Erreur lors de la suppression du document: ${error.message}`);
    }
  }

  // Supprimer une heure de cours
  async supprimerHeureCours(dossierId: string, heureId: string): Promise<void> {
    try {
      const dossier = await this.getDossierById(dossierId);
      dossier.heuresTheoriques = dossier.heuresTheoriques.filter(h => h.id !== heureId);
      dossier.heuresPratiques = dossier.heuresPratiques.filter(h => h.id !== heureId);
      dossier.dateModification = new Date().toISOString();
      persistDossiers(); // Sauvegarder après modification
    } catch (error: any) {
      throw new Error(`Erreur lors de la suppression de l'heure de cours: ${error.message}`);
    }
  }

  // Obtenir les statistiques des dossiers
  async getStatistiques(): Promise<{
    total: number;
    enCours: number;
    complets: number;
    envoyesCnepc: number;
  }> {
    try {
      const dossiers = await this.getDossiersComplets();
      return {
        total: dossiers.length,
        enCours: dossiers.filter(d => d.statut === 'en_cours').length,
        complets: dossiers.filter(d => d.statut === 'complet').length,
        envoyesCnepc: dossiers.filter(d => d.statut === 'envoye_cnepc').length
      };
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }
}

export default new DossierService();
