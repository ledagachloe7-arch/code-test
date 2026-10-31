// Utilitaires pour la gestion des informations d'auto-école
import { AutoEcoleDetailResponse } from '../../modules/cnepc/types/auto-ecole';

/**
 * Récupère les informations de l'auto-école depuis le localStorage
 */
export const getAutoEcoleInfo = (): AutoEcoleDetailResponse['data'] | null => {
  try {
    const autoEcoleInfo = localStorage.getItem('auto_ecole_info');
    if (autoEcoleInfo) {
      return JSON.parse(autoEcoleInfo);
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations auto-école:', error);
    return null;
  }
};

/**
 * Sauvegarde les informations de l'auto-école dans le localStorage
 */
export const setAutoEcoleInfo = (autoEcoleData: AutoEcoleDetailResponse['data']): void => {
  try {
    localStorage.setItem('auto_ecole_info', JSON.stringify(autoEcoleData));
    console.log('✅ Informations auto-école sauvegardées:', autoEcoleData.nom_auto_ecole);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des informations auto-école:', error);
  }
};

/**
 * Supprime les informations de l'auto-école du localStorage
 */
export const clearAutoEcoleInfo = (): void => {
  try {
    localStorage.removeItem('auto_ecole_info');
    console.log('✅ Informations auto-école supprimées du localStorage');
  } catch (error) {
    console.error('Erreur lors de la suppression des informations auto-école:', error);
  }
};

/**
 * Vérifie si l'utilisateur connecté est responsable d'une auto-école
 */
export const isResponsableAutoEcole = (): boolean => {
  const autoEcoleInfo = getAutoEcoleInfo();
  return autoEcoleInfo !== null;
};

/**
 * Récupère le nom de l'auto-école de l'utilisateur connecté
 */
export const getAutoEcoleName = (): string | null => {
  const autoEcoleInfo = getAutoEcoleInfo();
  return autoEcoleInfo?.nom_auto_ecole || null;
};

/**
 * Récupère l'ID de l'auto-école de l'utilisateur connecté
 */
export const getAutoEcoleId = (): string | null => {
  const autoEcoleInfo = getAutoEcoleInfo();
  return autoEcoleInfo?.id || null;
};

/**
 * Récupère les formations disponibles de l'auto-école
 */
export const getAutoEcoleFormations = () => {
  const autoEcoleInfo = getAutoEcoleInfo();
  return autoEcoleInfo?.formations || [];
};

/**
 * Récupère les dossiers de l'auto-école
 */
export const getAutoEcoleDossiers = () => {
  const autoEcoleInfo = getAutoEcoleInfo();
  return autoEcoleInfo?.dossiers || [];
};

/**
 * Récupère les informations du responsable de l'auto-école
 */
export const getAutoEcoleResponsable = () => {
  const autoEcoleInfo = getAutoEcoleInfo();
  return autoEcoleInfo?.responsable || null;
};
