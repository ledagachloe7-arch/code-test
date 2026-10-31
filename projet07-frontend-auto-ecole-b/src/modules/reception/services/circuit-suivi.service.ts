import axiosClient from '../../../shared/utils/axiosConfig';

// Types selon la documentation MODULE_CONNEXES.md
export interface CircuitSuivi {
  id?: string;
  libelle: string;
  actif: boolean;
  nom_entite: string;
  nationalite?: string;
  type_permis?: string;
  created_at?: string;
  updated_at?: string;
  etapes?: EtapeCircuit[];
}

export interface EtapeCircuit {
  id: string;
  code: string;
  libelle: string;
  ordre?: number;
  roles?: string[];
  pieces?: PieceEtape[];
  statut_libelle?: string;
  circuit_id?: string;
  statut_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PieceEtape {
  type_document: string; // ID ou nom du type de document
  obligatoire: boolean;
  libelle?: string;
}

export interface Dossier {
  id: string;
  candidat_id: string | null;
  auto_ecole_id: string | null;
  formation_id: string | null;
  type_demande_id: string | null;
  statut: string;
  date_creation?: string;
  date_modification?: string;
  commentaires?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  documentable_id: string;
  documentable_type: string;
  type_document_id?: string;
  piece_justification_id?: string; // ID de la pièce justificative selon LIAISON_PIECE_DOCUMENT.md
  nom_fichier: string;
  chemin_fichier: string;
  taille_fichier?: number;
  type_mime?: string;
  valide: boolean;
  commentaires?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDossierPayload {
  candidat_id: string | null;
  auto_ecole_id?: string | null;
  formation_id?: string | null;
  type_demande_id: string | null;
  statut: string;
}

export interface TransmettreEtapePayload {
  etape_id: string;
  circuit_id: string;
  dossier_id?: string;
}

export interface TransmettreEtapeResponse {
  success: boolean;
  message: string;
  data?: any;
}

class CircuitSuiviService {
  private static baseUrl = '/workflow/circuits';
  private static dossiersUrl = '/dossiers';
  private static documentsUrl = '/documents';
  private static etapesUrl = '/workflow/etapes';
  
  // Cache simple pour éviter les appels redondants (durée: 5 minutes)
  private static circuitCache = new Map<string, { data: CircuitSuivi | null; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupère la liste des circuits, optionnellement filtrés par nom_entite
   * Suit la logique de CIRCUIT_SUIVI_SERVICE.md
   * Utilise la même méthode d'appel API que circuit.service.ts
   */
  static async getCircuits(nomEntite?: string): Promise<CircuitSuivi[]> {
    try {
      console.log('📋 Récupération des circuits de suivi...');
      if (nomEntite) {
        console.log('🔍 Filtrage par nom_entite:', nomEntite);
      }

      // Utiliser la même méthode que circuit.service.ts
      const params = nomEntite ? { nom_entite: nomEntite } : undefined;
      const res = await axiosClient.get<CircuitSuivi[]>(CircuitSuiviService.baseUrl, { params });
      
      // Gérer les différents formats de réponse selon la documentation
      let circuits: CircuitSuivi[] = [];
      
      if (Array.isArray(res.data)) {
        circuits = res.data;
      } else if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
        circuits = (res.data as any).data;
      } else if (res.data && typeof res.data === 'object' && 'success' in res.data && Array.isArray((res.data as any).data)) {
        circuits = (res.data as any).data;
      }
      
      console.log(`✅ Circuits récupérés avec succès: ${circuits.length}`);
      return circuits;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des circuits:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(`Erreur lors de la récupération des circuits: ${errorMessage}`);
    }
  }

