# Intégration des demandes d'inscription

## Vue d'ensemble

Le module élèves a été étendu pour inclure la gestion des demandes d'inscription des élèves dans les auto-écoles.

## Nouvelles fonctionnalités

### **✅ Demandes d'inscription**
- **Liste des demandes** : Tableau avec filtres et recherche
- **Nouvelle demande** : Formulaire de création
- **Statistiques** : Compteurs en temps réel
- **Détails** : Vue complète d'une demande

### **✅ Interface utilisateur**
- **Navigation par onglets** : Demandes d'inscription / Élèves inscrits
- **Filtres avancés** : Par statut, auto-école, date
- **Recherche** : Par nom, email, numéro de demande
- **Actions** : Voir, modifier, supprimer

## Structure ajoutée

### **Types**
```
src/modules/eleves/types/inscription.ts
├── DemandeInscription
├── DocumentInscription
├── NouvelleDemande
├── FiltresDemandes
└── StatistiquesDemandes
```

### **Services**
```
src/modules/eleves/services/inscriptionService.ts
├── getDemandesInscriptionMock()
├── getDemandeByIdMock()
├── creerDemandeInscriptionMock()
├── mettreAJourStatutDemandeMock()
├── getStatistiquesDemandesMock()
└── supprimerDemandeMock()
```

### **Composants**
```
src/modules/eleves/tables/DemandesInscriptionTable.tsx
├── Tableau des demandes
├── Filtres et recherche
├── Statistiques
└── Actions sur les demandes

src/modules/eleves/forms/NouvelleDemandeForm.tsx
├── Formulaire de saisie
├── Upload des documents
├── Validation des champs
└── Soumission de la demande

src/modules/eleves/pages/DemandesInscriptionPage.tsx
├── Navigation par onglets
├── Liste des demandes
└── Nouvelle demande
```

## Processus de gestion

### **1. Création d'une demande**
1. L'auto-école accède au module élèves
2. Onglet "Demandes d'inscription"
3. Clique sur "Nouvelle demande"
4. Remplit le formulaire avec les informations de l'élève
5. Upload les documents obligatoires
6. Soumet la demande

### **2. Traitement de la demande**
1. La demande apparaît dans la liste avec le statut "en_attente"
2. L'administrateur DGTT peut consulter les détails
3. Validation des documents
4. Mise à jour du statut
5. Notification de l'auto-école

### **3. Statuts possibles**
- **en_attente** : Demande soumise, en attente de traitement
- **en_cours** : Demande en cours de traitement
- **validee** : Demande validée
- **rejetee** : Demande rejetée

## Documents obligatoires

### **Pour chaque demande**
1. **Carte d'identité** (recto/verso)
2. **Photo d'identité** (format CNI)
3. **Certificat médical** (aptitude à la conduite)
4. **Attestation d'aptitude** (CNEPC)

### **Validation**
- Format : PDF, JPG, PNG
- Taille : Max 10MB par document
- Qualité : Suffisante pour lecture

## Interface utilisateur

### **Page des élèves mise à jour**
- **Onglet 1** : Demandes d'inscription
- **Onglet 2** : Élèves inscrits
- Navigation cohérente
- Actions contextuelles

### **Tableau des demandes**
- **Colonnes** : Numéro, Élève, Auto-École, Date, Statut, Documents, Actions
- **Filtres** : Par statut, auto-école, date
- **Recherche** : Texte libre
- **Actions** : Voir détails, Modifier, Supprimer

### **Formulaire de nouvelle demande**
- **Informations élève** : Prénom, nom, email, téléphone, adresse, date de naissance, nationalité
- **Documents** : Upload multiple avec validation
- **Commentaires** : Champ optionnel
- **Validation** : En temps réel

## Services mockés

### **Données de test**
```typescript
const mockDemandes = [
  {
    id: '1',
    numero: 'INS-2024-001',
    eleve: { firstName: 'Marie', lastName: 'Dupont', ... },
    autoEcole: { name: 'Auto-École du Centre', ... },
    statut: 'en_attente',
    documents: [...]
  }
];
```

### **Fonctionnalités mockées**
- Récupération des demandes avec filtres
- Création de nouvelles demandes
- Mise à jour des statuts
- Statistiques en temps réel
- Gestion des documents

## Intégration

### **Navigation**
- Intégration dans la page des élèves
- Onglets pour organiser les fonctionnalités
- Navigation cohérente avec le reste de l'application

### **Services**
- Services mockés pour le développement
- Structure prête pour l'API réelle
- Gestion d'erreurs robuste

### **Types**
- Types TypeScript stricts
- Interfaces complètes
- Validation des données

## Utilisation

### **Pour les auto-écoles**
1. Se connecter à la plateforme
2. Aller dans "Gestion des élèves"
3. Onglet "Demandes d'inscription"
4. Créer de nouvelles demandes
5. Suivre le statut des demandes

### **Pour l'administrateur DGTT**
1. Accéder à toutes les demandes
2. Filtrer par auto-école
3. Valider ou rejeter les demandes
4. Consulter les statistiques

## Évolutions futures

### **Fonctionnalités à ajouter**
- Notifications en temps réel
- Workflow d'approbation
- Historique des modifications
- Export des données
- Intégration avec le module validation

### **Optimisations**
- Pagination des demandes
- Cache des données
- Recherche avancée
- Filtres multiples
- Performance améliorée

Le module élèves est maintenant complet avec la gestion des demandes d'inscription ! 🎯
