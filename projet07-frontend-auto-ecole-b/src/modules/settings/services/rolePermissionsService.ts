/**
 * Service pour les permissions par rôle (items de la sidebar).
 * GET /role-has-permissions/by-role/{role} → liste des permissions pour un rôle.
 * POST /role-has-permissions → créer/ajouter permissions pour un rôle.
 * PUT /role-has-permissions/{role_has_permission} → modifier les permissions pour un rôle donné.
 */
import { API_ENDPOINTS } from '../../../shared/constants/api';
import { toCanonicalRole } from '../../../shared/config/rolesPermissionsConfig';
import { BaseService } from '../../../shared/services/BaseService';

export interface RolePermissionItem {
  id?: number | string;
  role: string;
  permission: string[];
}

/** Payload pour POST / PUT : permissions d'un rôle */
export interface UpdateRolePermissionsPayload {
  role?: string;
  permission: string[];
}

/** Réponse possible du GET by-role : { success, data } ou tableau ou objet avec permission et optionnel id */
type PermissionsByRoleResponse =
  | string[]
  | { success?: boolean; data?: unknown }
  | { id?: number | string; permission?: string[]; permissions?: string[]; data?: { id?: number | string; permission?: string[] } };

class RolePermissionsService extends BaseService {
  /**
   * GET /role-has-permissions?per_page=100 : récupère toutes les permissions de tous les rôles en 1 SEULE requête HTTP.
   */
  async getAllRolePermissions(): Promise<Array<{ id: number | string; role: string; permissions: string[] }>> {
    const response = await this.api.get<{ success: boolean; data: any[] }>(`${this.endpoint}?per_page=100`);
    const items = response.data?.data ?? [];
    return items.map((item) => {
      let permissions: string[] = [];
      const perm = item.permission ?? item.permissions;
      if (Array.isArray(perm)) permissions = perm.map(String);
      return {
        id: item.id,
        role: String(item.role),
        permissions,
      };
    });
  }
  private readonly endpoint = API_ENDPOINTS.ROLE_PERMISSIONS;

  /**
   * GET /role-has-permissions/by-role/{role} : renvoie la liste des permissions pour ce rôle.
   * 404 → [] sans erreur (validateStatus).
   */
  async getPermissionsByRole(role: string): Promise<string[]> {
    const record = await this.getRolePermissionRecord(role);
    return record.permissions;
  }

  /**
   * GET by-role et retourne permissions + id du record si présent (pour PUT "rôle existe déjà").
   * Utilise le rôle canonique (admin/Admin → ROLE_ADMIN) pour que l'API trouve le bon enregistrement.
   */
  async getRolePermissionRecord(
    role: string
  ): Promise<{ permissions: string[]; id?: number | string }> {
    const roleKey = role.trim();
    if (!roleKey) return { permissions: [] };
    const canonicalRole = toCanonicalRole(roleKey);
    // Ces rôles n'exposent pas de configuration sidebar dédiée côté API.
    // On évite l'appel réseau pour supprimer les 404 inutiles au boot.
    if (canonicalRole === 'ROLE_CANDIDAT' || canonicalRole === 'candidat') {
      return { permissions: [] };
    }
    const url = API_ENDPOINTS.ROLE_PERMISSIONS_BY_ROLE(canonicalRole);
    const response = await this.api.get<PermissionsByRoleResponse>(url, {
      validateStatus: (status) => status === 200 || status === 404,
    });
    if (response.status === 404) return { permissions: [] };
    let data: unknown = response.data;
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
      data = (data as { data: unknown }).data;
    }
    let permissions: string[] = [];
    let id: number | string | undefined;
    if (Array.isArray(data)) {
      permissions = data.map(String);
    } else if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const perm = obj.permission ?? obj.permissions;
      if (Array.isArray(perm)) permissions = perm.map(String);
      const rawId = obj.id ?? (obj.data && typeof obj.data === 'object' && (obj.data as Record<string, unknown>).id);
      if (rawId !== undefined && rawId !== null) id = typeof rawId === 'number' ? rawId : String(rawId);
    }
    return { permissions, id };
  }

  /**
   * POST /role-has-permissions : créer/ajouter les permissions pour un rôle.
   * Body: { "role": "string", "permission": ["string"] }
   */
  async updateRolePermissions(
    role: string,
    permission: string[]
  ): Promise<RolePermissionItem | void> {
    const roleKey = role.trim();
    if (!roleKey) {
      throw Object.assign(new Error('Le rôle est requis'), { status: 400 });
    }
    const list = Array.isArray(permission) ? [...permission] : [];
    const payload: UpdateRolePermissionsPayload = {
      role: roleKey,
      permission: list,
    };
    return this.post<RolePermissionItem | void>(this.endpoint, payload);
  }

  /**
   * PUT /role-has-permissions/{role_has_permission} : modifier les permissions pour un rôle donné.
   * Utilise validateStatus pour ne pas lever d'erreur sur 404.
   */
  async modifyRolePermission(
    roleHasPermission: string,
    permission: string[]
  ): Promise<RolePermissionItem | void> {
    const idOrRole = String(roleHasPermission).trim();
    if (!idOrRole) {
      throw Object.assign(new Error('role_has_permission est requis'), { status: 400 });
    }
    const list = Array.isArray(permission) ? [...permission] : [];
    const url = API_ENDPOINTS.ROLE_PERMISSIONS_UPDATE(idOrRole);
    const payload: UpdateRolePermissionsPayload = { permission: list };
    const response = await this.api.put<RolePermissionItem | void>(url, payload, {
      validateStatus: (status) => status === 200 || status === 404,
    });
    if (response.status === 404) return undefined;
    return response.data;
  }

  /**
   * Enregistre les permissions d'un rôle.
   * - Si id fourni → PUT /role-has-permissions/{id} (rôle existant).
   * - Sinon → POST. Si 422 "Ce rôle existe déjà", réessaie en PUT avec le nom du rôle.
   */
  async saveRolePermissions(
    role: string,
    permission: string[],
    id?: number | string
  ): Promise<RolePermissionItem | void> {
    const roleKey = role.trim();
    if (!roleKey) {
      throw Object.assign(new Error('Le rôle est requis'), { status: 400 });
    }
    const list = Array.isArray(permission)
      ? permission.filter((p): p is string => typeof p === 'string').map((p) => String(p).trim())
      : [];
    const payload = { role: roleKey, permission: list };

    if (id !== undefined && id !== null && id !== '') {
      const url = API_ENDPOINTS.ROLE_PERMISSIONS_UPDATE(String(id));
      return this.put<RolePermissionItem | void>(url, { permission: list });
    }

    try {
      return await this.post<RolePermissionItem | void>(this.endpoint, payload);
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status?: number }).status : undefined;
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message?: string }).message) : '';
      const details = err && typeof err === 'object' && 'details' in err ? (err as { details?: unknown }).details : undefined;
      const detailsStr = details != null ? JSON.stringify(details) : '';
      const isRoleExists =
        status === 422 &&
        (message.includes('existe déjà') ||
          message.includes('already exists') ||
          detailsStr.includes('existe déjà') ||
          detailsStr.includes('already exists'));
      if (isRoleExists) {
        const url = API_ENDPOINTS.ROLE_PERMISSIONS_UPDATE(roleKey);
        return this.put<RolePermissionItem | void>(url, { permission: list });
      }
      throw err;
    }
  }
}

export const rolePermissionsService = new RolePermissionsService();
