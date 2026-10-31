/**
 * Normalise un rôle en enlevant le préfixe ROLE_ si présent et en mettant en minuscules.
 * 
 * Exemples :
 * - "ROLE_CNEPC"      -> "cnepc"
 * - "ROLE_AUTO_ECOLE" -> "auto_ecole"
 * - "ROLE_ADMIN"      -> "admin"
 * - "admin"           -> "admin"
 * - "CNEPC"           -> "cnepc"
 */
export const normalizeRole = (role: string): string => {
  if (!role) return '';
  return role.replace(/^ROLE_/i, '').toLowerCase().trim().replace(/\s+/g, '_');
};

/** Retourne true si le rôle brut correspond à un administrateur (admin / superadmin). */
export const isAdminRole = (userRole: string | null | undefined): boolean => {
  if (!userRole) return false;
  const raw = userRole.toLowerCase().replace(/^role_/, '').trim();
  return raw === 'admin' || raw === 'superadmin';
};

/**
 * Bouton « compléter / finaliser sans vérifier le paiement » : réservé à ROLE_ADMIN et ROLE_ARCHIVAGE.
 */
export const canBypassPaymentVerification = (userRole: string | null | undefined): boolean => {
  if (!userRole) return false;
  const n = normalizeRole(userRole);
  return n === 'admin' || n === 'archivage';
};

/** Rôle dédié au traitement des paiements en réception (circuit limité à l’étape paiement). */
export const isArchivageRole = (userRole: string | null | undefined): boolean =>
  normalizeRole(userRole ?? '') === 'archivage';

/**
 * Vérifie si l'utilisateur est autorisé pour une étape.
 * Les rôles admin / superadmin contournent toute restriction et sont toujours autorisés.
 * Si plusieurs rôles sont définis dans l'étape, l'utilisateur doit avoir l'un de ces rôles.
 */
export const isUserAuthorized = (
  userRole: string | null | undefined,
  etapeRoles?: string[]
): boolean => {
  // Admin / superadmin : accès total sans restriction
  if (isAdminRole(userRole)) return true;

  // Si aucun rôle n'est spécifié dans l'étape, tous les utilisateurs sont autorisés
  if (!etapeRoles || etapeRoles.length === 0) {
    return true;
  }
  
  // Si l'utilisateur n'a pas de rôle, il n'est pas autorisé
  if (!userRole) {
    return false;
  }

  // Normaliser le rôle de l'utilisateur
  const normalizedUserRole = normalizeRole(userRole);
  
  // Vérifier si le rôle de l'utilisateur correspond à un des rôles autorisés
  const isAuthorized = etapeRoles.some(etapeRole => {
    const normalizedEtapeRole = normalizeRole(etapeRole);
    return normalizedEtapeRole === normalizedUserRole;
  });
  
  return isAuthorized;
};