  /**
   * Récupère un circuit spécifique par son nom_entite
   * Suit la logique de CIRCUIT_SUIVI_SERVICE.md
   * Avec cache pour éviter les appels redondants
   * Charge automatiquement les étapes si elles ne sont pas présentes
   */
  static async getCircuitByNomEntite(nomEntite: string): Promise<CircuitSuivi | null> {
    try {
      const cacheKey = nomEntite.toUpperCase();
      const cached = CircuitSuiviService.circuitCache.get(cacheKey);
      
      // Vérifier si on a un cache valide avec étapes
      if (cached && Date.now() - cached.timestamp < CircuitSuiviService.CACHE_DURATION) {
        // Si le circuit en cache a des étapes, le retourner directement
        if (cached.data && cached.data.etapes && cached.data.etapes.length > 0) {
          return cached.data;
        }
        // Si le circuit en cache n'a pas d'étapes mais a un ID, charger les étapes
        if (cached.data && cached.data.id && (!cached.data.etapes || cached.data.etapes.length === 0)) {
          try {
            const etapes = await CircuitSuiviService.getEtapesByCircuitId(cached.data.id);
            if (etapes.length > 0) {
              cached.data.etapes = etapes;
              console.log(`✅ ${etapes.length} étapes chargées pour le circuit ${cached.data.libelle}`);
            }
          } catch (err) {
            console.warn(`⚠️ Impossible de charger les étapes pour le circuit ${cached.data.id}:`, err);
          }
        }
        return cached.data;
      }

      const circuits = await CircuitSuiviService.getCircuits(nomEntite);
      // Comparaison case-insensitive selon la documentation
      const circuit = circuits.find(c => 
        c.nom_entite?.toUpperCase() === nomEntite.toUpperCase()
      ) || null;
      
      // Charger les étapes si elles ne sont pas présentes
      if (circuit && circuit.id && (!circuit.etapes || circuit.etapes.length === 0)) {
        try {
          const etapes = await CircuitSuiviService.getEtapesByCircuitId(circuit.id);
          if (etapes.length > 0) {
            circuit.etapes = etapes;
            console.log(`✅ ${etapes.length} étapes chargées pour le circuit ${circuit.libelle}`);
          }
        } catch (err) {
          console.warn(`⚠️ Impossible de charger les étapes pour le circuit ${circuit.id}:`, err);
        }
      }
      
      // Mettre en cache
      CircuitSuiviService.circuitCache.set(cacheKey, {
        data: circuit,
        timestamp: Date.now()
      });
      
      return circuit;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération du circuit:', error);
      return null;
    }
  }
  
  /**
   * Vide le cache des circuits (utile après des modifications)
   */
  static clearCache(): void {
    CircuitSuiviService.circuitCache.clear();
  }

  /**
   * Récupère les étapes d'un circuit par son ID.
   * Si dossierId est fourni, l'API peut retourner les étapes avec statut_libelle pour ce dossier.
   */
  static async getEtapesByCircuitId(circuitId: string, dossierId?: string): Promise<EtapeCircuit[]> {
    try {
      console.log('📋 Récupération des étapes du circuit...', { circuitId, dossierId });
      
      const params: Record<string, string> = { circuit_id: circuitId };
      if (dossierId) params.dossier_id = dossierId;
      
      const response = await axiosClient.get<EtapeCircuit[]>(CircuitSuiviService.etapesUrl, {
        params
      });
      
      // Gérer les différents formats de réponse
      let etapes: EtapeCircuit[] = [];
      
      if (Array.isArray(response.data)) {
        etapes = response.data;
      } else if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as any).data)) {
        etapes = (response.data as any).data;
      } else if (response.data && typeof response.data === 'object' && 'success' in response.data && Array.isArray((response.data as any).data)) {
        etapes = (response.data as any).data;
      }
      
      // Trier les étapes par ordre (si disponible), sinon par code
      etapes.sort((a, b) => {
        // Priorité à l'ordre si disponible
        if (a.ordre !== undefined && b.ordre !== undefined) {
          return a.ordre - b.ordre;
        }
        if (a.ordre !== undefined) return -1;
        if (b.ordre !== undefined) return 1;
        // Fallback sur le code si pas d'ordre
        return (a.code || '').localeCompare(b.code || '');
      });
      
