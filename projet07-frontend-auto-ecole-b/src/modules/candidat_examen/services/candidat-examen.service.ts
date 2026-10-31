// Service pour la gestion des candidats aux examens
import { 
  CandidatExamen, 
  CandidatExamenFormData, 
  CandidatExamenFilters, 
  CandidatExamenResponse, 
  CandidatExamenListResponse,
  CandidatExamenStats 
} from '../types';
import axiosClient from '../../../shared/utils/axiosConfig';

// Fonction pour transformer les données de programme-sessions en CandidatExamen
// Prend en paramètre le programmeSession et le dossier complet (chargé séparément)
const transformProgrammeSessionToCandidatExamen = (programmeSession: any, dossierComplet?: any): CandidatExamen => {
  // Utiliser le dossier complet si fourni, sinon utiliser celui du programmeSession
  const dossier = dossierComplet || programmeSession.dossier || {};
  const candidat = dossier.candidat || {};
  const personne = candidat.personne || {};
  const autoEcole = dossier.auto_ecole || {};
  const formation = dossier.formation || {};
  const typePermis = formation.type_permis || {};

  return {
    id: programmeSession.id,
    candidat_id: candidat.id || '',
    session_examen_id: '', // À définir selon votre logique
    auto_ecole_id: autoEcole.id || '',
    formation_id: formation.id || '',
    statut: 'programme' as const,
    statut_libelle: 'Programmé',
    date_inscription: dossier.date_creation || dossier.created_at || new Date().toISOString(),
    date_examen: programmeSession.date_examen,
    commentaires: programmeSession.commentaires || '',
    candidat: {
      id: candidat.id || '',
      numero_candidat: candidat.numero_candidat || '',
      personne: {
        id: personne.id || '',
        nom: personne.nom || '',
        prenom: personne.prenom || '',
        nom_complet: personne.nom_complet || `${personne.prenom || ''} ${personne.nom || ''}`.trim(),
        email: personne.email || '',
        contact: personne.contact || '',
        adresse: personne.adresse || ''
      },
      date_naissance: candidat.date_naissance || '',
      lieu_naissance: candidat.lieu_naissance || '',
      nationalite: candidat.nationalite || '',
      genre: candidat.genre || 'M',
      nip: candidat.nip || '',
      type_piece: candidat.type_piece || '',
      numero_piece: candidat.numero_piece || ''
    },
    session_examen: {
      id: '',
      nom: `Session ${new Date(programmeSession.date_examen).toLocaleDateString('fr-FR')}`,
      description: '',
      type_permis_id: typePermis.id || '',
      type_permis: {
        id: typePermis.id || '',
        libelle: typePermis.libelle || '',
        code: typePermis.code || '',
        categorie: typePermis.categorie || '',
        description: typePermis.description || ''
      },
      date_debut: programmeSession.date_examen,
      date_fin: programmeSession.date_examen,
      statut: 'ouverte',
      statut_libelle: 'Ouverte',
      capacite_maximale: 0,
      capacite_utilisee: 0,
      lieu: '',
      adresse: '',
      responsable_id: '',
      responsable: {
        id: '',
        nom: '',
        prenom: '',
        nom_complet: '',
        email: '',
        contact: '',
        fonction: ''
      },
      epreuves: [],
      candidats: [],
      created_at: programmeSession.created_at || new Date().toISOString(),
      updated_at: programmeSession.updated_at || new Date().toISOString()
    },
    auto_ecole: {
      id: autoEcole.id || '',
      nom_auto_ecole: autoEcole.nom_auto_ecole || '',
      adresse: autoEcole.adresse || '',
      email: autoEcole.email || '',
      contact: autoEcole.contact || ''
    },
    formation: {
      id: formation.id || '',
      nom: formation.nom || '',
      description: formation.description || '',
      type_permis: {
        id: typePermis.id || '',
        libelle: typePermis.libelle || '',
        code: typePermis.code || ''
      },
      montant: formation.montant || 0,
      montant_formate: formation.montant_formate || `${formation.montant || 0} FCFA`
    },
    epreuves: [],
    created_at: programmeSession.created_at || new Date().toISOString(),
    updated_at: programmeSession.updated_at || new Date().toISOString()
  };
};

