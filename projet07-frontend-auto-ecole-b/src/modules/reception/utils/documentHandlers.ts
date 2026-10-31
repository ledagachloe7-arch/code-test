import axiosClient from '../../../shared/utils/axiosConfig';
import { circuitSuiviService } from '../services/circuit-suivi.service';

export const handleViewDocument = async (document: any) => {
  try {
    if (!document.id) {
      alert(`Impossible d'ouvrir le document: ${document.nom || document.nom_fichier}\n\nLe document n'a pas d'ID valide.`);
      return;
    }

    console.log('📄 Ouverture du document PDF:', {
      nom: document.nom || document.nom_fichier,
      id: document.id,
      chemin_fichier: document.chemin_fichier,
      type_mime: document.type_mime
    });

    const endpoints = [
      { url: `/documents/${document.id}`, headers: { 'Accept': 'application/pdf,application/octet-stream,*/*' } },
      { url: `/documents/${document.id}/download`, headers: {} },
      { url: `/documents/${document.id}/file`, headers: {} },
      ...(document.chemin_fichier ? [{ url: `/storage/${document.chemin_fichier}`, headers: {} }] : []),
      ...(document.chemin_fichier ? [{ url: `/files/${document.chemin_fichier}`, headers: {} }] : [])
    ];

    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentative avec: ${endpoint.url}`);
        
        const response = await axiosClient.get(endpoint.url, {
          responseType: 'blob',
          headers: endpoint.headers
        });

        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          console.log('⚠️ Réponse JSON reçue au lieu du fichier, essai de la méthode suivante');
          continue;
        }

        if (response.data instanceof Blob && response.data.size > 0) {
          const blob = new Blob([response.data], {
            type: response.headers['content-type'] || document.type_mime || 'application/pdf'
          });
          const url = URL.createObjectURL(blob);
          
          window.open(url, '_blank');
          
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          
          console.log('✅ Document ouvert avec succès');
          return;
        }
      } catch (error: any) {
        console.log(`❌ Erreur avec ${endpoint.url}:`, error?.response?.status || error?.message);
        lastError = error;
        continue;
      }
    }

    throw lastError || new Error('Toutes les méthodes de récupération du fichier ont échoué');
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'ouverture du document:', error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors de l\'ouverture du document';
    alert(`Erreur lors de l'ouverture du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}`);
  }
};

export const handleDownloadDocument = async (document: any) => {
  try {
    if (document.id) {
      console.log('📥 Téléchargement du document via API avec authentification:', {
        nom: document.nom || document.nom_fichier,
        id: document.id,
        chemin_fichier: document.chemin_fichier
      });

      let documentUrl = '';
      
      if (document.chemin_fichier) {
        documentUrl = `/storage/${document.chemin_fichier}`;
      } else {
        documentUrl = `/documents/${document.id}/download`;
      }

      try {
        const response = await axiosClient.get(documentUrl, {
          responseType: 'blob',
        });

        const blob = new Blob([response.data], {
          type: response.headers['content-type'] || document.type_mime || 'application/pdf'
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = document.nom || document.nom_fichier || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error: any) {
        if (error?.response?.status === 404 && document.chemin_fichier) {
          const altUrl = `/documents/${document.id}/download`;
          const altResponse = await axiosClient.get(altUrl, {
            responseType: 'blob',
          });
          const blob = new Blob([altResponse.data], {
            type: altResponse.headers['content-type'] || document.type_mime || 'application/pdf'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = document.nom || document.nom_fichier || 'document';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          throw error;
        }
      }
    } else {
      alert(`Impossible de télécharger le document: ${document.nom || document.nom_fichier}\n\nLe document n'a pas d'ID valide.`);
    }
  } catch (error: any) {
    console.error('❌ Erreur lors du téléchargement du document:', error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors du téléchargement du document';
    alert(`Erreur lors du téléchargement du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}`);
  }
};

/**
 * Supprime un document
 * Gère les erreurs 500 et autres erreurs serveur
 */
export const handleDeleteDocument = async (
  document: any,
  onSuccess?: () => void,
  onError?: (error: string) => void
): Promise<void> => {
  try {
    if (!document.id) {
      const errorMsg = `Impossible de supprimer le document: ${document.nom || document.nom_fichier}\n\nLe document n'a pas d'ID valide.`;
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
      return;
    }

    console.log('🗑️ Suppression du document:', {
      nom: document.nom || document.nom_fichier,
      id: document.id
    });

    // Utiliser le service circuit-suivi pour supprimer le document
    const result = await circuitSuiviService.deleteDocument(document.id);

    // Si la suppression a réussi (même avec erreur 500), afficher un message de succès
    if (result.success) {
      console.log('✅ Document supprimé avec succès');
      
      // Afficher un popup de succès
      const successMessage = `Le document "${document.nom || document.nom_fichier}" a été supprimé avec succès.`;
      if (onSuccess) {
        onSuccess();
      } else {
        alert(successMessage);
      }
    } else {
      // La suppression a échoué, afficher l'erreur
      const errorMessage = result.message || 'Erreur lors de la suppression du document';
      if (onError) {
        onError(errorMessage);
      } else {
        alert(`Erreur lors de la suppression du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression du document:', error);
    
    // Construire un message d'erreur détaillé
    let errorMessage = 'Erreur lors de la suppression du document';
    
    // Si l'erreur a été gérée par le service (document supprimé malgré l'erreur 500)
    // Le service a déjà vérifié et retourné silencieusement, donc on ne devrait pas arriver ici
    // Mais on garde cette gestion au cas où
    if (error.response?.status === 500) {
      // Le service circuit-suivi gère déjà ce cas en vérifiant si le document existe encore
      // Si on arrive ici, c'est que la vérification a échoué ou que le document existe encore
      errorMessage = 'Erreur serveur (500). Le document n\'a peut-être pas pu être supprimé.';
      if (error.response?.data?.message) {
        errorMessage = `Erreur serveur: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `Erreur serveur: ${error.message}`;
      }
    } else if (error.response?.status === 404) {
      errorMessage = 'Document non trouvé. Il a peut-être déjà été supprimé.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Vous n\'avez pas la permission de supprimer ce document.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    if (onError) {
      onError(errorMessage);
    } else {
      alert(`Erreur lors de la suppression du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}`);
    }
    
    // Re-lancer l'erreur pour que le composant puisse la gérer
    throw error;
  }
};

