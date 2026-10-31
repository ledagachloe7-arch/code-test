// Service pour la gestion des épreuves d'examen
import { 
  Epreuve, 
  EpreuveFormData, 
  EpreuveResponse, 
  EpreuveListResponse,
  EpreuveSession,
  EpreuveSessionFormData
} from '../types';

// Mock des épreuves
const mockEpreuves: Epreuve[] = [
  {
    id: '1',
    nom: 'Épreuve Théorique Générale',
    code: 'ETG',
    description: 'Épreuve théorique générale du code de la route',
    type_epreuve: 'theorique',
    duree_minutes: 30,
    note_maximale: 40,
    note_minimale: 35,
    ordre: 1,
    statut: true,
    statut_libelle: 'Active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    nom: 'Épreuve Pratique de Conduite',
    code: 'EPC',
    description: 'Épreuve pratique de conduite sur route',
    type_epreuve: 'pratique',
    duree_minutes: 32,
    note_maximale: 31,
    note_minimale: 25,
    ordre: 2,
    statut: true,
    statut_libelle: 'Active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    nom: 'Épreuve Orale de Sécurité',
    code: 'EOS',
    description: 'Épreuve orale de sécurité routière',
    type_epreuve: 'orale',
    duree_minutes: 15,
    note_maximale: 20,
    note_minimale: 16,
    ordre: 3,
    statut: true,
    statut_libelle: 'Active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Mock des épreuves de session
const mockEpreuvesSession: EpreuveSession[] = [
  {
    id: '1',
    session_examen_id: '1',
    epreuve_id: '1',
    epreuve: mockEpreuves[0],
    date_epreuve: '2024-01-20T09:00:00Z',
    heure_debut: '09:00',
    heure_fin: '09:30',
    lieu: 'Salle A - Centre d\'examen',
    capacite_maximale: 20,
    capacite_utilisee: 15,
    correcteur_id: '1',
    correcteur: {
      id: '1',
      nom: 'Dupont',
      prenom: 'Jean',
      nom_complet: 'Jean Dupont',
      email: 'jean.dupont@cnepc.ci',
      contact: '+225 07 12 34 56 78',
      specialite: 'Code de la route',
      numero_agrement: 'CORR001'
    },
    statut: 'planifiee',
    statut_libelle: 'Planifiée',
    candidats: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    session_examen_id: '1',
    epreuve_id: '2',
    epreuve: mockEpreuves[1],
    date_epreuve: '2024-01-21T10:00:00Z',
    heure_debut: '10:00',
    heure_fin: '10:32',
    lieu: 'Parcours de conduite - Centre d\'examen',
    capacite_maximale: 10,
    capacite_utilisee: 8,
    correcteur_id: '2',
    correcteur: {
      id: '2',
      nom: 'Martin',
      prenom: 'Pierre',
      nom_complet: 'Pierre Martin',
      email: 'pierre.martin@cnepc.ci',
      contact: '+225 07 98 76 54 32',
      specialite: 'Conduite pratique',
      numero_agrement: 'CORR002'
    },
    statut: 'planifiee',
    statut_libelle: 'Planifiée',
    candidats: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '3',
    session_examen_id: '1',
    epreuve_id: '3',
    epreuve: mockEpreuves[2],
    date_epreuve: '2024-01-22T14:00:00Z',
    heure_debut: '14:00',
    heure_fin: '14:15',
    lieu: 'Salle B - Centre d\'examen',
    capacite_maximale: 15,
    capacite_utilisee: 12,
    correcteur_id: '3',
    correcteur: {
      id: '3',
      nom: 'Kouassi',
      prenom: 'Marie',
      nom_complet: 'Marie Kouassi',
      email: 'marie.kouassi@cnepc.ci',
      contact: '+225 07 11 22 33 44',
      specialite: 'Sécurité routière',
      numero_agrement: 'CORR003'
    },
    statut: 'planifiee',
    statut_libelle: 'Planifiée',
    candidats: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
];

// Service pour la gestion des épreuves
export class EpreuveService {
  // Récupérer la liste des épreuves
  static async getEpreuves(): Promise<EpreuveListResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: mockEpreuves,
          links: {
            first: '/api/epreuves?page=1',
            last: '/api/epreuves?page=1',
            prev: null,
            next: null
          },
          meta: {
            current_page: 1,
            from: 1,
            last_page: 1,
            path: '/api/epreuves',
            per_page: 15,
            to: mockEpreuves.length,
            total: mockEpreuves.length
          }
        });
      }, 300);
    });
  }

  // Récupérer une épreuve par ID
  static async getEpreuveById(id: string): Promise<Epreuve> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const epreuve = mockEpreuves.find(e => e.id === id);
        if (epreuve) {
          resolve(epreuve);
        } else {
          reject(new Error('Épreuve non trouvée'));
        }
      }, 200);
    });
  }

  // Créer une nouvelle épreuve
  static async createEpreuve(data: EpreuveFormData): Promise<EpreuveResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newEpreuve: Epreuve = {
          id: (mockEpreuves.length + 1).toString(),
          ...data,
          statut_libelle: data.statut ? 'Active' : 'Inactive',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockEpreuves.push(newEpreuve);

        resolve({
          success: true,
          message: 'Épreuve créée avec succès',
          data: newEpreuve
        });
      }, 600);
    });
  }

  // Mettre à jour une épreuve
  static async updateEpreuve(id: string, data: Partial<EpreuveFormData>): Promise<EpreuveResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockEpreuves.findIndex(e => e.id === id);
        if (index !== -1) {
          mockEpreuves[index] = {
            ...mockEpreuves[index],
            ...data,
            statut_libelle: data.statut !== undefined ? (data.statut ? 'Active' : 'Inactive') : mockEpreuves[index].statut_libelle,
            updated_at: new Date().toISOString()
          };

          resolve({
            success: true,
            message: 'Épreuve mise à jour avec succès',
            data: mockEpreuves[index]
          });
        } else {
          reject(new Error('Épreuve non trouvée'));
        }
      }, 500);
    });
  }

  // Supprimer une épreuve
  static async deleteEpreuve(id: string): Promise<EpreuveResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockEpreuves.findIndex(e => e.id === id);
        if (index !== -1) {
          mockEpreuves.splice(index, 1);
          resolve({
            success: true,
            message: 'Épreuve supprimée avec succès'
          });
        } else {
          reject(new Error('Épreuve non trouvée'));
        }
      }, 400);
    });
  }
}

