import { BaseService } from '../../../shared/services/BaseService';
import { API_ENDPOINTS } from '../../../shared/constants/api';
import axiosClient from '../../../shared/utils/axiosConfig';
import { ReceptionActionResponse, ReceptionDossier, EpreuvesResultat } from '../types';
import { autoEcoleService } from '../../cnepc/services/auto-ecole.service';
import { getAutoEcoleId } from '../../../shared/utils/autoEcoleUtils';

class ReceptionService extends BaseService {
  // Maps pour stocker les candidats et formations (même méthode que DemandesInscriptionTable)
  private candidatsMap: Map<string, any> = new Map();
  private formationsMap: Map<string, any> = new Map();
  private autoEcolesMap: Map<string, any> = new Map();

  async listIncoming(): Promise<ReceptionDossier[]> {
    try {
      console.log('📋 Chargement des dossiers de réception via /programme-sessions...');
      
      // Récupérer l'ID de l'auto-école pour filtrer si nécessaire (optionnel pour les admins CNEPC)
      const autoEcoleId = getAutoEcoleId();
      
      // Vérifier le rôle de l'utilisateur pour déterminer si on peut récupérer tous les dossiers
      const userData = localStorage.getItem('user_data');
      let userRole = null;
      if (userData) {
        try {
          const user = JSON.parse(userData);
          userRole = user.role;
        } catch (e) {
          console.warn('⚠️ Impossible de parser user_data');
        }
      }
      
      // Vérifier si l'utilisateur est admin (peut être 'admin', 'ROLE_ADMIN', etc.)
      const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'admin' || userRole?.toLowerCase() === 'admin';
      
      console.log('🏫 Auto-école ID:', autoEcoleId || 'Aucun');
      console.log('👤 Rôle utilisateur:', userRole || 'Non défini');
      console.log('🔐 Est admin:', isAdmin);
      
      // Récupérer les dossiers avec statut 'valide'
      console.log('🔍 Récupération des dossiers validés...');
      const filters = { statut: 'valide' as const };
      console.log('🔍 Filtres envoyés à l\'API:', filters);
      
      let response;
      
      // Si c'est un admin et qu'il n'y a pas d'autoEcoleId, récupérer tous les dossiers
      if (isAdmin && !autoEcoleId) {
        console.log('👑 Admin détecté: récupération de tous les dossiers validés...');
        // Utiliser la même méthode d'appel API que circuit.service.ts
        const params = { statut: 'valide' };
        const axiosResponse = await axiosClient.get('/dossiers', { params });
        response = {
          success: true,
          dossiers: axiosResponse.data?.data || axiosResponse.data || [],
          auto_ecole: undefined,
          statistiques: undefined
        };
      } else if (autoEcoleId) {
        // Si on a un autoEcoleId, utiliser la méthode existante
        response = await autoEcoleService.getDossiersByAutoEcoleId(autoEcoleId, filters);
      } else {
        // Si ce n'est pas un admin et qu'il n'y a pas d'autoEcoleId, retourner un tableau vide
        console.warn('⚠️ Aucun autoEcoleId disponible et utilisateur non-admin, retour d\'un tableau vide');
        return [];
      }
      
      console.log('📦 Dossiers récupérés depuis l\'API:', response.dossiers?.length || 0);
      console.log('📋 Structure de la réponse:', response);
      
      if (!response.dossiers || response.dossiers.length === 0) {
        console.log('⚠️ Aucun dossier transmis trouvé pour cette auto-école');
        return [];
      }
      
      // Charger d'abord les candidats, formations et auto-écoles pour le mapping
      await this.chargerCandidatsEtFormations();
      
      // Charger toutes les programme-sessions pour récupérer les dates d'examen
      let programmeSessionsMap = new Map<string, any>();
      try {
        console.log('📅 Chargement des programme-sessions pour récupérer les dates d\'examen...');
        const programmeSessionsResponse = await axiosClient.get('/programme-sessions');
        const programmeSessions = Array.isArray(programmeSessionsResponse.data?.data) 
          ? programmeSessionsResponse.data.data 
          : Array.isArray(programmeSessionsResponse.data) 
          ? programmeSessionsResponse.data 
          : [];
        
        // Créer un map dossier_id -> programme_session
        programmeSessions.forEach((ps: any) => {
          if (ps.dossier_id) {
            programmeSessionsMap.set(ps.dossier_id, ps);
          }
        });
        console.log(`✅ ${programmeSessionsMap.size} programme-session(s) chargé(s)`);
      } catch (error) {
        console.warn('⚠️ Erreur lors du chargement des programme-sessions:', error);
      }
      
      // Mapper les dossiers vers ReceptionDossier
      const mapped: ReceptionDossier[] = await Promise.all(response.dossiers.map(async (dossier: any) => {
        const candidat = dossier.candidat;
        let formation = dossier.formation;
        
        // Récupérer les informations depuis les maps
        const candidatFromMap = this.candidatsMap.get(candidat?.id) || this.candidatsMap.get(`personne_${candidat?.personne_id}`);
        const formationFromMap = this.formationsMap.get(formation?.id);
        const autoEcoleFromMap = autoEcoleId ? this.autoEcolesMap.get(autoEcoleId) : null;
        
        // Utiliser les données du dossier en priorité, avec fallback sur les maps
        const candidatFinal = candidatFromMap || candidat;
        const formationFinal = formationFromMap || formation;
        const autoEcoleFinal = autoEcoleFromMap || dossier.auto_ecole || {};
        
        const candidatPersonne = candidatFinal?.personne || candidat?.personne || {};
        
        // Récupérer la date d'examen depuis programme-sessions
        // Priorité: programme-sessions chargées > programme_sessions dans dossier > null
        const programmeSession = programmeSessionsMap.get(dossier.id) || 
                                 dossier.programme_sessions?.[0] || 
                                 null;
        const dateExamen = programmeSession?.date_examen || 
                          dossier.programme_sessions?.[0]?.date_examen || 
                          '';
        
        const result: ReceptionDossier = {
          id: dossier.id,
          reference: dossier.id,
          candidatNom: candidatPersonne.nom || '',
          candidatPrenom: candidatPersonne.prenom || '',
          autoEcoleNom: autoEcoleFinal.nom_auto_ecole || autoEcoleFinal.nom || '',
          dateEnvoi: dossier.updated_at || dossier.created_at || new Date().toISOString(),
          statut: 'valide',
          dateExamen: dateExamen,
          details: {
            dossier: dossier,
            candidat_complet: candidatFinal,
            formation_complete: formationFinal,
            auto_ecole_complete: autoEcoleFinal,
            programme_session: programmeSession || dossier.programme_sessions?.[0] || null
          },
        };
        
        // Récupérer les épreuves depuis les données du dossier si disponibles
        if (dossier.epreuves) {
          (result as any).epreuves = dossier.epreuves;
        }
        
        return result;
      }));
      
      return mapped;
    } catch (e) {
      console.error('❌ Erreur lors du chargement des dossiers de réception:', e);
      // Fallback sur l'ancien endpoint si disponible
      try {
        return this.get<ReceptionDossier[]>(API_ENDPOINTS.RECEPTION.INCOMING);
      } catch {
        return [] as ReceptionDossier[];
      }
    }
  }

