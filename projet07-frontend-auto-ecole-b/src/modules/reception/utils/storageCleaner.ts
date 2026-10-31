/**
 * Utilitaires pour nettoyer le localStorage et gérer le quota
 */

const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4 MB (laisser de la marge pour les autres données)
const MAX_FILES_COUNT = 50; // Nombre maximum de fichiers à garder

/**
 * Calcule la taille approximative d'un objet JSON en bytes
 */
function getStorageSize(key: string): number {
  try {
    const item = localStorage.getItem(key);
    if (!item) return 0;
    return new Blob([item]).size;
  } catch (error) {
    console.warn('⚠️ Erreur lors du calcul de la taille du storage:', error);
    return 0;
  }
}

/**
 * Nettoie les anciens fichiers simulés pour libérer de l'espace
 * Garde les fichiers les plus récents
 */
export function cleanOldSimulatedFiles(): number {
  try {
    const storedFiles = localStorage.getItem('simulated_document_files');
    if (!storedFiles) return 0;

    const parsedFiles = JSON.parse(storedFiles);
    const fileIds = Object.keys(parsedFiles);
    
    if (fileIds.length <= MAX_FILES_COUNT) {
      // Pas besoin de nettoyer si on est sous la limite
      return 0;
    }

    // Charger les documents simulés pour obtenir les timestamps
    const storedDocs = localStorage.getItem('simulated_documents');
    const parsedDocs = storedDocs ? JSON.parse(storedDocs) : {};
    
    // Créer un tableau avec les IDs et leurs timestamps
    const filesWithTimestamps = fileIds.map(id => {
      const doc = parsedDocs[id];
      const timestamp = doc?.created_at 
        ? new Date(doc.created_at).getTime() 
        : parseInt(id.split('_')[1]) || 0; // Extraire le timestamp de l'ID si possible
      return { id, timestamp };
    });

    // Trier par timestamp (plus récent en premier)
    filesWithTimestamps.sort((a, b) => b.timestamp - a.timestamp);

    // Garder seulement les MAX_FILES_COUNT plus récents
    const filesToKeep = filesWithTimestamps.slice(0, MAX_FILES_COUNT);
    const filesToRemove = filesWithTimestamps.slice(MAX_FILES_COUNT);

    // Supprimer les anciens fichiers
    const cleanedFiles: any = {};
    filesToKeep.forEach(({ id }) => {
      cleanedFiles[id] = parsedFiles[id];
    });

    // Supprimer aussi les documents simulés correspondants
    const cleanedDocs: any = {};
    filesToKeep.forEach(({ id }) => {
      if (parsedDocs[id]) {
        cleanedDocs[id] = parsedDocs[id];
      }
    });

    // Sauvegarder les fichiers nettoyés
    localStorage.setItem('simulated_document_files', JSON.stringify(cleanedFiles));
    localStorage.setItem('simulated_documents', JSON.stringify(cleanedDocs));

    const removedCount = filesToRemove.length;
    console.log(`🧹 Nettoyage du storage: ${removedCount} anciens fichiers supprimés, ${filesToKeep.length} fichiers conservés`);
    
    return removedCount;
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des fichiers simulés:', error);
    return 0;
  }
}

/**
 * Vide complètement le storage des fichiers simulés
 */
export function clearAllSimulatedFiles(): void {
  try {
    localStorage.removeItem('simulated_document_files');
    localStorage.removeItem('simulated_documents');
    console.log('🧹 Tous les fichiers simulés ont été supprimés du storage');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des fichiers simulés:', error);
  }
}

/**
 * Vérifie si le storage est proche de la limite et nettoie si nécessaire
 */
export function ensureStorageSpace(): boolean {
  try {
    const currentSize = getStorageSize('simulated_document_files');
    
    if (currentSize > MAX_STORAGE_SIZE) {
      console.warn('⚠️ Le storage approche de la limite, nettoyage en cours...');
      cleanOldSimulatedFiles();
      return true;
    }

    // Vérifier aussi le nombre de fichiers
    const storedFiles = localStorage.getItem('simulated_document_files');
    if (storedFiles) {
      const parsedFiles = JSON.parse(storedFiles);
      const fileCount = Object.keys(parsedFiles).length;
      
      if (fileCount > MAX_FILES_COUNT) {
        console.warn(`⚠️ Trop de fichiers dans le storage (${fileCount}), nettoyage en cours...`);
        cleanOldSimulatedFiles();
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du storage:', error);
    // En cas d'erreur, nettoyer quand même pour être sûr
    try {
      cleanOldSimulatedFiles();
    } catch (cleanError) {
      console.error('❌ Erreur lors du nettoyage d\'urgence:', cleanError);
    }
    return false;
  }
}

/**
 * Obtient des statistiques sur le storage
 */
export function getStorageStats(): {
  fileCount: number;
  totalSize: number;
  totalSizeFormatted: string;
} {
  try {
    const storedFiles = localStorage.getItem('simulated_document_files');
    const fileCount = storedFiles ? Object.keys(JSON.parse(storedFiles)).length : 0;
    const totalSize = getStorageSize('simulated_document_files');
    const totalSizeFormatted = `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
    
    return {
      fileCount,
      totalSize,
      totalSizeFormatted
    };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    return {
      fileCount: 0,
      totalSize: 0,
      totalSizeFormatted: '0 MB'
    };
  }
}

/**
 * Expose les fonctions de nettoyage dans la console pour un accès manuel
 * Utilisation: window.clearReceptionStorage() ou window.getReceptionStorageStats()
 */
if (typeof window !== 'undefined') {
  (window as any).clearReceptionStorage = clearAllSimulatedFiles;
  (window as any).cleanReceptionStorage = cleanOldSimulatedFiles;
  (window as any).getReceptionStorageStats = getStorageStats;
  
  console.log('💡 Fonctions de nettoyage du storage disponibles:');
  console.log('  - window.clearReceptionStorage() : Vide tout le storage');
  console.log('  - window.cleanReceptionStorage() : Nettoie les anciens fichiers');
  console.log('  - window.getReceptionStorageStats() : Affiche les statistiques');
}