// Service pour la gestion des épreuves de session
export class EpreuveSessionService {
  // Récupérer les épreuves d'une session
  static async getEpreuvesBySession(sessionId: string): Promise<EpreuveSession[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const epreuves = mockEpreuvesSession.filter(es => es.session_examen_id === sessionId);
        resolve(epreuves);
      }, 300);
    });
  }

  // Récupérer une épreuve de session par ID
  static async getEpreuveSessionById(id: string): Promise<EpreuveSession> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const epreuveSession = mockEpreuvesSession.find(es => es.id === id);
        if (epreuveSession) {
          resolve(epreuveSession);
        } else {
          reject(new Error('Épreuve de session non trouvée'));
        }
      }, 200);
    });
  }

  // Créer une nouvelle épreuve de session
  static async createEpreuveSession(data: EpreuveSessionFormData): Promise<EpreuveSession> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const epreuve = mockEpreuves.find(e => e.id === data.epreuve_id);
        const correcteur = data.correcteur_id ? {
          id: data.correcteur_id,
          nom: 'Correcteur',
          prenom: 'Test',
          nom_complet: 'Test Correcteur',
          email: 'correcteur@test.ci',
          contact: '+225 07 00 00 00 00',
          specialite: 'Spécialité',
          numero_agrement: 'CORR' + String(mockEpreuvesSession.length + 1).padStart(3, '0')
        } : undefined;

        const newEpreuveSession: EpreuveSession = {
          id: (mockEpreuvesSession.length + 1).toString(),
          ...data,
          epreuve: epreuve!,
          correcteur,
          capacite_utilisee: 0,
          statut: 'planifiee',
          statut_libelle: 'Planifiée',
          candidats: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockEpreuvesSession.push(newEpreuveSession);
        resolve(newEpreuveSession);
      }, 600);
    });
  }

  // Mettre à jour une épreuve de session
  static async updateEpreuveSession(id: string, data: Partial<EpreuveSessionFormData>): Promise<EpreuveSession> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockEpreuvesSession.findIndex(es => es.id === id);
        if (index !== -1) {
          mockEpreuvesSession[index] = {
            ...mockEpreuvesSession[index],
            ...data,
            updated_at: new Date().toISOString()
          };

          resolve(mockEpreuvesSession[index]);
        } else {
          reject(new Error('Épreuve de session non trouvée'));
        }
      }, 500);
    });
  }

  // Supprimer une épreuve de session
  static async deleteEpreuveSession(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockEpreuvesSession.findIndex(es => es.id === id);
        if (index !== -1) {
          mockEpreuvesSession.splice(index, 1);
          resolve();
        } else {
          reject(new Error('Épreuve de session non trouvée'));
        }
      }, 400);
    });
  }

  // Changer le statut d'une épreuve de session
  static async updateStatutEpreuveSession(id: string, statut: string): Promise<EpreuveSession> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const epreuveSession = mockEpreuvesSession.find(es => es.id === id);
        if (epreuveSession) {
          epreuveSession.statut = statut as any;
          epreuveSession.statut_libelle = this.getStatutLabel(statut);
          epreuveSession.updated_at = new Date().toISOString();

          resolve(epreuveSession);
        } else {
          reject(new Error('Épreuve de session non trouvée'));
        }
      }, 500);
    });
  }

  // Méthode utilitaire pour obtenir le libellé du statut
  private static getStatutLabel(statut: string): string {
    const statuts: Record<string, string> = {
      'planifiee': 'Planifiée',
      'en_cours': 'En cours',
      'terminee': 'Terminée',
      'annulee': 'Annulée'
    };
    return statuts[statut] || statut;
  }
}
