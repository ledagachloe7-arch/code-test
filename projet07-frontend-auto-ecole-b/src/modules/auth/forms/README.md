# LoginForm - Formulaire de connexion

## Vue d'ensemble

Le `LoginForm` est le composant principal d'authentification de l'application. Il gère la connexion des utilisateurs avec redirection automatique vers le dashboard.

## Fonctionnalités

### **✅ Authentification**
- Formulaire de connexion avec validation
- Gestion des erreurs d'authentification
- Messages de feedback utilisateur
- États de chargement

### **✅ Redirection automatique**
- Redirection vers le dashboard après connexion réussie
- Délai de 1 seconde pour afficher le message de succès
- Gestion des utilisateurs déjà connectés

### **✅ Validation des champs**
- Email requis et valide
- Mot de passe requis (minimum 6 caractères)
- Messages d'erreur en temps réel
- Nettoyage des erreurs lors de la saisie

## Structure du composant

### **Imports**
```typescript
import React, { useState, useEffect } from 'react';
import { Button, TextField, Card, CardContent, Typography, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../store';
import { authService } from '../services/authService';
import { User } from '../types';
import { ROUTES } from '../../../shared/constants';
```

### **État local**
```typescript
const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' });
const [errors, setErrors] = useState<Partial<LoginFormData>>({});
const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
```

### **Hooks utilisés**
- `useAppStore()` - État global d'authentification
- `useNavigate()` - Navigation programmatique
- `useEffect()` - Redirection automatique

## Flux d'authentification

### **1. Vérification de l'état de connexion**
```typescript
useEffect(() => {
  if (isAuthenticated) {
    navigate(ROUTES.DASHBOARD);
  }
}, [isAuthenticated, navigate]);
```

### **2. Validation du formulaire**
```typescript
const validateForm = (): boolean => {
  const newErrors: Partial<LoginFormData> = {};
  
  if (!formData.email) {
    newErrors.email = 'L\'email est requis';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    newErrors.email = 'Email invalide';
  }
  
  if (!formData.password) {
    newErrors.password = 'Le mot de passe est requis';
  } else if (formData.password.length < 6) {
    newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### **3. Soumission du formulaire**
```typescript
const onSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  try {
    setLoading(true);
    setMessage(null);
    
    // Utilisation du service mocké
    const authResponse = await authService.login({
      email: formData.email,
      password: formData.password,
    });
    
    // Conversion du type pour correspondre au store
    const user: User = {
      id: authResponse.user.id,
      email: authResponse.user.email,
      name: authResponse.user.name,
      role: authResponse.user.role as 'admin' | 'instructor' | 'student',
      createdAt: authResponse.user.createdAt,
    };
    
    login(user, authResponse.token);
    setMessage({ type: 'success', text: 'Connexion réussie !' });
    
    // Redirection vers le dashboard après connexion réussie
    setTimeout(() => {
      navigate(ROUTES.DASHBOARD);
    }, 1000);
  } catch (error: any) {
    setMessage({ type: 'error', text: error.message || 'Erreur de connexion' });
  } finally {
    setLoading(false);
  }
};
```

## Interface utilisateur

### **Design Material-UI**
- Card centrée avec formulaire
- Champs de saisie avec validation
- Bouton de soumission avec état de chargement
- Messages d'erreur et de succès

### **Responsive design**
- Largeur maximale de 400px
- Centrage vertical et horizontal
- Arrière-plan gris clair

### **États visuels**
- Champs en erreur avec bordure rouge
- Bouton désactivé pendant le chargement
- Messages d'alerte colorés

## Gestion des erreurs

### **Erreurs de validation**
- Email requis et valide
- Mot de passe requis et suffisamment long
- Messages d'erreur sous les champs

### **Erreurs d'authentification**
- Identifiants invalides
- Erreurs de réseau
- Messages d'erreur généraux

### **Gestion des états**
- État de chargement pendant l'authentification
- Nettoyage des erreurs lors de la saisie
- Messages de succès avant redirection

## Données de test

### **Utilisateurs valides**
- **Admin** : `admin@dgtt.com` / `password123`
- **Instructeur** : `instructeur@dgtt.com` / `password123`

### **Scénarios de test**
- Connexion réussie avec redirection
- Connexion échouée avec message d'erreur
- Utilisateur déjà connecté (redirection automatique)
- Validation des champs en temps réel

## Intégration

### **Services**
- `authService.login()` - Authentification mockée
- Gestion des erreurs du service
- Conversion des types de réponse

### **Store global**
- `login()` - Mise à jour de l'état d'authentification
- `setLoading()` - Gestion de l'état de chargement
- `isAuthenticated` - Vérification de l'état de connexion

### **Navigation**
- `useNavigate()` - Navigation programmatique
- `ROUTES.DASHBOARD` - Route de destination
- Redirection automatique après connexion

## Améliorations futures

### **Fonctionnalités à ajouter**
- Mémorisation des identifiants
- Mot de passe oublié
- Authentification à deux facteurs
- Connexion avec Google/Microsoft

### **Optimisations**
- Lazy loading du composant
- Cache des données d'authentification
- Tests automatisés
- Accessibilité améliorée

Le LoginForm est maintenant complet avec toutes les fonctionnalités de redirection et de gestion des utilisateurs connectés ! 🎯