      console.log(`✅ Étapes récupérées avec succès: ${etapes.length}`, etapes.map(e => ({ id: e.id, libelle: e.libelle, ordre: e.ordre })));
      return etapes;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des étapes:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(`Erreur lors de la récupération des étapes: ${errorMessage}`);
    }
  }

  /**
   * Récupère uniquement les circuits actifs
   * Suit la logique de CIRCUIT_SUIVI_SERVICE.md
   */
  static async getCircuitsActifs(nomEntite?: string): Promise<CircuitSuivi[]> {
    try {
      const circuits = await CircuitSuiviService.getCircuits(nomEntite);
      return circuits.filter(c => c.actif === true);
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des circuits actifs:', error);
      return [];
    }
  }

  /**
   * Récupère les dossiers filtrés par type de demande et optionnellement par candidat
   * Suit la logique de CIRCUIT_SUIVI_SERVICE.md
   * Utilise la même méthode d'appel API que circuit.service.ts
   */
  static async getDossiersByTypeDemande(typeDemandeId: string, candidatId?: string): Promise<Dossier[]> {
    try {
      console.log('📋 Récupération des dossiers par type de demande...');
      
      // Utiliser la même méthode que circuit.service.ts
      const params: Record<string, string> = { type_demande_id: typeDemandeId };
      if (candidatId) {
        params.candidat_id = candidatId;
      }
      
      const res = await axiosClient.get<Dossier[]>(CircuitSuiviService.dossiersUrl, { params });
      
      // Gérer les différents formats de réponse
      let dossiers: Dossier[] = [];
      
      if (Array.isArray(res.data)) {
        dossiers = res.data;
      } else if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
        dossiers = (res.data as any).data;
      } else if (res.data && typeof res.data === 'object' && 'success' in res.data && Array.isArray((res.data as any).data)) {
        dossiers = (res.data as any).data;
      }
      
      console.log(`✅ Dossiers récupérés: ${dossiers.length}`);
      return dossiers;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des dossiers:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(`Erreur lors de la récupération des dossiers: ${errorMessage}`);
    }
  }

  /**
   * Crée un nouveau dossier
   * Suit la logique de CIRCUIT_SUIVI_SERVICE.md
   * Utilise la même méthode d'appel API que circuit.service.ts
   */
  static async createDossier(payload: CreateDossierPayload): Promise<Dossier> {
    try {
      console.log('📤 Création d\'un nouveau dossier...');
      
      // Validation selon la documentation
      if (!payload.candidat_id || !payload.type_demande_id) {
        throw new Error('Les champs candidat_id et type_demande_id sont obligatoires');
      }
      
      // Nettoyer le payload (ne pas envoyer les champs null optionnels)
      const cleanPayload: any = {
        candidat_id: payload.candidat_id,
        type_demande_id: payload.type_demande_id,
        statut: payload.statut
      };
      
      if (payload.auto_ecole_id) {
        cleanPayload.auto_ecole_id = payload.auto_ecole_id;
      }
      if (payload.formation_id) {
        cleanPayload.formation_id = payload.formation_id;
      }
      
      // Utiliser la même méthode que circuit.service.ts
      const res = await axiosClient.post<Dossier>(CircuitSuiviService.dossiersUrl, cleanPayload);
      
      // Gérer les différents formats de réponse
      let dossier: Dossier | null = null;
      
      if (res.data && 'id' in res.data) {
        dossier = res.data as Dossier;
      } else if (res.data && typeof res.data === 'object' && 'data' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        dossier = (res.data as any).data as Dossier;
      } else if (res.data && typeof res.data === 'object' && 'success' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        dossier = (res.data as any).data as Dossier;
      }
      
      if (!dossier) {
        throw new Error('Format de réponse inattendu lors de la création du dossier');
      }
      
      console.log('✅ Dossier créé avec succès:', dossier.id);
      return dossier;
    } catch (error: any) {
      console.error('❌ Erreur lors de la création du dossier:', error);
      
      // Gérer les erreurs de validation selon la documentation
      if (error.response?.data?.errors) {
        const validationErrors = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        throw new Error(`Erreur de validation: ${validationErrors}`);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(`Erreur lors de la création du dossier: ${errorMessage}`);
    }
  }

  /**
   * Transmet une étape vers l'étape suivante
   * Suit la logique de CIRCUIT_SUIVI_SERVICE.md
   * Utilise la même méthode d'appel API que circuit.service.ts
   */
  static async transmettreEtape(
    etapeId: string,
    circuitId: string,
    dossierId?: string
  ): Promise<TransmettreEtapeResponse> {
    try {
      console.log('📤 Transmission d\'une étape...');
      
      const payload: TransmettreEtapePayload = {
        etape_id: etapeId,
        circuit_id: circuitId
      };
      
      if (dossierId) {
        payload.dossier_id = dossierId;
      }
      
      // Backend attend PUT (POST renvoie 405 Method Not Allowed)
      const res = await axiosClient.put<TransmettreEtapeResponse>(
        `${CircuitSuiviService.etapesUrl}/transmettre`,
        payload
      );
      
      // Gérer les différents formats de réponse
      let result: TransmettreEtapeResponse;
      
      if (res.data && typeof res.data === 'object' && 'success' in res.data) {
        result = res.data as TransmettreEtapeResponse;
      } else {
        // Format par défaut si la réponse n'a pas le format attendu
        result = {
          success: true,
          message: 'Étape transmise avec succès',
          data: res.data
        };
      }
      
      console.log('✅ Étape transmise avec succès:', result.message);
      return result;
    } catch (error: any) {
      console.error('❌ Erreur lors de la transmission de l\'étape:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(`Erreur lors de la transmission de l'étape: ${errorMessage}`);
    }
  }

  /**
   * Met à jour le statut d'un dossier.
   * L'API dossier attend "statut": "string" (libellé du statut).
   * @param dossierId - ID du dossier
   * @param statut - Libellé du statut (string), ex. "Completion de dossier - Complété". Si options.asStatutId est true, envoie { statut_id } à la place.
   */
  static async updateDossierStatut(dossierId: string, statut: string, options?: { asStatutId?: boolean }): Promise<Dossier> {
    try {
      console.log('📤 Mise à jour du statut du dossier...', options?.asStatutId ? '(statut_id)' : '(statut)');
      
      const payload = options?.asStatutId ? { statut_id: statut } : { statut };
      const res = await axiosClient.patch<Dossier>(
        `${CircuitSuiviService.dossiersUrl}/${dossierId}`,
        payload
      );
      
      // Gérer les différents formats de réponse
      let dossier: Dossier | null = null;
      
      if (res.data && 'id' in res.data) {
        dossier = res.data as Dossier;
      } else if (res.data && typeof res.data === 'object' && 'data' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        dossier = (res.data as any).data as Dossier;
      } else if (res.data && typeof res.data === 'object' && 'success' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        dossier = (res.data as any).data as Dossier;
      }
      
      if (!dossier) {
        throw new Error('Format de réponse inattendu lors de la mise à jour du statut');
      }
      
      console.log('✅ Statut mis à jour avec succès:', dossier.statut);
      return dossier;
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
      
      // Gérer les erreurs de validation
      if (error.response?.data?.errors) {
        const validationErrors = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        throw new Error(`Erreur de validation: ${validationErrors}`);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(`Erreur lors de la mise à jour du statut: ${errorMessage}`);
    }
  }

  /**
   * Récupère les documents d'un dossier
   * Utilise la même méthode d'appel API que circuit.service.ts
   */
  static async getDocumentsByDossier(dossierId: string): Promise<Document[]> {
    try {
      // Utiliser la même méthode que circuit.service.ts
      const params = {
        documentable_id: dossierId,
        documentable_type: 'App\\Models\\Dossier'
      };
      
      const res = await axiosClient.get<Document[]>(CircuitSuiviService.documentsUrl, { params });
      
      // Gérer les différents formats de réponse
      let documents: Document[] = [];
      
      if (Array.isArray(res.data)) {
        documents = res.data;
      } else if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
        documents = (res.data as any).data;
      } else if (res.data && typeof res.data === 'object' && 'success' in res.data && Array.isArray((res.data as any).data)) {
        documents = (res.data as any).data;
      }
      
      return documents;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des documents:', error);
      return [];
    }
  }

  /**
   * Upload un document pour un dossier
   * Utilise la même méthode d'appel API que circuit.service.ts
   */
  static async uploadDocument(
    dossierId: string,
    file: File,
    typeDocumentId?: string,
    commentaires?: string
  ): Promise<Document> {
    try {
      // Note: typeDocumentId est ignoré car l'API n'accepte pas type_document_id
      // L'API accepte uniquement: documentable_id, documentable_type, valide, commentaires, fichier, piece_justification_id
      const formData = new FormData();
      formData.append('documentable_id', dossierId);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      formData.append('valide', '0');
      formData.append('commentaires', commentaires || '');
      formData.append('fichier', file, file.name.trim());

      // Utiliser la même méthode que circuit.service.ts
      const res = await axiosClient.post<Document>(
        CircuitSuiviService.documentsUrl,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000 // 5 minutes
        }
      );

      // Gérer les différents formats de réponse
      let document: Document | null = null;
      
      if (res.data && 'id' in res.data) {
        document = res.data as Document;
      } else if (res.data && typeof res.data === 'object' && 'data' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        document = (res.data as any).data as Document;
      } else if (res.data && typeof res.data === 'object' && 'success' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        document = (res.data as any).data as Document;
      }
      
      if (!document) {
        throw new Error('Format de réponse inattendu lors de l\'upload du document');
      }
      
      return document;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'upload du document:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur inconnue';
      throw new Error(`Erreur lors de l'upload du document: ${errorMessage}`);
    }
  }

  /**
   * Met à jour un document (statut de validation et commentaires)
   * Utilise la même méthode d'appel API que circuit.service.ts
   */
  static async updateDocument(
    documentId: string,
    data: { valide: boolean; commentaires?: string }
  ): Promise<Document> {
    try {
      console.log(`📝 Mise à jour du document ID: ${documentId}...`, data);
      
      // Utiliser la même méthode que circuit.service.ts
      const res = await axiosClient.patch<Document>(
        `${CircuitSuiviService.documentsUrl}/${documentId}`,
        {
          valide: data.valide,
          commentaires: data.commentaires || ''
        }
      );
      
      // Gérer les différents formats de réponse
      let document: Document | null = null;
      
      if (res.data && 'id' in res.data) {
        document = res.data as Document;
      } else if (res.data && typeof res.data === 'object' && 'data' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        document = (res.data as any).data as Document;
      } else if (res.data && typeof res.data === 'object' && 'success' in res.data && (res.data as any).data && 'id' in (res.data as any).data) {
        document = (res.data as any).data as Document;
      }
      
      if (!document) {
        throw new Error('Format de réponse inattendu lors de la mise à jour du document');
      }
      
      console.log('✅ Document mis à jour avec succès');
      return document;
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour du document:', error);
      console.error('🔴 Status HTTP:', error.response?.status);
      console.error('🔴 Message:', error.message);
      
      if (error.response?.data) {
        console.error('📋 Réponse du backend:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Gérer les différents types d'erreurs
      if (error.response?.status === 404) {
        throw new Error('Document non trouvé');
      } else if (error.response?.status === 403) {
        throw new Error('Vous n\'avez pas la permission de modifier ce document');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(`Erreur lors de la mise à jour du document: ${error.message || 'Erreur inconnue'}`);
      }
    }
  }

  /**
   * Supprime un document
   * Utilise la même méthode d'appel API que circuit.service.ts
   * Gère le cas où le backend retourne 500 mais supprime quand même le document
   * Retourne true si la suppression a réussi (même avec erreur 500), false sinon
   */
  static async deleteDocument(documentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`🗑️ Suppression du document ID: ${documentId}...`);
      
      // Utiliser la même méthode que circuit.service.ts
      await axiosClient.delete(`${CircuitSuiviService.documentsUrl}/${documentId}`);
      
      console.log('✅ Document supprimé avec succès');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du document:', error);
      console.error('🔴 Status HTTP:', error.response?.status);
      console.error('🔴 Message:', error.message);
      
      if (error.response?.data) {
        console.error('📋 Réponse du backend:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Cas spécial : Si le backend retourne 500, vérifier si le document existe encore
      // Parfois le backend supprime le document mais retourne quand même une erreur 500
      if (error.response?.status === 500) {
        console.log('⚠️ Erreur 500 détectée, vérification si le document existe encore...');
        try {
          // Vérifier si le document existe encore
          await axiosClient.get(`${CircuitSuiviService.documentsUrl}/${documentId}`);
          // Si on arrive ici, le document existe encore, donc l'erreur est réelle
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error || 
                             'Erreur serveur lors de la suppression du document';
          return { success: false, message: `Erreur serveur (500): ${errorMessage}` };
        } catch (checkError: any) {
          // Si le document n'existe plus (404), considérer la suppression comme réussie
          if (checkError.response?.status === 404) {
            console.log('✅ Document supprimé avec succès (vérifié après erreur 500)');
            return { success: true }; // Succès même avec erreur 500
          }
          // Sinon, retourner l'erreur
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error || 
                             'Erreur serveur lors de la suppression du document';
          return { success: false, message: `Erreur serveur (500): ${errorMessage}` };
        }
      }
      
      // Gérer les autres types d'erreurs
      if (error.response?.status === 404) {
        // Document déjà supprimé, considérer comme succès
        console.log('✅ Document déjà supprimé (404)');
        return { success: true };
      } else if (error.response?.status === 403) {
        return { success: false, message: 'Vous n\'avez pas la permission de supprimer ce document' };
      } else if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      } else {
        return { success: false, message: `Erreur lors de la suppression du document: ${error.message || 'Erreur inconnue'}` };
      }
    }
  }
}

// Export d'une instance pour compatibilité avec le code existant
export const circuitSuiviService = {
  getCircuits: CircuitSuiviService.getCircuits,
  getCircuitByNomEntite: CircuitSuiviService.getCircuitByNomEntite,
  getCircuitsActifs: CircuitSuiviService.getCircuitsActifs,
  getEtapesByCircuitId: CircuitSuiviService.getEtapesByCircuitId,
  getDossiersByTypeDemande: CircuitSuiviService.getDossiersByTypeDemande,
  createDossier: CircuitSuiviService.createDossier,
  transmettreEtape: CircuitSuiviService.transmettreEtape,
  updateDossierStatut: CircuitSuiviService.updateDossierStatut,
  getDocumentsByDossier: CircuitSuiviService.getDocumentsByDossier,
  uploadDocument: CircuitSuiviService.uploadDocument,
  updateDocument: CircuitSuiviService.updateDocument,
  deleteDocument: CircuitSuiviService.deleteDocument,
  clearCache: CircuitSuiviService.clearCache
};

