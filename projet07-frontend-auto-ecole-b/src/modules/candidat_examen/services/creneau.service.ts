// Service pour la gestion des créneaux d'examen
import { 
  Creneau, 
  CreneauFormData, 
  CreneauFilters, 
  CreneauResponse, 
  CreneauListResponse,
  CreneauStats,
  CandidatCreneau,
  CandidatCreneauFormData,
  PlanificationCreneaux,
  PlanificationResult
} from '../types';

// Mock des créneaux
const mockCreneaux: Creneau[] = [
  {
    id: '1',
    epreuve_session_id: '1',
    epreuve_session: {
      id: '1',
      epreuve: {
        id: '1',
        nom: 'Épreuve Théorique Générale',
        code: 'ETG',
        type_epreuve: 'theorique'
      },
      session_examen: {
        id: '1',
        nom: 'Session Janvier 2024',
        type_permis: {
          libelle: 'Permis B',
          code: 'B'
        }
      }
    },
    date: '2024-01-20',
    heure_debut: '09:00',
    heure_fin: '09:30',
    duree_minutes: 30,
    capacite_maximale: 20,
    capacite_utilisee: 15,
    statut: 'disponible',
    statut_libelle: 'Disponible',
    candidats: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    epreuve_session_id: '1',
    epreuve_session: {
      id: '1',
      epreuve: {
        id: '1',
        nom: 'Épreuve Théorique Générale',
        code: 'ETG',
        type_epreuve: 'theorique'
      },
      session_examen: {
        id: '1',
        nom: 'Session Janvier 2024',
        type_permis: {
          libelle: 'Permis B',
          code: 'B'
        }
      }
    },
    date: '2024-01-20',
    heure_debut: '10:00',
    heure_fin: '10:30',
    duree_minutes: 30,
    capacite_maximale: 20,
    capacite_utilisee: 20,
    statut: 'complet',
    statut_libelle: 'Complet',
    candidats: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '3',
    epreuve_session_id: '2',
    epreuve_session: {
      id: '2',
      epreuve: {
        id: '2',
        nom: 'Épreuve Pratique de Conduite',
        code: 'EPC',
        type_epreuve: 'pratique'
      },
      session_examen: {
        id: '1',
        nom: 'Session Janvier 2024',
        type_permis: {
          libelle: 'Permis B',
          code: 'B'
        }
      }
    },
    date: '2024-01-21',
    heure_debut: '10:00',
    heure_fin: '10:32',
    duree_minutes: 32,
    capacite_maximale: 10,
    capacite_utilisee: 8,
    statut: 'disponible',
    statut_libelle: 'Disponible',
    candidats: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
];

// Mock des candidats de créneaux
const mockCandidatsCreneau: CandidatCreneau[] = [
  {
    id: '1',
    candidat_examen_id: '1',
    creneau_id: '1',
    statut: 'inscrit',
    statut_libelle: 'Inscrit',
    ordre_passage: 1,
    commentaires: 'Premier passage',
    candidat_examen: {
      id: '1',
      candidat: {
        id: '1',
        numero_candidat: 'CAND001',
        personne: {
          nom: 'Dupont',
          prenom: 'Jean',
          nom_complet: 'Jean Dupont',
          contact: '+225 07 12 34 56 78'
        }
      },
      auto_ecole: {
        id: '1',
        nom_auto_ecole: 'Auto-École Excellence'
      },
      formation: {
        id: '1',
        nom: 'Formation Permis B',
        type_permis: {
          libelle: 'Permis B'
        }
      }
    },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    candidat_examen_id: '2',
    creneau_id: '1',
    statut: 'inscrit',
    statut_libelle: 'Inscrit',
    ordre_passage: 2,
    commentaires: 'Deuxième passage',
    candidat_examen: {
      id: '2',
      candidat: {
        id: '2',
        numero_candidat: 'CAND002',
        personne: {
          nom: 'Koné',
          prenom: 'Fatou',
          nom_complet: 'Fatou Koné',
          contact: '+225 07 55 66 77 88'
        }
      },
      auto_ecole: {
        id: '2',
        nom_auto_ecole: 'Auto-École Pro'
      },
      formation: {
        id: '2',
        nom: 'Formation Permis B Accélérée',
        type_permis: {
          libelle: 'Permis B'
        }
      }
    },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  }
];

// Service pour la gestion des créneaux
export class CreneauService {
  // Récupérer la liste des créneaux
  static async getCreneaux(filters?: CreneauFilters): Promise<CreneauListResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredCreneaux = [...mockCreneaux];

        // Appliquer les filtres
        if (filters) {
          if (filters.epreuve_session_id) {
            filteredCreneaux = filteredCreneaux.filter(
              c => c.epreuve_session_id === filters.epreuve_session_id
            );
          }
          if (filters.date) {
            filteredCreneaux = filteredCreneaux.filter(
              c => c.date === filters.date
            );
          }
          if (filters.statut) {
            filteredCreneaux = filteredCreneaux.filter(
              c => c.statut === filters.statut
            );
          }
        }

        resolve({
          data: filteredCreneaux,
          links: {
            first: '/api/creneaux?page=1',
            last: '/api/creneaux?page=1',
            prev: null,
            next: null
          },
          meta: {
            current_page: 1,
            from: 1,
            last_page: 1,
            path: '/api/creneaux',
            per_page: 15,
            to: filteredCreneaux.length,
            total: filteredCreneaux.length
          }
        });
      }, 400);
    });
  }

  // Récupérer un créneau par ID
  static async getCreneauById(id: string): Promise<Creneau> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const creneau = mockCreneaux.find(c => c.id === id);
        if (creneau) {
          resolve(creneau);
        } else {
          reject(new Error('Créneau non trouvé'));
        }
      }, 200);
    });
  }

  // Créer un nouveau créneau
  static async createCreneau(data: CreneauFormData): Promise<CreneauResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newCreneau: Creneau = {
          id: (mockCreneaux.length + 1).toString(),
          ...data,
          capacite_utilisee: 0,
          statut: 'disponible',
          statut_libelle: 'Disponible',
          epreuve_session: {
            id: data.epreuve_session_id,
            epreuve: {
              id: '1',
              nom: 'Épreuve',
              code: 'EPR',
              type_epreuve: 'theorique'
            },
            session_examen: {
              id: '1',
              nom: 'Session',
              type_permis: {
                libelle: 'Permis B',
                code: 'B'
              }
            }
          },
          candidats: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockCreneaux.push(newCreneau);

        resolve({
          success: true,
          message: 'Créneau créé avec succès',
          data: newCreneau
        });
      }, 600);
    });
  }

  // Mettre à jour un créneau
  static async updateCreneau(id: string, data: Partial<CreneauFormData>): Promise<CreneauResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCreneaux.findIndex(c => c.id === id);
        if (index !== -1) {
          mockCreneaux[index] = {
            ...mockCreneaux[index],
            ...data,
            updated_at: new Date().toISOString()
          };

          resolve({
            success: true,
            message: 'Créneau mis à jour avec succès',
            data: mockCreneaux[index]
          });
        } else {
          reject(new Error('Créneau non trouvé'));
        }
      }, 500);
    });
  }

  // Supprimer un créneau
  static async deleteCreneau(id: string): Promise<CreneauResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCreneaux.findIndex(c => c.id === id);
        if (index !== -1) {
          mockCreneaux.splice(index, 1);
          resolve({
            success: true,
            message: 'Créneau supprimé avec succès'
          });
        } else {
          reject(new Error('Créneau non trouvé'));
        }
      }, 400);
    });
  }

  // Planifier automatiquement les créneaux
  static async planifierCreneaux(data: PlanificationCreneaux): Promise<PlanificationResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const creneauxCrees: Creneau[] = [];
        const candidatsAffectes: CandidatCreneau[] = [];

        // Simulation de la planification automatique
        const dateDebut = new Date(data.date_debut);
        const dateFin = new Date(data.date_fin);
        const dureeCreneauMs = data.duree_creneau_minutes * 60 * 1000;
        const pauseMs = data.pause_entre_creneaux_minutes * 60 * 1000;

        let creneauId = mockCreneaux.length + 1;
        let dateActuelle = new Date(dateDebut);

        while (dateActuelle <= dateFin) {
          const jourSemaine = dateActuelle.getDay();
          
          // Vérifier si c'est un jour travaillé
          if (data.jours_travailles.includes(jourSemaine)) {
            const heureDebut = new Date(dateActuelle);
            heureDebut.setHours(parseInt(data.heure_debut_journee.split(':')[0]));
            heureDebut.setMinutes(parseInt(data.heure_debut_journee.split(':')[1]));

            const heureFin = new Date(dateActuelle);
            heureFin.setHours(parseInt(data.heure_fin_journee.split(':')[0]));
            heureFin.setMinutes(parseInt(data.heure_fin_journee.split(':')[1]));

            let heureCreneau = new Date(heureDebut);

            while (heureCreneau < heureFin) {
              const heureFinCreneau = new Date(heureCreneau.getTime() + dureeCreneauMs);
              
              if (heureFinCreneau <= heureFin) {
                const creneau: Creneau = {
                  id: creneauId.toString(),
                  epreuve_session_id: data.epreuve_session_id,
                  epreuve_session: {
                    id: data.epreuve_session_id,
                    epreuve: {
                      id: '1',
                      nom: 'Épreuve',
                      code: 'EPR',
                      type_epreuve: 'theorique'
                    },
                    session_examen: {
                      id: '1',
                      nom: 'Session',
                      type_permis: {
                        libelle: 'Permis B',
                        code: 'B'
                      }
                    }
                  },
                  date: dateActuelle.toISOString().split('T')[0],
                  heure_debut: heureCreneau.toTimeString().slice(0, 5),
                  heure_fin: heureFinCreneau.toTimeString().slice(0, 5),
                  duree_minutes: data.duree_creneau_minutes,
                  capacite_maximale: data.capacite_par_creneau,
                  capacite_utilisee: 0,
                  statut: 'disponible',
                  statut_libelle: 'Disponible',
                  candidats: [],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };

                creneauxCrees.push(creneau);
                mockCreneaux.push(creneau);
                creneauId++;
              }

              heureCreneau = new Date(heureCreneau.getTime() + dureeCreneauMs + pauseMs);
            }
          }

          dateActuelle.setDate(dateActuelle.getDate() + 1);
        }

        const capaciteTotale = creneauxCrees.reduce((sum, c) => sum + c.capacite_maximale, 0);
        const tauxOccupationMoyen = 0; // Aucun candidat affecté initialement

        resolve({
          creneaux_crees: creneauxCrees,
          candidats_affectes: candidatsAffectes,
          statistiques: {
            nombre_creneaux: creneauxCrees.length,
            nombre_candidats_affectes: candidatsAffectes.length,
            capacite_totale: capaciteTotale,
            taux_occupation_moyen: tauxOccupationMoyen
          }
        });
      }, 1000);
    });
  }

  // Récupérer les statistiques des créneaux
  static async getCreneauStats(filters?: CreneauFilters): Promise<CreneauStats> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let creneaux = [...mockCreneaux];

        // Appliquer les filtres
        if (filters) {
          if (filters.epreuve_session_id) {
            creneaux = creneaux.filter(c => c.epreuve_session_id === filters.epreuve_session_id);
          }
          if (filters.date) {
            creneaux = creneaux.filter(c => c.date === filters.date);
          }
        }

        const total = creneaux.length;
        const disponibles = creneaux.filter(c => c.statut === 'disponible').length;
        const complets = creneaux.filter(c => c.statut === 'complet').length;
        const en_cours = creneaux.filter(c => c.statut === 'en_cours').length;
        const termines = creneaux.filter(c => c.statut === 'termine').length;
        const annules = creneaux.filter(c => c.statut === 'annule').length;

        const capacite_totale = creneaux.reduce((sum, c) => sum + c.capacite_maximale, 0);
        const capacite_utilisee = creneaux.reduce((sum, c) => sum + c.capacite_utilisee, 0);
        const taux_occupation = capacite_totale > 0 ? (capacite_utilisee / capacite_totale) * 100 : 0;

        resolve({
          total,
          disponibles,
          complets,
          en_cours,
          termines,
          annules,
          capacite_totale,
          capacite_utilisee,
          taux_occupation
        });
      }, 300);
    });
  }
}

