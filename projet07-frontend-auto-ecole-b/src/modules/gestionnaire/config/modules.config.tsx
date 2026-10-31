import React from 'react';
import {
  Send,
  School,
  People,
  Assignment,
  TrendingUp,
  AutoAwesome,
  Quiz,
  Schedule,
  Category,
  Description,
  Settings,
  PersonAdd,
  FolderOpen,
  Search,
  FilterList,
  ManageAccounts,
  AdminPanelSettings,
} from '@mui/icons-material';
import { ROUTES } from '../../../shared/constants';
import { ModuleCardProps } from '../types';

export const getModulesConfig = (
  navigate: (path: string) => void,
  onCompleteSetup: () => void
): ModuleCardProps[] => [
  {
    title: 'Gestion des Auto-Écoles',
    description:
      'Gérez vos auto-écoles, consultez les candidats inscrits, suivez l\'avancement des dossiers et analysez les statistiques.',
    icon: <School />,
    badge: {
      label: 'Module Principal',
      color: 'primary',
    },
    chips: [
      { icon: <People />, label: 'Candidats' },
      { icon: <Assignment />, label: 'Dossiers' },
      { icon: <TrendingUp />, label: 'Statistiques' },
    ],
    primaryAction: {
      label: 'Accéder au Module',
      icon: <School />,
      onClick: () => navigate(ROUTES.AUTO_ECOLES),
    },
    secondaryAction: {
      label: 'Configuration Complète',
      icon: <PersonAdd />,
      onClick: onCompleteSetup,
    },
    avatarColor: 'primary',
  },
  {
    title: 'Candidats aux Examens',
    description:
      'Gérez les candidats aux examens, organisez les sessions d\'examen et planifiez les créneaux pour les 3 épreuves du permis de conduire.',
    icon: <Quiz />,
    badge: {
      label: 'Nouveau Module',
      color: 'success',
    },
    chips: [
      { icon: <People />, label: 'Candidats' },
      { icon: <Schedule />, label: 'Sessions' },
      { icon: <Quiz />, label: 'Épreuves' },
    ],
    primaryAction: {
      label: 'Accéder au Module',
      icon: <Quiz />,
      onClick: () => navigate(ROUTES.CANDIDATS_EXAMEN),
    },
    avatarColor: 'success',
  },
  {
    title: 'Reception au CNEPC',
    description:
      'Interface de réception des dossiers candidats au CNEPC. Gérez la réception, la validation et le suivi des dossiers transmis par les auto-écoles.',
    icon: <Send />,
    badge: {
      label: 'Module Disponible',
      color: 'success',
    },
    chips: [
      { icon: <AutoAwesome />, label: 'Validation' },
      { icon: <Send />, label: 'Réception' },
      { icon: <Assignment />, label: 'Suivi' },
    ],
    primaryAction: {
      label: 'Accéder au Module',
      icon: <Send />,
      onClick: () => navigate(ROUTES.RECEPTION),
    },
    avatarColor: 'secondary',
  },
  {
    title: 'Typage de Dossier',
    description:
      'Gérez les types de demande pour les dossiers candidats. Créez, modifiez et supprimez les différents types de demande disponibles dans le système.',
    icon: <Category />,
    badge: {
      label: 'Module Disponible',
      color: 'info',
    },
    chips: [
      { icon: <Category />, label: 'Types' },
      { icon: <Assignment />, label: 'Dossiers' },
      { icon: <AutoAwesome />, label: 'Gestion' },
    ],
    primaryAction: {
      label: 'Accéder au Module',
      icon: <Category />,
      onClick: () => navigate(ROUTES.TYPE_DEMANDES),
    },
    avatarColor: 'info',
  },
  {
    title: 'Gestion de Dossier',
    description:
      'Gérez tous les dossiers des candidats, consultez leur statut, effectuez des recherches avancées et suivez l\'avancement des dossiers dans le système.',
    icon: <FolderOpen />,
    badge: {
      label: 'Module Disponible',
      color: 'primary',
    },
    chips: [
      { icon: <Assignment />, label: 'Dossiers' },
      { icon: <Search />, label: 'Recherche' },
      { icon: <FilterList />, label: 'Filtres' },
      { icon: <TrendingUp />, label: 'Suivi' },
    ],
    primaryAction: {
      label: 'Accéder au Module',
      icon: <FolderOpen />,
      onClick: () => navigate(ROUTES.GESTION_DOSSIER),
    },
    avatarColor: 'primary',
  },
  {
    title: 'Pièces Justificatives et Referentiels',
    description:
      'Gérez les pièces justificatives requises pour les dossiers candidats et les référentiels du système. Créez, modifiez et supprimez les différentes pièces justificatives et référentiels disponibles.',
    icon: <Description />,
    badge: {
      label: 'Module Disponible',
      color: 'warning',
    },
    chips: [
      { icon: <Description />, label: 'Documents' },
      { icon: <Settings />, label: 'Référentiels' },
      { icon: <Assignment />, label: 'Validation' },
      { icon: <AutoAwesome />, label: 'Gestion' },
    ],
    primaryAction: {
      label: 'Accéder au Module',
      icon: <Description />,
      onClick: () => navigate(ROUTES.PIECES_JUSTIFICATIVES),
    },
    avatarColor: 'warning',
  },
  {
    title: 'Gestion d\'utilisateur',
    description:
      'Gérez les utilisateurs du système, leurs rôles et permissions. Créez, modifiez et supprimez les comptes utilisateurs, assignez les rôles appropriés et gérez les accès aux différents modules.',
    icon: <ManageAccounts />,
    badge: {
      label: 'Module Disponible',
      color: 'info',
    },
    chips: [
      { icon: <People />, label: 'Utilisateurs' },
      { icon: <AdminPanelSettings />, label: 'Rôles' },
      { icon: <Settings />, label: 'Permissions' },
      { icon: <AutoAwesome />, label: 'Gestion' },
    ],
    primaryAction: {
      label: 'Accéder au Module',
      icon: <ManageAccounts />,
      onClick: () => navigate(ROUTES.USER_MANAGEMENT),
    },
    avatarColor: 'info',
  },
];