// Service pour la gestion des candidats aux examens
export class CandidatExamenService {
  // Récupérer la liste des candidats aux examens depuis l'API
  static async getCandidatsExamen(filters?: CandidatExamenFilters): Promise<CandidatExamenListResponse> {
    try {
      // Récupérer les programme-sessions depuis l'API
      const response = await axiosClient.get('/programme-sessions', {
        params: filters
      });

      let programmeSessions: any[] = [];
      
      // Gérer différentes structures de réponse
      if (response.data?.success && Array.isArray(response.data.data)) {
        programmeSessions = response.data.data;
      } else if (Array.isArray(response.data?.data)) {
        programmeSessions = response.data.data;
      } else if (Array.isArray(response.data)) {
        programmeSessions = response.data;
      } else if (response.data?.programme_sessions && Array.isArray(response.data.programme_sessions)) {
        programmeSessions = response.data.programme_sessions;
      }

      // Charger les dossiers complets pour chaque programme-session
      let candidats = await Promise.all(
        programmeSessions.map(async (programmeSession: any) => {
          // Récupérer le dossier_id depuis le programmeSession
          const dossierId = programmeSession.dossier_id || programmeSession.dossier?.id;
          
          if (!dossierId) {
            // Si pas de dossier_id, utiliser les données disponibles
            return transformProgrammeSessionToCandidatExamen(programmeSession);
          }

          try {
            // Charger le dossier complet avec toutes les relations
            const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`);
            const dossierComplet = dossierResponse.data?.data || dossierResponse.data;
            
            // Transformer avec le dossier complet
            return transformProgrammeSessionToCandidatExamen(programmeSession, dossierComplet);
          } catch (error: any) {
            console.warn(`⚠️ Impossible de charger le dossier ${dossierId} pour le programme session ${programmeSession.id}:`, error);
            // En cas d'erreur, utiliser les données disponibles dans le programmeSession
            return transformProgrammeSessionToCandidatExamen(programmeSession);
          }
        })
      );

      // Appliquer les filtres côté client si nécessaire
      if (filters) {
        if (filters.auto_ecole_id) {
          candidats = candidats.filter(c => c.auto_ecole_id === filters.auto_ecole_id);
        }
        if (filters.statut) {
          candidats = candidats.filter(c => c.statut === filters.statut);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          candidats = candidats.filter(c =>
            c.candidat.personne.nom.toLowerCase().includes(searchLower) ||
            c.candidat.personne.prenom.toLowerCase().includes(searchLower) ||
            c.candidat.numero_candidat.toLowerCase().includes(searchLower)
          );
        }
      }

      return {
        data: candidats,
        links: {
          first: '/api/programme-sessions?page=1',
          last: '/api/programme-sessions?page=1',
          prev: null,
          next: null
        },
        meta: {
          current_page: 1,
          from: 1,
          last_page: 1,
          path: '/api/programme-sessions',
          per_page: 15,
          to: candidats.length,
          total: candidats.length
        }
      };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des candidats aux examens:', error);
      // Retourner une liste vide en cas d'erreur
      return {
        data: [],
        links: {
          first: '/api/programme-sessions?page=1',
          last: '/api/programme-sessions?page=1',
          prev: null,
          next: null
        },
        meta: {
          current_page: 1,
          from: 0,
          last_page: 1,
          path: '/api/programme-sessions',
          per_page: 15,
          to: 0,
          total: 0
        }
      };
    }
  }

  // Récupérer un candidat aux examens par ID
  static async getCandidatExamenById(id: string): Promise<CandidatExamen> {
    try {
      const response = await axiosClient.get(`/programme-sessions/${id}`);
      
      let programmeSession: any = null;
      
      if (response.data?.success && response.data.data) {
        programmeSession = response.data.data;
      } else if (response.data?.programme_session) {
        programmeSession = response.data.programme_session;
      } else if (response.data) {
        programmeSession = response.data;
      }

      if (!programmeSession) {
        throw new Error('Programme session non trouvé');
      }

      // Charger le dossier complet avec toutes les relations
      const dossierId = programmeSession.dossier_id || programmeSession.dossier?.id;
      let dossierComplet: any = null;

      if (dossierId) {
        try {
          const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`);
          dossierComplet = dossierResponse.data?.data || dossierResponse.data;
        } catch (error: any) {
          console.warn(`⚠️ Impossible de charger le dossier ${dossierId} pour le programme session ${id}:`, error);
        }
      }

      return transformProgrammeSessionToCandidatExamen(programmeSession, dossierComplet);
    } catch (error: any) {
      console.error('Erreur lors de la récupération du candidat aux examens:', error);
      throw new Error('Candidat aux examens non trouvé');
    }
  }

  // Créer un nouveau candidat aux examens (via programme-sessions)
  static async createCandidatExamen(data: CandidatExamenFormData): Promise<CandidatExamenResponse> {
    try {
      // Créer un programme session via l'API
      const response = await axiosClient.post('/programme-sessions', {
        dossier_id: data.candidat_id, // Utiliser candidat_id comme dossier_id
        date_examen: new Date().toISOString() // Date par défaut, peut être ajustée
      });

      let programmeSession: any = null;
      
      if (response.data?.success && response.data.programme_session) {
        programmeSession = response.data.programme_session;
      } else if (response.data?.data) {
        programmeSession = response.data.data;
      } else {
        programmeSession = response.data;
      }

      if (!programmeSession) {
        throw new Error('Erreur lors de la création du programme session');
      }

      const candidatExamen = transformProgrammeSessionToCandidatExamen(programmeSession);

      return {
        success: true,
        message: 'Candidat aux examens créé avec succès',
        data: candidatExamen
      };
    } catch (error: any) {
      console.error('Erreur lors de la création du candidat aux examens:', error);
      throw error;
    }
  }

  // Mettre à jour un candidat aux examens
  static async updateCandidatExamen(id: string, data: Partial<CandidatExamenFormData> & { date_examen?: string }): Promise<CandidatExamenResponse> {
    try {
      // Mettre à jour le programme session via l'API
      const updateData: any = {};
      if (data.date_examen) {
        updateData.date_examen = data.date_examen;
      }

      const response = await axiosClient.put(`/programme-sessions/${id}`, updateData);

      let programmeSession: any = null;
      
      if (response.data?.success && response.data.programme_session) {
        programmeSession = response.data.programme_session;
      } else if (response.data?.data) {
        programmeSession = response.data.data;
      } else {
        programmeSession = response.data;
      }

      if (!programmeSession) {
        throw new Error('Programme session non trouvé');
      }

      const candidatExamen = transformProgrammeSessionToCandidatExamen(programmeSession);

      return {
        success: true,
        message: 'Candidat aux examens mis à jour avec succès',
        data: candidatExamen
      };
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du candidat aux examens:', error);
      throw error;
    }
  }

  // Supprimer un candidat aux examens
  static async deleteCandidatExamen(id: string): Promise<CandidatExamenResponse> {
    try {
      await axiosClient.delete(`/programme-sessions/${id}`);
      
      return {
        success: true,
        message: 'Candidat aux examens supprimé avec succès'
      };
    } catch (error: any) {
      console.error('Erreur lors de la suppression du candidat aux examens:', error);
      throw error;
    }
  }

  // Changer le statut d'un candidat aux examens
  static async updateStatutCandidatExamen(id: string, statut: string): Promise<CandidatExamenResponse> {
    try {
      // Pour l'instant, on récupère le programme session et on le met à jour
      // Le statut peut être géré via un endpoint spécifique si disponible
      const response = await axiosClient.get(`/programme-sessions/${id}`);
      
      let programmeSession: any = null;
      
      if (response.data?.success && response.data.data) {
        programmeSession = response.data.data;
      } else if (response.data?.programme_session) {
        programmeSession = response.data.programme_session;
      } else {
        programmeSession = response.data;
      }

      if (!programmeSession) {
        throw new Error('Programme session non trouvé');
      }

      const candidatExamen = transformProgrammeSessionToCandidatExamen(programmeSession);
      candidatExamen.statut = statut as any;
      candidatExamen.statut_libelle = this.getStatutLabel(statut);

      return {
        success: true,
        message: 'Statut mis à jour avec succès',
        data: candidatExamen
      };
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  // Récupérer les statistiques des candidats aux examens
  static async getCandidatExamenStats(filters?: CandidatExamenFilters): Promise<CandidatExamenStats> {
    try {
      // Récupérer tous les candidats
      const response = await this.getCandidatsExamen(filters);
      const candidats = response.data;

      const total = candidats.length;
      const inscrits = candidats.filter(c => c.statut === 'inscrit').length;
      const programmes = candidats.filter(c => c.statut === 'programme').length;
      const presents = candidats.filter(c => c.statut === 'present').length;
      const absents = candidats.filter(c => c.statut === 'absent').length;
      const reussis = candidats.filter(c => c.statut === 'reussi').length;
      const echoues = candidats.filter(c => c.statut === 'echoue').length;
      const annules = candidats.filter(c => c.statut === 'annule').length;

      const taux_reussite = reussis + echoues > 0 ? (reussis / (reussis + echoues)) * 100 : 0;
      const taux_presence = presents + absents > 0 ? (presents / (presents + absents)) * 100 : 0;

      return {
        total,
        inscrits,
        programmes,
        presents,
        absents,
        reussis,
        echoues,
        annules,
        taux_reussite,
        taux_presence
      };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      // Retourner des statistiques vides en cas d'erreur
      return {
        total: 0,
        inscrits: 0,
        programmes: 0,
        presents: 0,
        absents: 0,
        reussis: 0,
        echoues: 0,
        annules: 0,
        taux_reussite: 0,
        taux_presence: 0
      };
    }
  }

  // Méthode utilitaire pour obtenir le libellé du statut
  private static getStatutLabel(statut: string): string {
    const statuts: Record<string, string> = {
      'inscrit': 'Inscrit',
      'en_attente': 'En attente',
      'programme': 'Programmé',
      'present': 'Présent',
      'absent': 'Absent',
      'reussi': 'Réussi',
      'echoue': 'Échoué',
      'annule': 'Annulé'
    };
    return statuts[statut] || statut;
  }
}