// Service pour la gestion des candidats de créneaux
export class CandidatCreneauService {
  // Inscrire un candidat à un créneau
  static async inscrireCandidatCreneau(data: CandidatCreneauFormData): Promise<CandidatCreneau> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newCandidatCreneau: CandidatCreneau = {
          id: (mockCandidatsCreneau.length + 1).toString(),
          ...data,
          statut: 'inscrit',
          statut_libelle: 'Inscrit',
          candidat_examen: {
            id: data.candidat_examen_id,
            candidat: {
              id: '1',
              numero_candidat: 'CAND' + String(mockCandidatsCreneau.length + 1).padStart(3, '0'),
              personne: {
                nom: 'Nouveau',
                prenom: 'Candidat',
                nom_complet: 'Nouveau Candidat',
                contact: '+225 07 00 00 00 00'
              }
            },
            auto_ecole: {
              id: '1',
              nom_auto_ecole: 'Auto-École'
            },
            formation: {
              id: '1',
              nom: 'Formation',
              type_permis: {
                libelle: 'Permis B'
              }
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        mockCandidatsCreneau.push(newCandidatCreneau);

        // Mettre à jour la capacité utilisée du créneau
        const creneau = mockCreneaux.find(c => c.id === data.creneau_id);
        if (creneau) {
          creneau.capacite_utilisee++;
          if (creneau.capacite_utilisee >= creneau.capacite_maximale) {
            creneau.statut = 'complet';
            creneau.statut_libelle = 'Complet';
          }
        }

        resolve(newCandidatCreneau);
      }, 600);
    });
  }

  // Désinscrire un candidat d'un créneau
  static async desinscrireCandidatCreneau(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockCandidatsCreneau.findIndex(cc => cc.id === id);
        if (index !== -1) {
          const candidatCreneau = mockCandidatsCreneau[index];
          mockCandidatsCreneau.splice(index, 1);

          // Mettre à jour la capacité utilisée du créneau
          const creneau = mockCreneaux.find(c => c.id === candidatCreneau.creneau_id);
          if (creneau) {
            creneau.capacite_utilisee--;
            if (creneau.capacite_utilisee < creneau.capacite_maximale) {
              creneau.statut = 'disponible';
              creneau.statut_libelle = 'Disponible';
            }
          }

          resolve();
        } else {
          reject(new Error('Candidat de créneau non trouvé'));
        }
      }, 400);
    });
  }

  // Changer le statut d'un candidat de créneau
  static async updateStatutCandidatCreneau(id: string, statut: string): Promise<CandidatCreneau> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const candidatCreneau = mockCandidatsCreneau.find(cc => cc.id === id);
        if (candidatCreneau) {
          candidatCreneau.statut = statut as any;
          candidatCreneau.statut_libelle = this.getStatutLabel(statut);
          candidatCreneau.updated_at = new Date().toISOString();

          resolve(candidatCreneau);
        } else {
          reject(new Error('Candidat de créneau non trouvé'));
        }
      }, 500);
    });
  }

  // Méthode utilitaire pour obtenir le libellé du statut
  private static getStatutLabel(statut: string): string {
    const statuts: Record<string, string> = {
      'inscrit': 'Inscrit',
      'present': 'Présent',
      'absent': 'Absent',
      'reussi': 'Réussi',
      'echoue': 'Échoué',
      'annule': 'Annulé'
    };
    return statuts[statut] || statut;
  }
}
