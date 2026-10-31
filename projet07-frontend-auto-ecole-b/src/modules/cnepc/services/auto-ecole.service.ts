// Service pour la gestion des auto-écoles
import axiosClient from '../../../shared/utils/axiosConfig';
import {
  AutoEcole,
  AutoEcoleFormData,
  AutoEcoleResponse,
  AutoEcoleListResponse,
  MesDossiersResponse,
  Candidat,
  CandidatFormData,
  CandidatListResponse,
  Formation,
  FormationFormData,
  Dossier,
  DossierFormData,
  AutoEcoleFilters,
  DossierFilters,
  CandidatFilters,
  CandidatInscription,
} from '../types/auto-ecole';

export class AutoEcoleService {
  // ===== GESTION DES AUTO-ÉCOLES =====

  /** Options de requête (ex. timeout pour dashboard). */
  private static getRequestConfig(custom?: { timeout?: number }) {
    return custom?.timeout != null ? { timeout: custom.timeout } : undefined;
  }

  private static buildFallbackAutoEcolesResponse(
    items: AutoEcole[],
    page: number,
    perPage: number
  ): AutoEcoleListResponse {
    const currentPage = Math.max(1, page);
    const pageSize = Math.max(1, perPage);
    const total = items.length;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(currentPage, lastPage);
    const start = (safePage - 1) * pageSize;
    const data = items.slice(start, start + pageSize);

    return {
      data,
      links: {
        first: `?page=1`,
        last: `?page=${lastPage}`,
        prev: safePage > 1 ? `?page=${safePage - 1}` : null,
        next: safePage < lastPage ? `?page=${safePage + 1}` : null,
      },
      meta: {
        current_page: safePage,
        from: data.length > 0 ? start + 1 : 0,
        last_page: lastPage,
        path: '/auto-ecoles',
        per_page: pageSize,
        to: data.length > 0 ? start + data.length : 0,
        total,
      },
    };
  }

  private static asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private static asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private static toStr(value: unknown, fallback = ''): string {
    if (value == null) return fallback;
    const s = String(value).trim();
    return s || fallback;
  }

