// Exemple d'utilisation des nouvelles fonctionnalités d'auto-école
// Ce fichier montre comment utiliser les utilitaires créés pour gérer les informations d'auto-école

import { 
  getAutoEcoleInfo, 
  getAutoEcoleName, 
  getAutoEcoleId, 
  getAutoEcoleFormations,
  getAutoEcoleDossiers,
  getAutoEcoleResponsable,
  isResponsableAutoEcole 
} from '../../shared/utils/autoEcoleUtils';

// Exemple 1: Vérifier si l'utilisateur est responsable d'une auto-école
export const checkUserRole = () => {
  if (isResponsableAutoEcole()) {
    console.log('✅ L\'utilisateur est responsable d\'une auto-école');
    
    // Récupérer les informations de base
    const autoEcoleName = getAutoEcoleName();
    const autoEcoleId = getAutoEcoleId();
    
    console.log(`🏫 Auto-école: ${autoEcoleName} (ID: ${autoEcoleId})`);
    
    return true;
  } else {
    console.log('❌ L\'utilisateur n\'est pas responsable d\'une auto-école');
    return false;
  }
};

// Exemple 2: Afficher les formations disponibles
export const displayFormations = () => {
  const formations = getAutoEcoleFormations();
  
  if (formations.length > 0) {
    console.log('📚 Formations disponibles:');
    formations.forEach((formation, index) => {
      console.log(`${index + 1}. ${formation.type_permis?.libelle || 'Formation'} - ${formation.montant_formate || 'N/A'}`);
    });
  } else {
    console.log('📚 Aucune formation disponible');
  }
  
  return formations;
};

// Exemple 3: Afficher les statistiques des dossiers
export const displayDossierStats = () => {
  const dossiers = getAutoEcoleDossiers();
  
  if (dossiers.length > 0) {
    const stats = {
      total: dossiers.length,
      en_attente: dossiers.filter(d => d.statut === 'en_attente').length,
      en_cours: dossiers.filter(d => d.statut === 'en_cours').length,
      valide: dossiers.filter(d => d.statut === 'valide').length,
      rejete: dossiers.filter(d => d.statut === 'rejete').length
    };
    
    console.log('📊 Statistiques des dossiers:');
    console.log(`   • Total: ${stats.total}`);
    console.log(`   • En attente: ${stats.en_attente}`);
    console.log(`   • En cours: ${stats.en_cours}`);
    console.log(`   • Validés: ${stats.valide}`);
    console.log(`   • Rejetés: ${stats.rejete}`);
    
    return stats;
  } else {
    console.log('📊 Aucun dossier trouvé');
    return null;
  }
};

// Exemple 4: Afficher les informations du responsable
export const displayResponsableInfo = () => {
  const responsable = getAutoEcoleResponsable();
  
  if (responsable) {
    console.log('👨‍💼 Informations du responsable:');
    console.log(`   • Nom complet: ${responsable.nom_complet}`);
    console.log(`   • Email: ${responsable.email}`);
    console.log(`   • Contact: ${responsable.contact}`);
    console.log(`   • Adresse: ${responsable.adresse}`);
    
    return responsable;
  } else {
    console.log('❌ Aucune information de responsable trouvée');
    return null;
  }
};

// Exemple 5: Fonction complète pour afficher toutes les informations
export const displayAllAutoEcoleInfo = () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏫 INFORMATIONS COMPLÈTES DE L\'AUTO-ÉCOLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const autoEcoleInfo = getAutoEcoleInfo();
  
  if (!autoEcoleInfo) {
    console.log('❌ Aucune information d\'auto-école disponible');
    return;
  }
  
  // Informations générales
  console.log('📋 Informations générales:');
  console.log(`   • Nom: ${autoEcoleInfo.nom_auto_ecole}`);
  console.log(`   • ID: ${autoEcoleInfo.id}`);
  console.log(`   • Adresse: ${autoEcoleInfo.adresse}`);
  console.log(`   • Email: ${autoEcoleInfo.email}`);
  console.log(`   • Contact: ${autoEcoleInfo.contact}`);
  console.log(`   • Statut: ${autoEcoleInfo.statut_libelle}`);
  
  // Responsable
  displayResponsableInfo();
  
  // Formations
  displayFormations();
  
  // Statistiques des dossiers
  displayDossierStats();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return autoEcoleInfo;
};

// Exemple d'utilisation dans un composant React
export const useAutoEcoleInfo = () => {
  const autoEcoleInfo = getAutoEcoleInfo();
  const isResponsable = isResponsableAutoEcole();
  const autoEcoleName = getAutoEcoleName();
  const autoEcoleId = getAutoEcoleId();
  const formations = getAutoEcoleFormations();
  const dossiers = getAutoEcoleDossiers();
  const responsable = getAutoEcoleResponsable();
  
  return {
    autoEcoleInfo,
    isResponsable,
    autoEcoleName,
    autoEcoleId,
    formations,
    dossiers,
    responsable,
    // Méthodes utilitaires
    displayAllInfo: displayAllAutoEcoleInfo,
    displayFormations,
    displayDossierStats,
    displayResponsableInfo
  };
};
