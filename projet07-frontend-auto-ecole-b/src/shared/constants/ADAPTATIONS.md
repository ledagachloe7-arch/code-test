# Adaptations pour les Auto-Écoles

## Contexte

La plateforme a été adaptée pour les **auto-écoles validées par le ministère du transport** qui gèrent leurs dossiers d'élèves et les transmettent au CNEPC.

## Adaptations apportées

### **1. Authentification**
- **Titre** : "Connexion Auto-École"
- **Sous-titre** : "Plateforme DGTT pour les auto-écoles validées"
- **Utilisateurs** : Auto-écoles avec leurs propres identifiants

### **2. Utilisateurs mockés**
```typescript
const mockUsers = [
  {
    id: '1',
    email: 'admin@dgtt.com',
    name: 'Administrateur DGTT',
    role: 'admin'
  },
  {
    id: '2',
    email: 'autoecole.centre@email.com',
    name: 'Auto-École du Centre',
    role: 'instructor'
  },
  {
    id: '3',
    email: 'autoecole.nord@email.com',
    name: 'Auto-École du Nord',
    role: 'instructor'
  },
  {
    id: '4',
    email: 'autoecole.sud@email.com',
    name: 'Auto-École du Sud',
    role: 'instructor'
  }
];
```

### **3. Dashboard adapté**
- **Titre** : "Tableau de bord Auto-École"
- **Description** : "Plateforme DGTT pour la gestion des dossiers d'auto-école"
- **Navigation** : Modules adaptés au contexte des auto-écoles

### **4. Navigation contextuelle**
- **Gestion des Élèves** : "Inscrire et gérer les dossiers des élèves"
- **Validation des Dossiers** : "Valider les dossiers complets des élèves"
- **Envoi CNEPC** : "Transmettre les dossiers validés au CNEPC"

### **5. Statistiques adaptées**
- **Dossiers en cours** : Dossiers en cours de traitement
- **Dossiers validés** : Dossiers validés par l'auto-école
- **Transmis au CNEPC** : Dossiers transmis au CNEPC

## Rôles et permissions

### **Administrateur DGTT**
- Accès à toutes les fonctionnalités
- Vue d'ensemble de toutes les auto-écoles
- Validation des dossiers de toutes les auto-écoles
- Gestion des envois au CNEPC

### **Auto-École**
- Gestion de leurs propres élèves
- Upload des documents obligatoires
- Validation de leurs dossiers
- Envoi de leurs dossiers au CNEPC

## Processus de gestion

### **1. Inscription des élèves**
- Saisie des informations personnelles
- Upload des documents obligatoires
- Validation de la complétude

### **2. Validation des dossiers**
- Vérification par l'auto-école
- Contrôle par l'administrateur DGTT
- Statuts de progression

### **3. Transmission au CNEPC**
- Création de lots de dossiers
- Envoi groupé au CNEPC
- Suivi des statuts

## Documents obligatoires

### **Pour chaque élève**
1. **Carte d'identité** (recto/verso)
2. **Photo d'identité** (format CNI)
3. **Certificat médical** (aptitude à la conduite)
4. **Attestation d'aptitude** (CNEPC)

### **Validation des documents**
- Format accepté : PDF, JPG, PNG
- Taille maximale : 10MB par document
- Qualité suffisante pour lecture

## Statuts des dossiers

### **Statuts possibles**
- `incomplete` - Dossier incomplet
- `complete` - Dossier complet
- `validated` - Dossier validé par l'auto-école
- `approved` - Dossier approuvé par DGTT
- `sent` - Dossier transmis au CNEPC
- `processed` - Dossier traité par le CNEPC

## Interface utilisateur

### **Connexion**
- Titre adapté au contexte des auto-écoles
- Description de la plateforme DGTT
- Identifiants des auto-écoles validées

### **Dashboard**
- Interface adaptée aux auto-écoles
- Navigation contextuelle
- Statistiques pertinentes

### **Navigation**
- Modules adaptés au processus des auto-écoles
- Descriptions contextuelles
- Workflow de gestion des dossiers

## Sécurité

### **Authentification**
- Seules les auto-écoles validées peuvent se connecter
- Chaque auto-école ne voit que ses propres dossiers
- L'administrateur DGTT a accès à tous les dossiers

### **Validation**
- Contrôle de la complétude des documents
- Validation par l'auto-école
- Contrôle final par l'administrateur DGTT

## Support

### **Documentation**
- Guide d'utilisation pour les auto-écoles
- Procédures de validation
- FAQ sur les documents obligatoires

### **Formation**
- Formation à l'utilisation de la plateforme
- Support technique DGTT
- Assistance pour les auto-écoles

La plateforme est maintenant parfaitement adaptée au contexte des auto-écoles validées par le ministère du transport ! 🎯