  private static toBool(value: unknown, fallback = true): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const s = value.trim().toLowerCase();
      if (s === 'true' || s === '1' || s === 'active') return true;
      if (s === 'false' || s === '0' || s === 'inactive') return false;
    }
    return fallback;
  }

  private static normalizeAutoEcole(input: unknown): AutoEcole | null {
    const src = AutoEcoleService.asRecord(input);
    if (!src) return null;

    const id = AutoEcoleService.toStr(src.id);
    const nom = AutoEcoleService.toStr(src.nom_auto_ecole ?? src.nom);
    if (!id || !nom) return null;

    const responsableSrc = AutoEcoleService.asRecord(src.responsable);
    const responsable = {
      id: AutoEcoleService.toStr(
        responsableSrc?.id ?? src.responsable_id ?? src.utilisateur_id ?? `resp-${id}`
      ),
      utilisateur_id: AutoEcoleService.toStr(responsableSrc?.utilisateur_id),
      nom: AutoEcoleService.toStr(responsableSrc?.nom),
      prenom: AutoEcoleService.toStr(responsableSrc?.prenom),
      nom_complet: AutoEcoleService.toStr(responsableSrc?.nom_complet),
      email: AutoEcoleService.toStr(responsableSrc?.email),
      contact: AutoEcoleService.toStr(responsableSrc?.contact ?? responsableSrc?.telephone),
      adresse: AutoEcoleService.toStr(responsableSrc?.adresse),
      created_at: AutoEcoleService.toStr(
        responsableSrc?.created_at,
        src.created_at ? String(src.created_at) : new Date().toISOString()
      ),
      updated_at: AutoEcoleService.toStr(
        responsableSrc?.updated_at,
        src.updated_at ? String(src.updated_at) : new Date().toISOString()
      ),
    };

    return {
      id,
      nom_auto_ecole: nom,
      adresse: AutoEcoleService.toStr(src.adresse),
      email: AutoEcoleService.toStr(src.email),
      contact: AutoEcoleService.toStr(src.contact),
      statut: AutoEcoleService.toBool(src.statut, true),
      statut_libelle: AutoEcoleService.toStr(
        src.statut_libelle,
        AutoEcoleService.toBool(src.statut, true) ? 'Actif' : 'Inactif'
      ),
      responsable_id: AutoEcoleService.toStr(src.responsable_id, responsable.id),
      responsable,
      formations: AutoEcoleService.asArray(src.formations) as any,
      dossiers: AutoEcoleService.asArray(src.dossiers) as any,
      created_at: AutoEcoleService.toStr(
        src.created_at,
        new Date().toISOString()
      ),
      updated_at: AutoEcoleService.toStr(
        src.updated_at,
        new Date().toISOString()
      ),
    };
  }

  private static extractAutoEcolesFromPayload(payload: unknown): AutoEcole[] {
    const root = AutoEcoleService.asRecord(payload);
    const candidates: unknown[] = [
      ...AutoEcoleService.asArray(payload),
      ...AutoEcoleService.asArray(root?.data),
      ...AutoEcoleService.asArray(root?.dossiers).flatMap((d) => {
        const rec = AutoEcoleService.asRecord(d);
        const direct = rec?.auto_ecole;
        const viaFormation = AutoEcoleService.asRecord(rec?.formation)?.auto_ecole;
        return [direct, viaFormation];
      }),
    ];

    const map = new Map<string, AutoEcole>();
    candidates.forEach((item) => {
      const normalized = AutoEcoleService.normalizeAutoEcole(item);
      if (normalized) map.set(normalized.id, normalized);
    });
    return Array.from(map.values());
  }

  private static applyAutoEcolesFilters(
    items: AutoEcole[],
    filters?: AutoEcoleFilters
  ): AutoEcole[] {
    if (!filters) return items;
    let list = [...items];
    if (filters.statut !== undefined) {
      list = list.filter((ae) => Boolean(ae.statut) === Boolean(filters.statut));
    }
    if (filters.responsable_id) {
      const rid = String(filters.responsable_id).trim();
      list = list.filter((ae) => ae.responsable_id === rid || ae.responsable?.id === rid);
    }
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      if (q) {
        list = list.filter((ae) => {
          const haystack = [
            ae.nom_auto_ecole,
            ae.email,
            ae.contact,
            ae.adresse,
            ae.responsable?.nom,
            ae.responsable?.prenom,
            ae.responsable?.email,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });
      }
    }
    return list;
  }

  /** Clés de relations lourdes souvent incluses par l'API (dossiers, etc.). */
  private static readonly HEAVY_RELATION_KEYS = [
    'dossiers',
    'formations',
    'candidats',
    'documents',
    'inscriptions',
  ] as const;

  /** Retire les relations lourdes du JSON avant parsing complet côté client. */
  private static stripHeavyAutoEcoleRelations(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item) => AutoEcoleService.stripHeavyAutoEcoleRelations(item));
      return;
    }
    const rec = node as Record<string, unknown>;
    for (const key of AutoEcoleService.HEAVY_RELATION_KEYS) {
      if (key in rec) delete rec[key];
    }
    for (const value of Object.values(rec)) {
      AutoEcoleService.stripHeavyAutoEcoleRelations(value);
    }
  }

  private static liteJsonTransformResponse(data: string): unknown {
    if (!data || typeof data !== 'string') return data;
    try {
      const parsed = JSON.parse(data);
      AutoEcoleService.stripHeavyAutoEcoleRelations(parsed);
      return parsed;
    } catch {
      return data;
    }
  }

  private static mapPayloadToAutoEcoleSelectRows(
    payload: unknown
  ): Array<{ id: string; nom_auto_ecole: string }> {
    const root = AutoEcoleService.asRecord(payload);
    const list = [
      ...AutoEcoleService.asArray(payload),
      ...AutoEcoleService.asArray(root?.data),
    ];
    const map = new Map<string, { id: string; nom_auto_ecole: string }>();
    for (const item of list) {
      const rec = AutoEcoleService.asRecord(item);
      if (!rec) continue;
      const attrs = AutoEcoleService.asRecord(rec.attributes);
      const id = AutoEcoleService.toStr(rec.id ?? attrs?.id);
      const nom = AutoEcoleService.toStr(rec.nom_auto_ecole ?? rec.nom ?? attrs?.nom_auto_ecole ?? attrs?.nom);
      if (id && nom) map.set(id, { id, nom_auto_ecole: nom });
    }
    return Array.from(map.values());
  }

  private static mapPayloadToFormationSelectRows(payload: unknown): Array<{
    id: string;
    type_permis_id?: string;
    type_permis?: { id: string; code: string; libelle?: string };
    montant?: number;
    statut?: boolean;
  }> {
    const root = AutoEcoleService.asRecord(payload);
    const list = [
      ...AutoEcoleService.asArray(payload),
      ...AutoEcoleService.asArray(root?.data),
    ];
    return list
      .map((item) => {
        const rec = AutoEcoleService.asRecord(item);
        if (!rec) return null;
        const attrs = AutoEcoleService.asRecord(rec.attributes);
        const id = AutoEcoleService.toStr(rec.id ?? attrs?.id);
        if (!id) return null;
        const typePermisSrc = AutoEcoleService.asRecord(rec.type_permis ?? attrs?.type_permis);
        const type_permis = typePermisSrc
          ? {
              id: AutoEcoleService.toStr(typePermisSrc.id),
              code: AutoEcoleService.toStr(typePermisSrc.code),
              libelle: AutoEcoleService.toStr(typePermisSrc.libelle) || undefined,
            }
          : undefined;
        const montantRaw = rec.montant ?? attrs?.montant;
        const montant =
          typeof montantRaw === 'number'
            ? montantRaw
            : montantRaw != null && montantRaw !== ''
              ? Number(montantRaw)
              : undefined;
        return {
          id,
          type_permis_id: AutoEcoleService.toStr(rec.type_permis_id ?? attrs?.type_permis_id) || undefined,
          type_permis: type_permis?.id || type_permis?.code ? type_permis : undefined,
          montant: Number.isFinite(montant) ? montant : undefined,
          statut: AutoEcoleService.toBool(rec.statut ?? attrs?.statut, true),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }

  /**
   * Liste légère pour les sélecteurs (id + nom uniquement).
   * GET /auto-ecoles paginé — les dossiers imbriqués sont ignorés côté client.
   */
  async listAutoEcolesForSelect(
    maxItems = 200,
    requestConfig?: { timeout?: number }
  ): Promise<Array<{ id: string; nom_auto_ecole: string }>> {
    const config = {
      ...AutoEcoleService.getRequestConfig(requestConfig),
      transformResponse: [AutoEcoleService.liteJsonTransformResponse],
    };
    const perPage = Math.min(Math.max(1, maxItems), 100);
    const collected = new Map<string, { id: string; nom_auto_ecole: string }>();
    let page = 1;
    let lastPage = 1;

    while (page <= lastPage && collected.size < maxItems) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      const response = await axiosClient.get(`/auto-ecoles?${params}`, config);
      const rows = AutoEcoleService.mapPayloadToAutoEcoleSelectRows(response.data);
      rows.forEach((row) => collected.set(row.id, row));
      const meta = AutoEcoleService.asRecord(response.data)?.meta;
      lastPage = Math.max(1, Number(meta?.last_page ?? page));
      if (!rows.length) break;
      page += 1;
    }

    return Array.from(collected.values()).slice(0, maxItems);
  }

  private static normalizeFormation(input: unknown, autoEcoleIdFallback = ''): Formation | null {
    const src = AutoEcoleService.asRecord(input);
    if (!src) return null;
    const attrs = AutoEcoleService.asRecord(src.attributes);
    const id = AutoEcoleService.toStr(src.id ?? attrs?.id);
    if (!id) return null;

    const typePermisSrc = AutoEcoleService.asRecord(
      src.type_permis ?? attrs?.type_permis ?? src.typePermis
    );
    const type_permis_id = AutoEcoleService.toStr(
      src.type_permis_id ?? attrs?.type_permis_id ?? typePermisSrc?.id
    );
    const montantRaw = src.montant ?? attrs?.montant;
    const montant =
      typeof montantRaw === 'number'
        ? montantRaw
        : montantRaw != null && montantRaw !== ''
          ? Number(montantRaw)
          : undefined;
    const now = new Date().toISOString();

    return {
      id,
      auto_ecole_id: AutoEcoleService.toStr(
        src.auto_ecole_id ?? attrs?.auto_ecole_id ?? autoEcoleIdFallback
      ),
      type_permis_id,
      montant: Number.isFinite(montant) ? montant : undefined,
      montant_formate:
        AutoEcoleService.toStr(src.montant_formate ?? attrs?.montant_formate) || undefined,
      nom: AutoEcoleService.toStr(src.nom ?? attrs?.nom) || undefined,
      statut: AutoEcoleService.toBool(src.statut ?? attrs?.statut, true),
      statut_libelle: AutoEcoleService.toStr(
        src.statut_libelle ?? attrs?.statut_libelle,
        AutoEcoleService.toBool(src.statut ?? attrs?.statut, true) ? 'Actif' : 'Inactif'
      ),
      type_permis: typePermisSrc
        ? ({
            id: AutoEcoleService.toStr(typePermisSrc.id),
            libelle: AutoEcoleService.toStr(typePermisSrc.libelle),
            code: AutoEcoleService.toStr(typePermisSrc.code),
            type_ref: AutoEcoleService.toStr(typePermisSrc.type_ref, 'type_permis'),
            statut: AutoEcoleService.toBool(typePermisSrc.statut, true),
            statut_libelle: AutoEcoleService.toStr(typePermisSrc.statut_libelle, 'Actif'),
            description: AutoEcoleService.toStr(typePermisSrc.description),
            created_at: AutoEcoleService.toStr(typePermisSrc.created_at, now),
            updated_at: AutoEcoleService.toStr(typePermisSrc.updated_at, now),
          } as Formation['type_permis'])
        : undefined,
      created_at: AutoEcoleService.toStr(src.created_at ?? attrs?.created_at, now),
      updated_at: AutoEcoleService.toStr(src.updated_at ?? attrs?.updated_at, now),
    };
  }

  private static extractCnepcBundleFromPayload(payload: unknown): {
    autoEcole: AutoEcole;
    formations: Formation[];
  } | null {
    const root = AutoEcoleService.asRecord(payload);
    const data = AutoEcoleService.asRecord(root?.data) ?? root;
    if (!data) return null;

    const aeCandidate =
      data.auto_ecole ??
      data.autoEcole ??
      (data.nom_auto_ecole || data.nom ? data : null);
    const autoEcole = AutoEcoleService.normalizeAutoEcole(aeCandidate);
    if (!autoEcole) return null;

    const formationSources = [
      ...AutoEcoleService.asArray(data.formations),
      ...AutoEcoleService.asArray(data.formations_actives),
      ...AutoEcoleService.asArray(data.active_formations),
      ...AutoEcoleService.asArray(
        AutoEcoleService.asRecord(aeCandidate)?.formations
      ),
      ...AutoEcoleService.asArray(
        AutoEcoleService.asRecord(aeCandidate)?.formations_actives
      ),
      ...AutoEcoleService.asArray(autoEcole.formations),
    ];
    const formationsMap = new Map<string, Formation>();
    formationSources.forEach((item) => {
      const normalized = AutoEcoleService.normalizeFormation(item, autoEcole.id);
      if (normalized && normalized.statut !== false) {
        formationsMap.set(normalized.id, normalized);
      }
    });

    return {
      autoEcole,
      formations: Array.from(formationsMap.values()),
    };
  }

  static findFormationForReferenciel(
    formations: Formation[],
    referencielId: string
  ): Formation | null {
    const refId = String(referencielId ?? '').trim();
    if (!refId || !formations.length) return null;
    return (
      formations.find((formation) => {
        const typePermisId =
          formation.type_permis_id ||
          (formation.type_permis as { id?: string } | undefined)?.id ||
          (formation.typePermis as { id?: string } | undefined)?.id;
        return typePermisId === refId;
      }) ?? null
    );
  }

  /**
   * Auto-école CNEPC et ses formations actives — GET /auto-ecoles/cnepc
   * (sans liteJsonTransformResponse : les formations imbriquées doivent être conservées)
   */
  async getCnepcAutoEcole(requestConfig?: { timeout?: number }): Promise<{
    autoEcole: AutoEcole;
    formations: Formation[];
  } | null> {
    const config = AutoEcoleService.getRequestConfig(requestConfig);
    try {
      const response = await axiosClient.get('/auto-ecoles/cnepc', config);
      let bundle = AutoEcoleService.extractCnepcBundleFromPayload(response.data);
      if (!bundle) return null;

      if (bundle.formations.length === 0 && bundle.autoEcole.id) {
        try {
          const list = await this.getFormationsByAutoEcole(bundle.autoEcole.id);
          const active = (Array.isArray(list) ? list : []).filter(
            (f) => f.statut !== false
          );
          if (active.length > 0) {
            bundle = { ...bundle, formations: active };
          }
        } catch (fallbackErr) {
          console.warn('Formations CNEPC via /formations (secours):', fallbackErr);
        }
      }

      return bundle;
    } catch (error) {
      console.warn('GET /auto-ecoles/cnepc indisponible:', error);
      return null;
    }
  }

  /**
   * Résout l'auto-école CNEPC et la formation correspondant à un référentiel type permis.
   */
  async resolveCnepcForReferenciel(
    referencielId: string,
    requestConfig?: { timeout?: number }
  ): Promise<{ autoEcole: AutoEcole; formation: Formation } | null> {
    const refId = String(referencielId ?? '').trim();
    if (!refId) return null;

    const bundle = await this.getCnepcAutoEcole(requestConfig);
    if (!bundle) return null;

    const formation = AutoEcoleService.findFormationForReferenciel(
      bundle.formations,
      refId
    );
    if (!formation) return null;

    return { autoEcole: bundle.autoEcole, formation };
  }

  /**
   * Recherche l'auto-école CNEPC (GET /auto-ecoles/cnepc, puis recherche paginée en secours).
   */
  async findCnepcAutoEcoleForSelect(
    requestConfig?: { timeout?: number }
  ): Promise<{ id: string; nom_auto_ecole: string } | null> {
    const bundle = await this.getCnepcAutoEcole(requestConfig);
    if (bundle?.autoEcole?.id) {
      return {
        id: bundle.autoEcole.id,
        nom_auto_ecole: bundle.autoEcole.nom_auto_ecole,
      };
    }

    const config = {
      ...AutoEcoleService.getRequestConfig(requestConfig),
      transformResponse: [AutoEcoleService.liteJsonTransformResponse],
    };
    for (const search of ['CNEPC', 'cnepc']) {
      const params = new URLSearchParams({ page: '1', per_page: '25', search });
      const response = await axiosClient.get(`/auto-ecoles?${params}`, config);
      const rows = AutoEcoleService.mapPayloadToAutoEcoleSelectRows(response.data);
      const exact = rows.find((ae) => ae.nom_auto_ecole.trim().toUpperCase() === 'CNEPC');
      if (exact) return exact;
      const partial = rows.find((ae) => ae.nom_auto_ecole.toLowerCase().includes('cnepc'));
      if (partial) return partial;
    }
    return null;
  }

  /**
   * Formations d'une auto-école pour sélecteur (sans dossiers / relations lourdes).
   */
  async listFormationsForSelect(
    autoEcoleId: string,
    requestConfig?: { timeout?: number }
  ): Promise<
    Array<{
      id: string;
      type_permis_id?: string;
      type_permis?: { id: string; code: string; libelle?: string };
      montant?: number;
    }>
  > {
    const id = String(autoEcoleId ?? '').trim();
    if (!id) return [];
    const config = {
      ...AutoEcoleService.getRequestConfig(requestConfig),
      transformResponse: [AutoEcoleService.liteJsonTransformResponse],
    };
    const response = await axiosClient.get(
      `/formations?auto_ecole_id=${encodeURIComponent(id)}`,
      config
    );
    return AutoEcoleService.mapPayloadToFormationSelectRows(response.data).filter(
      (f) => f.statut !== false
    );
  }

  private static async loadAutoEcolesFromAlternatives(config?: { timeout?: number }): Promise<AutoEcole[]> {
    const requestConfig = AutoEcoleService.getRequestConfig(config);
    const endpoints = [
      '/dossiers?per_page=1000',
      '/utilisateurs/agents?role=ROLE_AUTO_ECOLE&per_page=1000',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axiosClient.get(endpoint, requestConfig);
        const extracted = AutoEcoleService.extractAutoEcolesFromPayload(response?.data);
        if (extracted.length > 0) return extracted;
      } catch (altError) {
        console.warn(`Fallback auto-écoles échoué via ${endpoint}:`, altError);
      }
    }
    return [];
  }

  /**
   * Récupère la liste paginée de toutes les auto-écoles
   */
  async getAutoEcoles(
    page: number = 1,
    perPage: number = 15,
    filters?: AutoEcoleFilters,
    requestConfig?: { timeout?: number }
  ): Promise<AutoEcoleListResponse> {
    const config = AutoEcoleService.getRequestConfig(requestConfig);
    const noAuthConfig = {
      ...(config ?? {}),
      headers: {
        ...((config as { headers?: Record<string, string> } | undefined)?.headers ?? {}),
        'X-Skip-Auth': '1',
      },
    };
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(filters?.statut !== undefined && { statut: filters.statut.toString() }),
        ...(filters?.responsable_id && { responsable_id: filters.responsable_id }),
        ...(filters?.search && { search: filters.search }),
      });

      const response = await axiosClient.get(`/auto-ecoles?${params}`, config);
      return response.data;
    } catch (error: any) {
      // Si le backend tombe en 500 sur /auto-ecoles, on tente d'autres sources.
      if (error?.response?.status === 500) {
        // 1) Retry sans pagination querystring: certains backends 500 avec page/per_page.
        try {
          const response = await axiosClient.get('/auto-ecoles', config);
          const extracted = AutoEcoleService.extractAutoEcolesFromPayload(response?.data);
          const filtered = AutoEcoleService.applyAutoEcolesFilters(extracted, filters);
          return AutoEcoleService.buildFallbackAutoEcolesResponse(filtered, page, perPage);
        } catch (noQueryError) {
          console.warn('Retry /auto-ecoles sans query en échec:', noQueryError);
        }

        // 1bis) Retry sans Authorization (appel "Postman-like").
        try {
          const responseNoAuth = await axiosClient.get('/auto-ecoles', noAuthConfig);
          const extracted = AutoEcoleService.extractAutoEcolesFromPayload(responseNoAuth?.data);
          const filtered = AutoEcoleService.applyAutoEcolesFilters(extracted, filters);
          return AutoEcoleService.buildFallbackAutoEcolesResponse(filtered, page, perPage);
        } catch (noAuthError) {
          console.warn('Retry /auto-ecoles sans Authorization en échec:', noAuthError);
        }

        // 2) Fallback multi-sources.
        const fallbackItems = await AutoEcoleService.loadAutoEcolesFromAlternatives(requestConfig);
        const filtered = AutoEcoleService.applyAutoEcolesFilters(fallbackItems, filters);
        if (filtered.length > 0) {
          return AutoEcoleService.buildFallbackAutoEcolesResponse(filtered, page, perPage);
        }
        console.error('API auto-écoles indisponible (500) et aucune source alternative exploitable.');
      }
      console.error('Erreur lors de la récupération des auto-écoles:', error);
      throw error;
    }
  }

  /**
   * Récupère une auto-école par son ID
   */
  async getAutoEcoleById(id: string): Promise<AutoEcole> {
    try {
      const response = await axiosClient.get(`/auto-ecoles/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'auto-école:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle auto-école
   */
  async createAutoEcole(data: AutoEcoleFormData): Promise<AutoEcoleResponse> {
    try {
      console.log('🚀 Tentative de création d\'auto-école avec les données:', data);
      const response = await axiosClient.post('/auto-ecoles', data);
      console.log('✅ Auto-école créée avec succès:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de l\'auto-école:', error);
      console.error('📊 Détails de l\'erreur:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Gestion spécifique des erreurs d'authentification
      if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.message || 
          'Erreur d\'authentification. Vérifiez que votre token est valide et que vous avez les permissions nécessaires.';
        throw new Error(`🔐 ${errorMessage}`);
      }
      
      if (error.response?.status === 403) {
        throw new Error('🚫 Accès refusé. Votre rôle ne vous permet pas de créer une auto-école.');
      }
      
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.errors;
        if (validationErrors) {
          const errorMessages = Object.entries(validationErrors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          throw new Error(`📝 Erreur de validation: ${errorMessages}`);
        }
      }
      
      if (error.response?.data?.message) {
        throw new Error(`⚠️ ${error.response.data.message}`);
      }
      
      throw new Error(`❌ Erreur inattendue: ${error.message}`);
    }
  }

  /**
   * Met à jour une auto-école existante
   */
  async updateAutoEcole(id: string, data: Partial<AutoEcoleFormData>): Promise<AutoEcoleResponse> {
    try {
      const response = await axiosClient.put(`/auto-ecoles/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'auto-école:', error);
      throw error;
    }
  }

  /**
   * Supprime une auto-école
   */
  async deleteAutoEcole(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axiosClient.delete(`/auto-ecoles/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'auto-école:', error);
      throw error;
    }
  }

  // ===== GESTION DES CANDIDATS =====

  /**
   * Récupère la liste paginée de tous les candidats
   */
  async getCandidats(page: number = 1, perPage: number = 15, filters?: CandidatFilters): Promise<CandidatListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(filters?.nationalite && { nationalite: filters.nationalite }),
        ...(filters?.genre && { genre: filters.genre }),
        ...(filters?.statut && { statut: filters.statut }),
        ...(filters?.search && { search: filters.search }),
      });

      const response = await axiosClient.get(`/candidats?${params}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des candidats:', error);
      throw error;
    }
  }

  /**
   * Récupère un candidat par son ID
   */
  async getCandidatById(id: string): Promise<Candidat> {
    try {
      const response = await axiosClient.get(`/candidats/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du candidat:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau candidat
   * L'API gère automatiquement la création de la personne associée
   */
  async createCandidat(data: any): Promise<{ success: boolean; message: string; data: Candidat }> {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📤 [AUTO-ECOLE SERVICE] CRÉATION D\'UN CANDIDAT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Payload envoyé à POST /candidats:');
      console.log(JSON.stringify(data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const response = await axiosClient.post('/candidats', data);
      
      console.log('✅ [AUTO-ECOLE SERVICE] Candidat créé avec succès !');
      console.log('📄 Réponse de l\'API:', response.data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return response.data;
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [AUTO-ECOLE SERVICE] ERREUR LORS DE LA CRÉATION DU CANDIDAT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🔴 Type d\'erreur:', error.name);
      console.error('🔴 Code d\'erreur:', error.code);
      console.error('🔴 Message:', error.message);
      console.error('🔴 Status HTTP:', error.response?.status);
      
      if (error.response?.data) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('📋 RÉPONSE COMPLÈTE DE L\'API:');
        console.error(JSON.stringify(error.response.data, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (error.response.data.errors) {
          console.log('🔍 DÉTAILS DES ERREURS DE VALIDATION (champ par champ):');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          Object.entries(error.response.data.errors).forEach(([field, messages]: [string, any]) => {
            const messageList = Array.isArray(messages) ? messages : [messages];
            console.error(`   ❌ Champ: "${field}"`);
            messageList.forEach((msg: string, index: number) => {
              console.error(`      ${index + 1}. ${msg}`);
            });
            console.log('   ───────────────────────────────────────────────────────────');
          });
        }
        
        if (error.response.data.message) {
          console.error('💬 Message général de l\'API:', error.response.data.message);
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      throw error;
    }
  }

  /**
   * Met à jour un candidat existant
   */
  async updateCandidat(id: string, data: Partial<CandidatFormData>): Promise<{ success: boolean; message: string; data: Candidat }> {
    try {
      const response = await axiosClient.put(`/candidats/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du candidat:', error);
      throw error;
    }
  }

  /**
   * Inscrit un candidat à une formation dans une auto-école
   */
  async inscrireCandidatFormation(data: {
    auto_ecole_id: string;
    formation_id: string;
    commentaires?: string;
  }): Promise<{ success: boolean; message: string; dossier: Dossier }> {
    try {
      console.log('📝 Inscription du candidat à la formation:', data);
      const response = await axiosClient.post('/candidats/inscription-formation', data);
      console.log('✅ Inscription réussie:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'inscription du candidat:', error);
      throw error;
    }
  }

  // ===== GESTION DES DOSSIERS (CANDIDATS INSCRITS) =====

  /**
   * Crée un nouveau dossier pour inscrire un candidat à une formation dans une auto-école
   */
  async createDossier(data: {
    candidat_id: string;
    type_demande_id: string;
    auto_ecole_id?: string;
    formation_id?: string;
    referenciel_id?: string;
    statut?: string;
    date_creation?: string;
    commentaires?: string;
    numero_permis?: string;
    numero_origine_permis?: string;
    [key: string]: unknown;
  }): Promise<{ success: boolean; message: string; data: Dossier }> {
    try {
      // Supprimer les tirets du numéro de permis avant l'envoi (format stockage : sans tirets)
      const payload = { ...data };
      // Le backend refuse centre_id sur POST /dossiers (règle "prohibited") — le centre est déduit côté serveur
      delete (payload as Record<string, unknown>).centre_id;
      if (payload.numero_permis) {
        payload.numero_permis = String(payload.numero_permis).replace(/-/g, '');
      }
      if (payload.numero_origine_permis) {
        payload.numero_origine_permis = String(payload.numero_origine_permis).replace(/-/g, '');
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📤 [AUTO-ECOLE SERVICE] CRÉATION D\'UN DOSSIER');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Payload envoyé à POST /dossiers:');
      console.log(JSON.stringify(payload, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const response = await axiosClient.post('/dossiers', payload);
      
      console.log('✅ [AUTO-ECOLE SERVICE] Dossier créé avec succès !');
      console.log('📄 Réponse de l\'API:', response.data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return response.data;
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [AUTO-ECOLE SERVICE] ERREUR LORS DE LA CRÉATION DU DOSSIER');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🔴 Type d\'erreur:', error.name);
      console.error('🔴 Code d\'erreur:', error.code);
      console.error('🔴 Message:', error.message);
      console.error('🔴 Status HTTP:', error.response?.status);
      
      if (error.response?.data) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('📋 RÉPONSE COMPLÈTE DE L\'API:');
        console.error(JSON.stringify(error.response.data, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (error.response.data.errors) {
          console.log('🔍 DÉTAILS DES ERREURS DE VALIDATION (champ par champ):');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          Object.entries(error.response.data.errors).forEach(([field, messages]: [string, any]) => {
            const messageList = Array.isArray(messages) ? messages : [messages];
            console.error(`   ❌ Champ: "${field}"`);
            messageList.forEach((msg: string, index: number) => {
              console.error(`      ${index + 1}. ${msg}`);
            });
            console.log('   ───────────────────────────────────────────────────────────');
          });
        }
        
        if (error.response.data.message) {
          console.error('💬 Message général de l\'API:', error.response.data.message);
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      throw error;
    }
  }

  /**
   * Récupère tous les dossiers d'une auto-école spécifique par son ID
   * Utilisé pour afficher les dossiers d'une auto-école sélectionnée (vue admin)
   */
  async getDossiersByAutoEcoleId(
    autoEcoleId: string,
    filters?: DossierFilters,
    requestConfig?: { timeout?: number }
  ): Promise<{ success: boolean; dossiers: Dossier[]; auto_ecole?: AutoEcole; statistiques?: any }> {
    try {
      const params = new URLSearchParams();
      params.append('auto_ecole_id', autoEcoleId);
      if (filters?.statut) params.append('statut', filters.statut);
      if (filters?.formation_id) params.append('formation_id', filters.formation_id);
      if (filters?.candidat_id) params.append('candidat_id', filters.candidat_id);

      const queryString = params.toString();
      const endpoint = `/dossiers${queryString ? `?${queryString}` : ''}`;
      const config = AutoEcoleService.getRequestConfig(requestConfig);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 [AUTO-ECOLE SERVICE] RÉCUPÉRATION DES DOSSIERS PAR ID');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏫 Auto-École ID:', autoEcoleId);
      console.log('🔗 Endpoint:', endpoint);
      console.log('🔗 URL complète:', `${axiosClient.defaults.baseURL}${endpoint}`);
      console.log('🔍 Filtres:', filters);
      console.log('🔑 Token présent:', !!localStorage.getItem('access_token'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await axiosClient.get(endpoint, config);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ [AUTO-ECOLE SERVICE] DOSSIERS RÉCUPÉRÉS AVEC SUCCÈS !');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Nombre de dossiers:', response.data.data?.length || response.data.length || 0);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // L'endpoint /dossiers retourne un format différent de /auto-ecoles/mes-dossiers
      // Normaliser la réponse pour la compatibilité
      return {
        success: true,
        dossiers: response.data.data || response.data || [],
        auto_ecole: undefined, // Pas d'info auto-école dans /dossiers
        statistiques: undefined
      };
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [AUTO-ECOLE SERVICE] ERREUR LORS DE LA RÉCUPÉRATION DES DOSSIERS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🔴 Status HTTP:', error.response?.status);
      console.error('🔴 Message:', error.message);
      console.error('🔴 URL appelée:', error.config?.url);
      
      if (error.response?.data) {
        console.error('📋 Réponse du backend:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      throw error;
    }
  }

  /**
   * Récupère tous les dossiers (candidats inscrits) de l'auto-école du responsable connecté
   */
  async getMesDossiers(filters?: DossierFilters): Promise<MesDossiersResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.statut) params.append('statut', filters.statut);
      if (filters?.formation_id) params.append('formation_id', filters.formation_id);
      if (filters?.candidat_id) params.append('candidat_id', filters.candidat_id);

      const queryString = params.toString();
      const endpoint = `/auto-ecoles/mes-dossiers${queryString ? `?${queryString}` : ''}`;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 [AUTO-ECOLE SERVICE] RÉCUPÉRATION DE MES DOSSIERS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔗 Endpoint:', endpoint);
      console.log('🔗 URL complète:', `${axiosClient.defaults.baseURL}${endpoint}`);
      console.log('🔍 Filtres:', filters);
      console.log('🔑 Token présent:', !!localStorage.getItem('access_token'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const response = await axiosClient.get(endpoint);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ [AUTO-ECOLE SERVICE] DOSSIERS RÉCUPÉRÉS AVEC SUCCÈS !');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Statistiques:', response.data.statistiques);
      console.log('🏫 Auto-école:', response.data.auto_ecole?.nom_auto_ecole);
      console.log('📋 Nombre de dossiers:', response.data.dossiers?.length || 0);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return response.data;
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [AUTO-ECOLE SERVICE] ERREUR LORS DE LA RÉCUPÉRATION DES DOSSIERS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🔴 Status HTTP:', error.response?.status);
      console.error('🔴 Message:', error.message);
      console.error('🔴 URL appelée:', error.config?.url);
      console.error('🔴 Méthode:', error.config?.method?.toUpperCase());
      
      if (error.response?.status === 404) {
        console.error('❌ ERREUR 404 - Endpoint non trouvé !');
        console.error('💡 Vérifications à faire:');
        console.error('   1. L\'endpoint existe-t-il sur le backend ?');
        console.error('   2. Le rôle de l\'utilisateur est-il correct ? (ROLE_AUTO_ECOLE)');
        console.error('   3. L\'utilisateur est-il responsable d\'une auto-école ?');
      }
      
      if (error.response?.status === 401) {
        console.error('❌ ERREUR 401 - Non authentifié !');
        console.error('💡 Le token est peut-être expiré ou invalide');
      }
      
      if (error.response?.data) {
        console.error('📋 Réponse du backend:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      throw error;
    }
  }

  /**
   * Récupère un dossier par son ID
   */
  async getDossierById(id: string): Promise<Dossier> {
    try {
      const response = await axiosClient.get(`/dossiers/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du dossier:', error);
      throw error;
    }
  }

  /**
   * Met à jour un dossier existant
   */
  async updateDossier(id: string, data: Partial<DossierFormData>): Promise<{ success: boolean; message: string; data: Dossier }> {
    try {
      const payload = { ...data };
      delete (payload as Record<string, unknown>).centre_id;
      const response = await axiosClient.put(`/dossiers/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du dossier:', error);
      throw error;
    }
  }

  /**
   * Supprime un dossier (demande d'inscription)
   */
  async deleteDossier(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ Suppression du dossier ID: ${id}...`);
      const response = await axiosClient.delete(`/dossiers/${id}`);
      console.log('✅ Dossier supprimé avec succès:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du dossier:', error);
      console.error('🔴 Status HTTP:', error.response?.status);
      console.error('🔴 Message:', error.message);
      if (error.response?.data) {
        console.error('📋 Réponse du backend:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  // ===== GESTION DES FORMATIONS =====

  /**
   * Récupère les formations d'une auto-école
   */
  async getFormationsByAutoEcole(autoEcoleId: string): Promise<Formation[]> {
    try {
      const response = await axiosClient.get(`/formations?auto_ecole_id=${autoEcoleId}`);
      // La réponse peut être soit { data: [...] } soit directement un array
      return Array.isArray(response.data) ? response.data : (response.data.data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des formations:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les auto-écoles disponibles
   */
  async getAllAutoEcoles(): Promise<any[]> {
    try {
      console.log('🏫 Récupération de toutes les auto-écoles...');
      const response = await axiosClient.get('/auto-ecoles');
      
      // Format de réponse peut varier
      if (response.data.success && response.data.data) {
        return Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des auto-écoles:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les formations disponibles
   */
  async getAllFormations(): Promise<any[]> {
    try {
      console.log('📚 Récupération de toutes les formations...');
      const response = await axiosClient.get('/formations');
      
      // Format de réponse peut varier
      if (response.data.success && response.data.data) {
        return Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des formations:', error);
      throw error;
    }
  }

  /**
   * Récupère une formation par son ID
   */
  async getFormationById(id: string): Promise<any> {
    try {
      console.log(`📚 Récupération de la formation ID: ${id}...`);
      const response = await axiosClient.get(`/formations/${id}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur lors de la récupération de la formation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupère tous les candidats avec leurs informations complètes
   */
  async getAllCandidats(): Promise<any[]> {
    try {
      console.log('👥 Récupération de tous les candidats...');
      const response = await axiosClient.get('/candidats');
      
      // Format de réponse peut varier
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des candidats:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle formation
   */
  async createFormation(data: FormationFormData): Promise<{ success: boolean; message: string; data: Formation }> {
    try {
      const response = await axiosClient.post('/formations', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la formation:', error);
      throw error;
    }
  }

  /**
   * Met à jour une formation existante
   */
  async updateFormation(id: string, data: Partial<FormationFormData>): Promise<{ success: boolean; message: string; data: Formation }> {
    try {
      const response = await axiosClient.put(`/formations/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la formation:', error);
      throw error;
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Vérifie si l'utilisateur connecté est responsable d'une auto-école
   */
  async checkAutoEcoleResponsable(): Promise<boolean> {
    try {
      const response = await axiosClient.get('/auto-ecoles/mes-dossiers');
      return response.data.success;
    } catch (error) {
      console.error('Erreur lors de la vérification du responsable:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques d'une auto-école
   */
  async getAutoEcoleStats(autoEcoleId: string): Promise<{
    total_candidats: number;
    dossiers_en_attente: number;
    dossiers_en_cours: number;
    dossiers_valides: number;
    dossiers_rejetes: number;
  }> {
    try {
      const response = await axiosClient.get(`/auto-ecoles/${autoEcoleId}/statistiques`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  /**
   * Récupère la liste des candidats inscrits à des formations
   * Pour l'affichage dans les demandes d'inscription
   */
  async getCandidatsInscrits(): Promise<CandidatInscription[]> {
    try {
      console.log('🔄 Récupération des candidats inscrits...');
      const response = await axiosClient.get('/candidats/inscription-formation');
      
      console.log('📋 Réponse candidats inscrits:', response.data);
      
      if (response.data.success && response.data.data) {
        console.log('✅ Candidats inscrits récupérés:', response.data.data.length);
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        console.log('✅ Candidats inscrits récupérés (format array):', response.data.length);
        return response.data;
      } else {
        console.warn('⚠️ Format de réponse inattendu:', response.data);
        return [];
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des candidats inscrits:', error);
      console.error('🔴 Status HTTP:', error.response?.status);
      console.error('🔴 Message:', error.message);
      
      if (error.response?.data) {
        console.error('📋 Réponse du backend:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw error;
    }
  }
}

// Instance singleton du service
export const autoEcoleService = new AutoEcoleService();
