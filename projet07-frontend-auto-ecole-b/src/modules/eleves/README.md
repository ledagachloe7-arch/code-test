# Module Élèves - Gestion des demandes d'inscription

## Vue d'ensemble

Le module élèves gère les demandes d'inscription des élèves dans les auto-écoles validées par le ministère du transport.

## Fonctionnalités

### **✅ Demandes d'inscription**
- Liste des demandes d'inscription
- Création de nouvelles demandes
- Filtrage et recherche
- Statistiques des demandes
- Gestion des statuts

### **✅ Gestion des élèves**
- Inscription des élèves
- Upload des documents obligatoires
- Validation des dossiers
- Suivi des statuts

## Structure du module

### **Types**
- `DemandeInscription` - Structure d'une demande d'inscription
- `DocumentInscription` - Documents joints à une demande
- `NouvelleDemande` - Formulaire de nouvelle demande
- `FiltresDemandes` - Filtres de recherche
- `StatistiquesDemandes` - Statistiques des demandes

### **Services**
- `inscriptionService.ts` - Service de gestion des demandes d'inscription
- `studentService.ts` - Service de gestion des élèves
- `documentService.ts` - Service de gestion des documents

### **Composants**
- `DemandesInscriptionTable` - Tableau des demandes d'inscription
- `NouvelleDemandeForm` - Formulaire de nouvelle demande
- `DemandesInscriptionPage` - Page principale des demandes

## Processus de gestion

### **1. Demande d'inscription**
- L'auto-école crée une nouvelle demande
- Saisie des informations de l'élève
- Upload des documents obligatoires
- Soumission de la demande

### **2. Traitement de la demande**
- Vérification de la complétude
- Validation des documents
- Attribution d'un statut
- Notification de l'auto-école

### **3. Statuts des demandes**
- `en_attente` - Demande soumise, en attente de traitement
- `en_cours` - Demande en cours de traitement
- `validee` - Demande validée
- `rejetee` - Demande rejetée

## Documents obligatoires

### **Pour chaque demande d'inscription**
1. **Carte d'identité** (recto/verso)
2. **Photo d'identité** (format CNI)
3. **Certificat médical** (aptitude à la conduite)
4. **Attestation d'aptitude** (CNEPC)

### **Validation des documents**
- Format accepté : PDF, JPG, PNG
- Taille maximale : 10MB par document
- Qualité suffisante pour lecture

## Interface utilisateur

### **Liste des demandes**
- Tableau avec filtres et recherche
- Statistiques en temps réel
- Actions sur chaque demande
- Détails complets des demandes

### **Nouvelle demande**
- Formulaire de saisie des informations
- Upload des documents
- Validation en temps réel
- Confirmation de création

### **Navigation**
- Onglets pour les demandes et élèves inscrits
- Navigation contextuelle
- Retour au dashboard

## Services mockés

### **Fonctions disponibles**
- `getDemandesInscriptionMock()` - Récupération des demandes
- `getDemandeByIdMock()` - Détails d'une demande
- `creerDemandeInscriptionMock()` - Création d'une demande
- `mettreAJourStatutDemandeMock()` - Mise à jour du statut
- `getStatistiquesDemandesMock()` - Statistiques des demandes

### **Données mockées**
- Demandes d'inscription réalistes
- Documents variés
- Statuts différents
- Auto-écoles multiples

## Intégration

### **Navigation**
- Intégration dans la page des élèves
- Onglets pour organiser les fonctionnalités
- Navigation cohérente

### **Services**
- Services mockés pour le développement
- Structure prête pour l'API réelle
- Gestion d'erreurs robuste

### **Types**
- Types TypeScript stricts
- Interfaces complètes
- Validation des données

## Utilisation

### **Créer une demande**
1. Aller dans "Gestion des élèves"
2. Onglet "Demandes d'inscription"
3. Cliquer sur "Nouvelle demande"
4. Remplir le formulaire
5. Uploader les documents
6. Soumettre la demande

### **Consulter les demandes**
1. Aller dans "Gestion des élèves"
2. Onglet "Demandes d'inscription"
3. Utiliser les filtres et la recherche
4. Cliquer sur une demande pour voir les détails

### **Gérer les statuts**
1. Sélectionner une demande
2. Changer le statut
3. Ajouter des commentaires
4. Sauvegarder les modifications

## Évolutions futures

### **Fonctionnalités à ajouter**
- Notifications en temps réel
- Workflow d'approbation
- Historique des modifications
- Export des données

### **Optimisations**
- Pagination des demandes
- Cache des données
- Recherche avancée
- Filtres multiples

Le module élèves est maintenant complet avec la gestion des demandes d'inscription ! 🎯