  private async chargerCandidatsEtFormations() {
    try {
      console.log('📋 Chargement des candidats, formations et auto-écoles...');
      
      // Charger tous les candidats
      try {
        const candidats = await autoEcoleService.getAllCandidats();
        const candidatsMapTemp = new Map<string, any>();
        
        candidats.forEach((candidat: any) => {
          if (candidat.id) {
            candidatsMapTemp.set(candidat.id, candidat);
          }
          if (candidat.personne_id) {
            candidatsMapTemp.set(`personne_${candidat.personne_id}`, candidat);
          }
        });
        
        this.candidatsMap = candidatsMapTemp;
        console.log('✅ Candidats chargés:', candidatsMapTemp.size);
        console.log('📋 IDs candidats:', Array.from(candidatsMapTemp.keys()));
      } catch (error) {
        console.error('❌ Erreur lors du chargement des candidats:', error);
        this.candidatsMap = new Map();
      }
      
      // Charger toutes les formations
      try {
        const formations = await autoEcoleService.getAllFormations();
        const formationsMapTemp = new Map<string, any>();
        
        formations.forEach((formation: any) => {
          if (formation.id) {
            formationsMapTemp.set(formation.id, formation);
          }
        });
        
        this.formationsMap = formationsMapTemp;
        console.log('✅ Formations chargées:', formationsMapTemp.size);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des formations:', error);
        this.formationsMap = new Map();
      }
      
      // Charger toutes les auto-écoles
      try {
        const autoEcoles = await autoEcoleService.getAllAutoEcoles();
        const autoEcolesMapTemp = new Map<string, any>();
        
        console.log('🏫 Auto-écoles brutes reçues:', autoEcoles.length);
        console.log('🏫 Première auto-école:', autoEcoles[0]);
        
        autoEcoles.forEach((autoEcole: any) => {
          if (autoEcole.id) {
            autoEcolesMapTemp.set(autoEcole.id, autoEcole);
            console.log(`✅ Auto-école ${autoEcole.id} chargée:`, autoEcole.nom_auto_ecole || autoEcole.nom || 'N/A');
          }
        });
        
        this.autoEcolesMap = autoEcolesMapTemp;
        console.log('✅ Auto-écoles chargées:', autoEcolesMapTemp.size);
        console.log('🏫 IDs auto-écoles:', Array.from(autoEcolesMapTemp.keys()));
      } catch (error) {
        console.error('❌ Erreur lors du chargement des auto-écoles:', error);
        this.autoEcolesMap = new Map();
      }
      
    } catch (error) {
      console.error('❌ Erreur générale lors du chargement des candidats, formations et auto-écoles:', error);
    }
  }

  async getDetails(id: string): Promise<ReceptionDossier> {
    return this.get<ReceptionDossier>(API_ENDPOINTS.RECEPTION.DETAILS(id));
  }

  async receiveDossier(id: string): Promise<ReceptionActionResponse> {
    return this.post<ReceptionActionResponse>(API_ENDPOINTS.RECEPTION.RECEIVE(id));
  }

  // Enregistre les résultats des épreuves pour un dossier via l'API
  async saveEpreuves(dossierProgrammeId: string, results: EpreuvesResultat): Promise<{ success: boolean }> {
    try {
      // Enregistrer via l'API
      await axiosClient.post(`/programme-sessions/${dossierProgrammeId}/epreuves`, results);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement des épreuves:', error);
      throw error;
    }
  }
}

export const receptionService = new ReceptionService();


