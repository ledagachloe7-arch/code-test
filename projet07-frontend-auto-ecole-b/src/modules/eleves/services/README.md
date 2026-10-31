# DocumentService - Service de gestion des documents

## Vue d'ensemble

Le `DocumentService` est un service complet pour la gestion des documents des élèves dans l'application DGTT Auto-École. Il fournit toutes les fonctionnalités nécessaires pour l'upload, la récupération, la suppression et la prévisualisation des documents.

## Fonctionnalités

### ✅ Upload de documents
- Upload avec progression en temps réel
- Validation des types de fichiers
- Validation de la taille des fichiers
- Gestion des erreurs spécifiques

### ✅ Gestion des documents
- Récupération des documents d'un élève
- Suppression sécurisée avec vérification des droits
- Téléchargement avec gestion des blobs
- Prévisualisation avec URLs sécurisées

### ✅ Validation et sécurité
- Validation des types de fichiers autorisés
- Validation de la taille maximale
- Gestion des autorisations (403, 404)
- Gestion des erreurs réseau

## Utilisation

### Import du service

```typescript
import documentService from './documentService';
```

### Upload d'un document

```typescript
const handleUpload = async (file: File) => {
  try {
    const result = await documentService.uploadDocument(
      'student-123',           // ID de l'élève
      file,                    // Fichier à uploader
      'identity',             // Type de document
      (progress) => {         // Callback de progression
        console.log(`Upload: ${progress}%`);
      }
    );
    console.log('Document uploadé:', result);
  } catch (error) {
    console.error('Erreur upload:', error.message);
  }
};
```

### Récupération des documents

```typescript
const loadDocuments = async () => {
  try {
    const documents = await documentService.getStudentDocuments('student-123');
    setDocuments(documents);
  } catch (error) {
    console.error('Erreur chargement:', error.message);
  }
};
```

### Suppression d'un document

```typescript
const handleDelete = async (documentId: string) => {
  try {
    await documentService.deleteDocument(documentId);
    console.log('Document supprimé');
  } catch (error) {
    console.error('Erreur suppression:', error.message);
  }
};
```

### Téléchargement d'un document

```typescript
const handleDownload = async (documentId: string) => {
  try {
    // Téléchargement simple
    const blob = await documentService.downloadDocument(documentId);
    
    // Ou téléchargement avec sauvegarde automatique
    await documentService.downloadAndSaveDocument(documentId, 'mon-document.pdf');
  } catch (error) {
    console.error('Erreur téléchargement:', error.message);
  }
};
```

### Prévisualisation d'un document

```typescript
const handlePreview = async (documentId: string) => {
  try {
    const previewUrl = await documentService.previewDocument(documentId);
    window.open(previewUrl, '_blank');
  } catch (error) {
    console.error('Erreur prévisualisation:', error.message);
  }
};
```

## Validation des fichiers

### Types de fichiers autorisés

```typescript
const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png'
];

const isValid = documentService.validateFileType(file, allowedTypes);
```

### Taille maximale

```typescript
const maxSizeInMB = 5; // 5MB maximum
const isValidSize = documentService.validateFileSize(file, maxSizeInMB);
```

## Gestion des erreurs

Le service gère automatiquement différents types d'erreurs :

- **413** : Fichier trop volumineux
- **415** : Type de fichier non supporté
- **404** : Document/élève non trouvé
- **403** : Droits insuffisants
- **Erreurs réseau** : Problèmes de connectivité

## Types TypeScript

### UploadDocumentResponse

```typescript
interface UploadDocumentResponse {
  id: string;
  name: string;
  url: string;
  size: string;
  type: 'identity' | 'photo' | 'medical' | 'aptitude';
  uploadedAt: string;
}
```

### Document

```typescript
interface Document {
  id: string;
  type: 'identity' | 'photo' | 'medical' | 'aptitude';
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'error';
}
```

## Exemple complet

Voir `DocumentServiceExample.tsx` pour un exemple complet d'utilisation avec interface utilisateur.

## Configuration

Le service utilise la configuration centralisée :
- **Base URL** : Définie dans `shared/constants/api.ts`
- **Client HTTP** : Configuration axios dans `shared/utils/axiosConfig.ts`
- **Gestion des tokens** : Automatique via les intercepteurs

## Sécurité

- ✅ Validation des types de fichiers
- ✅ Validation de la taille
- ✅ Gestion des autorisations
- ✅ URLs sécurisées pour la prévisualisation
- ✅ Tokens d'authentification automatiques
