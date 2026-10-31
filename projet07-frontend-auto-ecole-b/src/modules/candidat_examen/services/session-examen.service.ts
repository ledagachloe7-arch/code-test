// Service pour la gestion des sessions d'examen
import { 
  SessionExamen, 
  SessionExamenFormData, 
  SessionExamenFilters, 
  SessionExamenResponse, 
  SessionExamenListResponse,
  SessionExamenStats 
} from '../types';

// Mock des sessions d'examen
const mockSessionsExamen: SessionExamen[] = [
  {
    id: '1',
    nom: 'Session Janvier 2024',
    description: 'Session d\'examen de janvier 2024 pour le permis B',
    type_permis_id: '1',
    type_permis: {
      id: '1',
      libelle: 'Permis B',
      code: 'B',
      categorie: 'Voiture',
      description: 'Permis de conduire voiture'
    },
    date_debut: '2024-01-20T08:00:00Z',
    date_fin: '2024-01-25T18:00:00Z',
    statut: 'ouverte',
    statut_libelle: 'Ouverte',
    capacite_maximale: 50,
    capacite_utilisee: 25,
    lieu: 'Centre d\'examen CNEPC',
    adresse: 'Abidjan, Plateau, Avenue Franchet d\'Esperey',
    responsable_id: '1',
    responsable: {
      id: '1',
      nom: 'Martin',
      prenom: 'Pierre',
      nom_complet: 'Pierre Martin',
      email: 'pierre.martin@cnepc.ci',
      contact: '+225 07 98 76 54 32',
      fonction: 'Responsable examens'
    },
    epreuves: [],
    candidats: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    nom: 'Session Février 2024',
    description: 'Session d\'examen de février 2024 pour le permis B',
    type_permis_id: '1',
    type_permis: {
      id: '1',
      libelle: 'Permis B',
      code: 'B',
      categorie: 'Voiture',
      description: 'Permis de conduire voiture'
    },
    date_debut: '2024-02-15T08:00:00Z',
    date_fin: '2024-02-20T18:00:00Z',
    statut: 'planifiee',
    statut_libelle: 'Planifiée',
    capacite_maximale: 60,
    capacite_utilisee: 0,
    lieu: 'Centre d\'examen CNEPC',
    adresse: 'Abidjan, Plateau, Avenue Franchet d\'Esperey',
    responsable_id: '1',
    responsable: {
      id: '1',
      nom: 'Martin',
      prenom: 'Pierre',
      nom_complet: 'Pierre Martin',
      email: 'pierre.martin@cnepc.ci',
      contact: '+225 07 98 76 54 32',
      fonction: 'Responsable examens'
    },
    epreuves: [],
    candidats: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    nom: 'Session Mars 2024 - Permis A',
    description: 'Session d\'examen de mars 2024 pour le permis moto',
    type_permis_id: '2',
    type_permis: {
      id: '2',
      libelle: 'Permis A',
      code: 'A',
      categorie: 'Moto',
      description: 'Permis de conduire moto'
    },
    date_debut: '2024-03-10T08:00:00Z',
    date_fin: '2024-03-15T18:00:00Z',
    statut: 'fermee',
    statut_libelle: 'Fermée',
    capacite_maximale: 30,
    capacite_utilisee: 30,
    lieu: 'Centre d\'examen CNEPC',
    adresse: 'Abidjan, Plateau, Avenue Franchet d\'Esperey',
    responsable_id: '2',
    responsable: {
      id: '2',
      nom: 'Kouassi',
      prenom: 'Marie',
      nom_complet: 'Marie Kouassi',
      email: 'marie.kouassi@cnepc.ci',
      contact: '+225 07 11 22 33 44',
      fonction: 'Responsable examens moto'
    },
    epreuves: [],
    candidats: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Service pour la gestion des sessions d'examen
export class SessionExamenService {
  // Récupérer la liste des sessions d'examen
  static async getSessionsExamen(filters?: SessionExamenFilters): Promise<SessionExamenListResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredSessions = [...mockSessionsExamen];

        // Appliquer les filtres
        if (filters) {
          if (filters.type_permis_id) {
            filteredSessions = filteredSessions.filter(
              s => s.type_permis_id === filters.type_permis_id
            );
          }
          if (filters.statut) {
            filteredSessions = filteredSessions.filter(
              s => s.statut === filters.statut
            );
          }
          if (filters.date_debut) {
            filteredSessions = filteredSessions.filter(
              s => new Date(s.date_debut) >= new Date(filters.date_debut!)
            );
          }
          if (filters.date_fin) {
            filteredSessions = filteredSessions.filter(
              s => new Date(s.date_fin) <= new Date(filters.date_fin!)
            );
          }
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredSessions = filteredSessions.filter(s =>
              s.nom.toLowerCase().includes(searchLower) ||
              s.description?.toLowerCase().includes(searchLower) ||
              s.type_permis.libelle.toLowerCase().includes(searchLower)
            );
          }
        }

        resolve({
          data: filteredSessions,
          links: {
            first: '/api/sessions-examen?page=1',
            last: '/api/sessions-examen?page=1',
            prev: null,
            next: null
          },
          meta: {
            current_page: 1,
            from: 1,
            last_page: 1,
            path: '/api/sessions-examen',
            per_page: 15,
            to: filteredSessions.length,
            total: filteredSessions.length
          }
        });
      }, 500);
    });
  }

  // Récupérer une session d'examen par ID
  static async getSessionExamenById(id: string): Promise<SessionExamen> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const session = mockSessionsExamen.find(s => s.id === id);
        if (session) {
          resolve(session);
        } else {
          reject(new Error('Session d\'examen non trouvée'));
        }
      }, 300);
    });
  }

  // Créer une nouvelle session d'examen
  static async createSessionExamen(data: SessionExamenFormData): Promise<SessionExamenResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newSession: SessionExamen = {
          id: (mockSessionsExamen.length + 1).toString(),
          ...data,
          statut: 'planifiee',
          statut_libelle: 'Planifiée',
          capacite_utilisee: 0,
          type_permis: {
            id: data.type_permis_id,
            libelle: 'Permis B',
            code: 'B',
            categorie: 'Voiture',
            description: 'Permis de conduire voiture'
          },
          responsable: {
            id: data.responsable_id,
            nom: 'Responsable',
            prenom: 'Test',
            nom_complet: 'Test Responsable',
            email: 'responsable@test.ci',
            contact: '+225 07 00 00 00 00',
            fonction: 'Responsable examens'
          },
          epreuves: [],
          candidats: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockSessionsExamen.push(newSession);

        resolve({
          success: true,
          message: 'Session d\'examen créée avec succès',
          data: newSession
        });
      }, 800);
    });
  }

  // Mettre à jour une session d'examen
  static async updateSessionExamen(id: string, data: Partial<SessionExamenFormData>): Promise<SessionExamenResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockSessionsExamen.findIndex(s => s.id === id);
        if (index !== -1) {
          mockSessionsExamen[index] = {
            ...mockSessionsExamen[index],
            ...data,
            updated_at: new Date().toISOString()
          };

          resolve({
            success: true,
            message: 'Session d\'examen mise à jour avec succès',
            data: mockSessionsExamen[index]
          });
        } else {
          reject(new Error('Session d\'examen non trouvée'));
        }
      }, 600);
    });
  }

  // Supprimer une session d'examen
  static async deleteSessionExamen(id: string): Promise<SessionExamenResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockSessionsExamen.findIndex(s => s.id === id);
        if (index !== -1) {
          mockSessionsExamen.splice(index, 1);
          resolve({
            success: true,
            message: 'Session d\'examen supprimée avec succès'
          });
        } else {
          reject(new Error('Session d\'examen non trouvée'));
        }
      }, 400);
    });
  }

  // Changer le statut d'une session d'examen
  static async updateStatutSessionExamen(id: string, statut: string): Promise<SessionExamenResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const session = mockSessionsExamen.find(s => s.id === id);
        if (session) {
          session.statut = statut as any;
          session.statut_libelle = this.getStatutLabel(statut);
          session.updated_at = new Date().toISOString();

          resolve({
            success: true,
            message: 'Statut mis à jour avec succès',
            data: session
          });
        } else {
          reject(new Error('Session d\'examen non trouvée'));
        }
      }, 500);
    });
  }

  // Ouvrir les inscriptions pour une session
  static async ouvrirInscriptions(id: string): Promise<SessionExamenResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const session = mockSessionsExamen.find(s => s.id === id);
        if (session) {
          session.statut = 'ouverte';
          session.statut_libelle = 'Ouverte';
          session.updated_at = new Date().toISOString();

          resolve({
            success: true,
            message: 'Inscriptions ouvertes avec succès',
            data: session
          });
        } else {
          reject(new Error('Session d\'examen non trouvée'));
        }
      }, 500);
    });
  }

  // Fermer les inscriptions pour une session
  static async fermerInscriptions(id: string): Promise<SessionExamenResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const session = mockSessionsExamen.find(s => s.id === id);
        if (session) {
          session.statut = 'fermee';
          session.statut_libelle = 'Fermée';
          session.updated_at = new Date().toISOString();

          resolve({
            success: true,
            message: 'Inscriptions fermées avec succès',
            data: session
          });
        } else {
          reject(new Error('Session d\'examen non trouvée'));
        }
      }, 500);
    });
  }

  // Récupérer les statistiques des sessions d'examen
  static async getSessionExamenStats(filters?: SessionExamenFilters): Promise<SessionExamenStats> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let sessions = [...mockSessionsExamen];

        // Appliquer les filtres
        if (filters) {
          if (filters.type_permis_id) {
            sessions = sessions.filter(s => s.type_permis_id === filters.type_permis_id);
          }
        }

        const total = sessions.length;
        const planifiees = sessions.filter(s => s.statut === 'planifiee').length;
        const ouvertes = sessions.filter(s => s.statut === 'ouverte').length;
        const fermees = sessions.filter(s => s.statut === 'fermee').length;
        const en_cours = sessions.filter(s => s.statut === 'en_cours').length;
        const terminees = sessions.filter(s => s.statut === 'terminee').length;
        const annulees = sessions.filter(s => s.statut === 'annulee').length;

        const capacite_totale = sessions.reduce((sum, s) => sum + s.capacite_maximale, 0);
        const capacite_utilisee = sessions.reduce((sum, s) => sum + s.capacite_utilisee, 0);
        const taux_occupation = capacite_totale > 0 ? (capacite_utilisee / capacite_totale) * 100 : 0;

        resolve({
          total,
          planifiees,
          ouvertes,
          fermees,
          en_cours,
          terminees,
          annulees,
          capacite_totale,
          capacite_utilisee,
          taux_occupation
        });
      }, 300);
    });
  }

  // Méthode utilitaire pour obtenir le libellé du statut
  private static getStatutLabel(statut: string): string {
    const statuts: Record<string, string> = {
      'planifiee': 'Planifiée',
      'ouverte': 'Ouverte',
      'fermee': 'Fermée',
      'en_cours': 'En cours',
      'terminee': 'Terminée',
      'annulee': 'Annulée'
    };
    return statuts[statut] || statut;
  }
}
