import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { subscribeParametrageChange } from '../store/parametrageStore';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Avatar,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  HomeIcon,
  ArrowPathIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
  InboxStackIcon,
  TagIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  DocumentPlusIcon,
  UserCircleIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { ROUTES } from '../constants';
import tokenService from '../../modules/auth/services/tokenService';
import { authService } from '../../modules/auth/services/authService';
import { useRolePermissions, useVisibleMenuKeysForRole } from '../../modules/settings/context/RolePermissionsContext';

interface AppSidebarProps {
  open: boolean;
  onToggle: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAppStore();
  const [candidatsOpen, setCandidatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [, setParametrageVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeParametrageChange(() => setParametrageVersion((v) => v + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (location.pathname === ROUTES.FINANCE || location.pathname.startsWith(`${ROUTES.FINANCE}/`)) {
      setFinanceOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith(`${ROUTES.ELEVES}/`)) {
      setCandidatsOpen(true);
    }
  }, [location.pathname]);

  // Définition de tous les menus possibles avec leurs clés
   const allMenuItemsAutoEcole = [
      {
      title: 'Tableau de bord',
      icon: HomeIcon,
      path: ROUTES.DASHBOARD,
      description: 'Vue d\'ensemble de l\'application',
      key: 'dashboard'
    },
    //    {
    //   title: 'Modifier Vos informations personnelles',
    //   icon: PersonIcon,
    //   path: ROUTES.UPDATE,
    //   description: 'modifier les informations de l\' auto-école',
    //   key: 'update'
    // },
    //  {
    //   title: 'Change mot de passe',
    //   icon: Password,
    //   path: ROUTES.CPW,
    //   description: 'changement de mot de passe'
    // },
     {
      title: 'Gestion des Candidats',
      icon: UserGroupIcon,
      path: ROUTES.ELEVES,
      description: 'Inscrire et gérer les dossiers des candidats',
      key: 'candidates',
      hasSubmenu: true,
      submenu: [
        {
          path: `${ROUTES.ELEVES}/demandes`,
          title: 'Demandes d\'inscription',
          description: 'Voir les demandes d\'inscription',
          icon: EnvelopeIcon
        }
      ]
    },
    {
      title: 'Nouvelle demande',
      icon: DocumentPlusIcon,
      path: ROUTES.NOUVELLE_DEMANDE,
      description: 'Assistant de création d\'un dossier candidat',
      key: 'nouvelleDemande'
    },
    {
      title: 'Nos formations',
      icon: AcademicCapIcon,
      path: ROUTES.FORMATIONS,
      description: 'Consulter les formations de votre auto-école',
      key: 'formations'
    },
   ]
  const allMenuItems = [
    {
      title: 'Tableau de bord',
      icon: HomeIcon,
      path: ROUTES.DASHBOARD,
      description: 'Vue d\'ensemble de l\'application',
      key: 'dashboard'
    },
    // {
    //   title: 'Modifier Vos informations personnelles',
    //   icon: PersonIcon,
    //   path: ROUTES.UPDATE,
    //   description: 'modifier les informations de l\' auto-école',
    //   key: 'update'
    // },
    {
      title: 'Referentiel',
      icon: ArrowPathIcon,
      path: ROUTES.REF,
      description: 'reference de l\' auto-école',
      key: 'referentiel'
    },
    {
      title: 'Gestion des Auto-Écoles',
      icon: BuildingOffice2Icon,
      path: ROUTES.AUTO_ECOLES,
      description: 'Gérez vos auto-écoles, candidats inscrits et statistiques',
      key: 'autoEcoles'
    },
    {
      title: 'Candidats aux Examens',
      icon: ClipboardDocumentCheckIcon,
      path: ROUTES.CANDIDATS_EXAMEN,
      description: 'Sessions d\'examen et planification des épreuves',
      key: 'candidatsExamen'
    },
    {
      title: 'Reception au CNEPC',
      icon: InboxStackIcon,
      path: ROUTES.RECEPTION,
      description: 'Réception, validation et suivi des dossiers candidats',
      key: 'reception'
    },
    {
      title: 'Finance',
      icon: CurrencyDollarIcon,
      path: ROUTES.FINANCE,
      description: 'Dossiers en attente de paiement et codes de paiement',
      key: 'finance',
      hasSubmenu: true,
      submenu: [
        {
          path: ROUTES.FINANCE,
          title: 'Suivi des paiements',
          description: 'Dossiers à traiter, codes et rapports',
          icon: CurrencyDollarIcon,
        },
        {
          path: ROUTES.FINANCE_FRAIS_DOSSIER,
          title: 'Frais de dossier',
          description: 'Historique des paiements enregistrés',
          icon: BanknotesIcon,
        },
      ],
    },
    {
      title: 'Typage de Dossier',
      icon: TagIcon,
      path: ROUTES.TYPE_DEMANDES,
      description: 'Types de demande pour les dossiers candidats',
      key: 'typeDemandes'
    },
    {
      title: 'Gestion de Dossier',
      icon: FolderOpenIcon,
      path: ROUTES.GESTION_DOSSIER,
      description: 'Dossiers candidats, recherche et suivi',
      key: 'gestionDossier'
    },
    {
      title: 'Support Dossiers',
      icon: FolderOpenIcon,
      path: ROUTES.SUPPORT_DOSSIERS,
      description: 'Vue support: tous les dossiers + traitement',
      key: 'gestionDossier'
    },
    {
      title: 'Pièces Justificatives et Referentiels',
      icon: DocumentTextIcon,
      path: ROUTES.PIECES_JUSTIFICATIVES,
      description: 'Pièces justificatives et référentiels du système',
      key: 'piecesJustificatives'
    },
    {
      title: 'Gestion d\'utilisateur',
      icon: UserCircleIcon,
      path: ROUTES.USER_MANAGEMENT,
      description: 'Utilisateurs, rôles et permissions',
      key: 'userManagement'
    },
    {
      title: 'Gestion des Candidats',
      icon: UserGroupIcon,
      path: ROUTES.ELEVES,
      description: 'Inscrire et gérer les dossiers des candidats',
      key: 'candidates',
      hasSubmenu: true,
      submenu: [
        {
          path: `${ROUTES.ELEVES}/demandes`,
          title: 'Demandes d\'inscription',
          description: 'Voir les demandes d\'inscription',
          icon: EnvelopeIcon
        }
      ]
    },
    {
      title: 'Nouvelle demande',
      icon: DocumentPlusIcon,
      path: ROUTES.NOUVELLE_DEMANDE,
      description: 'Assistant de création d\'un dossier candidat',
      key: 'nouvelleDemande'
    },
    {
      title: 'CNEPC',
      icon: PaperAirplaneIcon,
      path: ROUTES.CNEPC,
      description: 'Gestion CNEPC et Auto-Écoles',
      key: 'cnepc'
    },
    {
      title: 'Paramètres',
      icon: Cog6ToothIcon,
      path: ROUTES.SETTINGS,
      description: 'Configuration et gestion du système',
      key: 'settings',
      hasSubmenu: true,
      submenu: [
        {
          path: ROUTES.USER_MANAGEMENT,
          title: 'Gestion d\'utilisateurs',
          description: 'Créer et gérer les opérateurs'
        },
        {
          path: ROUTES.PARAMETRAGE,
          title: 'Paramétrage rôles et permissions',
          description: 'Administrer les rôles et la visibilité des pages'
        },
        {
          path: ROUTES.SETTINGS_PERMIS_CREATE,
          title: 'Ajout de permis',
          description: 'Créer un permis manuellement',
          key: 'ajoutPermis'
        }
      ]
    },
    {
      title: 'Workflows',
      icon: UserGroupIcon,
      path: ROUTES.WORKFLOW,
      description: 'Gestion du workflow',
      key: 'workflows',
      hasSubmenu: true,
      submenu: [
        {
          path: ROUTES.WORKFLOW_CIRCUIT,
          title: 'Circuits',
          description: 'Créer et gérer les circuits de validation'
        },
        {
          path: ROUTES.WORKFLOW_STATUT,
          title: 'Statuts',
          description: 'Créer et gérer les status'
        },
      ]
    },
  ];

  // Liste complète pour le filtrage par rôle (allMenuItems + Nos formations avec clé)
  const formationsItem = allMenuItemsAutoEcole.find((i) => i.title === 'Nos formations');
  const allMenuItemsWithWorkflowsKey = allMenuItems.map((item) =>
    item.title === 'Workflows' ? { ...item, key: 'workflows' as const } : item
  );
  const fullMenuList =
    formationsItem && !allMenuItemsWithWorkflowsKey.some((i) => (i as { key?: string }).key === 'formations')
      ? [...allMenuItemsWithWorkflowsKey, { ...formationsItem, key: 'formations' as const }]
      : allMenuItemsWithWorkflowsKey;

  const userRoleRaw = user?.role;
  const userRole =
    userRoleRaw == null
      ? ''
      : typeof userRoleRaw === 'string'
        ? userRoleRaw.trim()
        : (typeof (userRoleRaw as { authority?: string })?.authority === 'string'
          ? (userRoleRaw as { authority: string }).authority.trim()
          : String(userRoleRaw).trim());
  const { loading: permissionsLoading } = useRolePermissions();
  const visibleKeysForRole = useVisibleMenuKeysForRole(userRole ?? undefined);

  /** Rétrocompat : les enregistrements API avant la clé `nouvelleDemande` n’incluent que `candidates`. */
  function menuItemPermissionVisible(itemKey: string, visibleKeys: string[]): boolean {
    if (visibleKeys.includes(itemKey)) return true;
    if (itemKey === 'nouvelleDemande' && visibleKeys.includes('candidates')) return true;
    return false;
  }

  type SidebarMenuItem = (typeof allMenuItems)[number] | (typeof allMenuItemsAutoEcole)[number];
  let menuItems: SidebarMenuItem[];
  if (permissionsLoading || visibleKeysForRole === null) {
    // En attente de la réponse API : ne rien afficher d’autre (pas de fallback store)
    menuItems = [];
  } else {
    // Réponse API reçue : afficher uniquement les entrées autorisées par l’API
    menuItems = fullMenuList.filter((item) => {
      const k = (item as { key?: string }).key;
      return !!(k && menuItemPermissionVisible(k, visibleKeysForRole));
    }) as SidebarMenuItem[];
  }

  const handleNavigation = (path: string) => {
    navigate(path);
    // Ne pas fermer la sidebar sur desktop
    if (isMobile) {
      // Sur mobile, on peut laisser la sidebar se fermer
    }
  };

  const handleLogout = () => {
    try {
      authService.logoutBackEnd();
      tokenService.clearAll()
      logout();
      navigate(ROUTES.LOGIN);
    } catch (e) {
      console.log(e);
    }
  };

  const isSubPathActive = (path: string) => {
    if (path === ROUTES.DASHBOARD) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const isMenuItemActive = (item: { path: string; title?: string; hasSubmenu?: boolean }) => {
    const path = item.path;
    if (path === ROUTES.DASHBOARD) {
      return location.pathname === path;
    }
    if (item.title === 'Gestion des Candidats' && item.hasSubmenu) {
      const p = location.pathname;
      if (!p.startsWith(ROUTES.ELEVES)) return false;
      const onNouvelle =
        p === ROUTES.NOUVELLE_DEMANDE || p.startsWith(`${ROUTES.NOUVELLE_DEMANDE}/`);
      if (onNouvelle) return false;
      return true;
    }
    return location.pathname.startsWith(path);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: open ? 256 : 64,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? 256 : 64,
            boxSizing: 'border-box',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
            backgroundColor: '#3A75C4',
            borderRight: 'none',
            borderRadius: 0,
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            backgroundColor: '#2A5A9A',
            color: 'white',
            p: open ? 3 : 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            mb: open ? 2.5 : 0,
          }}>
          <Avatar
                sx={{
                  backgroundColor: '#009E61',
                  width: open ? 56 : 40,
                  height: open ? 56 : 40,
                  fontSize: open ? '1.75rem' : '1.25rem',
                  fontWeight: 600,
                  borderRadius: 0,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
          </Box>
          
          {open && (
            <Box sx={{ 
              mt: 1.5,
              textAlign: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: '0.8125rem',
                }}
              >
                Espace Administration
              </Typography>
            </Box>
          )}
        </Box>
      

        {/* Navigation */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
          <List sx={{ px: open ? 1.5 : 1, py: 0 }}>
            {user?.role !== "ROLE_AUTO_ECOLE"
              ? (menuItems.length > 0 ? menuItems.map((item) => {
              const IconComponent = item.icon;
              const isCandidatsItem = item.title === 'Gestion des Candidats';
              const isSettingsItem = item.title === 'Paramètres';
              const isWorkflowItem = item.title === 'Workflows';
              const isFinanceItem = item.title === 'Finance';
              return (
                <React.Fragment key={item.path}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        if (isCandidatsItem && item.hasSubmenu) {
                          setCandidatsOpen(!candidatsOpen);
                        } else if (isSettingsItem && item.hasSubmenu) {
                          setSettingsOpen(!settingsOpen);
                        } else if (isWorkflowItem && item.hasSubmenu) {
                          setWorkflowOpen(!workflowOpen);
                        } else if (isFinanceItem && item.hasSubmenu) {
                          setFinanceOpen(!financeOpen);
                        } else {
                          handleNavigation(item.path);
                        }
                      }}
                      sx={{
                        mx: 0,
                        px: open ? 1.5 : 1,
                        py: 0.875,
                        mb: 0.5,
                        borderRadius: 0,
                        justifyContent: open ? 'flex-start' : 'center',
                        backgroundColor: isMenuItemActive(item) 
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'transparent',
                        color: isMenuItemActive(item) ? 'white' : 'rgba(255, 255, 255, 0.85)',
                        minHeight: 44,
                        '&:hover': {
                          backgroundColor: isMenuItemActive(item) 
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)',
                        },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      title={open ? item.description : item.title}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: open ? 40 : 0,
                          justifyContent: 'center',
                          color: 'inherit',
                          mr: open ? 1.5 : 0,
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: 'inherit' }} />
                      </ListItemIcon>
                      {open && (
                        <>
                          <ListItemText
                            primary={item.title}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: isMenuItemActive(item) ? 600 : 500,
                              color: 'inherit',
                              fontSize: '0.875rem',
                            }}
                          />
                          {(isCandidatsItem || isSettingsItem || isWorkflowItem || isFinanceItem) && item.hasSubmenu && (
                            <ChevronDownIcon
                              className="w-5 h-5"
                              style={{
                                transform: (isCandidatsItem
                                  ? candidatsOpen
                                  : isSettingsItem
                                    ? settingsOpen
                                    : isWorkflowItem
                                      ? workflowOpen
                                      : financeOpen)
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                color: 'rgba(255, 255, 255, 0.7)',
                              }}
                            />
                          )}
                        </>
                      )}
                    </ListItemButton>
                  </ListItem>

                  {/* Submenu for candidats */}
                  {open && isCandidatsItem && item.hasSubmenu && (
                    <Collapse in={candidatsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.map((subItem) => {
                          const subActive = isSubPathActive(subItem.path);
                          const SubIconComponent = (subItem as any).icon;
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive 
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                {SubIconComponent && (
                                  <ListItemIcon
                                    sx={{
                                      minWidth: 36,
                                      color: 'inherit',
                                    }}
                                  >
                                    <SubIconComponent className="w-5 h-5" style={{ color: 'inherit' }} />
                                  </ListItemIcon>
                                )}
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}

                  {/* Submenu for settings */}
                  {open && isSettingsItem && item.hasSubmenu && (
                    <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.filter((subItem) => {
                          const subKey = (subItem as { key?: string }).key;
                          if (!subKey) return true;
                          return visibleKeysForRole ? visibleKeysForRole.includes(subKey) : true;
                        }).map((subItem) => {
                          const subActive = isSubPathActive(subItem.path);
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive 
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}


                  {/* Submenu for settings */}
                  {open && isWorkflowItem && item.hasSubmenu && (
                    <Collapse in={workflowOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.map((subItem) => {
                          const subActive = isSubPathActive(subItem.path);
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive 
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}

                  {open && isFinanceItem && item.hasSubmenu && (
                    <Collapse in={financeOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.map((subItem) => {
                          const subActive =
                            subItem.path === ROUTES.FINANCE
                              ? location.pathname === ROUTES.FINANCE
                              : location.pathname === subItem.path;
                          const SubIconComponent = (subItem as { icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }).icon;
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                {SubIconComponent && (
                                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                                    <SubIconComponent className="w-5 h-5" style={{ color: 'inherit' }} />
                                  </ListItemIcon>
                                )}
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}

                </React.Fragment>
              );
            }) : null)
              : allMenuItemsAutoEcole.map((item) => {
              const IconComponent = item.icon;
              const isCandidatsItem = item.title === 'Gestion des Candidats';
              const isSettingsItem = item.title === 'Paramètres';
              const isWorkflowItem = item.title === 'Workflows';
              const isFinanceItem = item.title === 'Finance';
              return (
                <React.Fragment key={item.path}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        if (isCandidatsItem && item.hasSubmenu) {
                          setCandidatsOpen(!candidatsOpen);
                        } else if (isSettingsItem && item.hasSubmenu) {
                          setSettingsOpen(!settingsOpen);
                        } else if (isWorkflowItem && item.hasSubmenu) {
                          setWorkflowOpen(!workflowOpen);
                        } else if (isFinanceItem && item.hasSubmenu) {
                          setFinanceOpen(!financeOpen);
                        } else {
                          handleNavigation(item.path);
                        }
                      }}
                      sx={{
                        mx: 0,
                        px: open ? 1.5 : 1,
                        py: 0.875,
                        mb: 0.5,
                        borderRadius: 0,
                        justifyContent: open ? 'flex-start' : 'center',
                        backgroundColor: isMenuItemActive(item) 
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'transparent',
                        color: isMenuItemActive(item) ? 'white' : 'rgba(255, 255, 255, 0.85)',
                        minHeight: 44,
                        '&:hover': {
                          backgroundColor: isMenuItemActive(item) 
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)',
                        },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      title={open ? item.description : item.title}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: open ? 40 : 0,
                          justifyContent: 'center',
                          color: 'inherit',
                          mr: open ? 1.5 : 0,
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: 'inherit' }} />
                      </ListItemIcon>
                      {open && (
                        <>
                          <ListItemText
                            primary={item.title}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: isMenuItemActive(item) ? 600 : 500,
                              color: 'inherit',
                              fontSize: '0.875rem',
                            }}
                          />
                          {(isCandidatsItem || isSettingsItem || isWorkflowItem || isFinanceItem) && item.hasSubmenu && (
                            <ChevronDownIcon
                              className="w-5 h-5"
                              style={{
                                transform: (isCandidatsItem
                                  ? candidatsOpen
                                  : isSettingsItem
                                    ? settingsOpen
                                    : isWorkflowItem
                                      ? workflowOpen
                                      : financeOpen)
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                color: 'rgba(255, 255, 255, 0.7)',
                              }}
                            />
                          )}
                        </>
                      )}
                    </ListItemButton>
                  </ListItem>

                  {/* Submenu for candidats */}
                  {open && isCandidatsItem && item.hasSubmenu && (
                    <Collapse in={candidatsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.map((subItem) => {
                          const subActive = isSubPathActive(subItem.path);
                          const SubIconComponent = (subItem as any).icon;
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive 
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                {SubIconComponent && (
                                  <ListItemIcon
                                    sx={{
                                      minWidth: 36,
                                      color: 'inherit',
                                    }}
                                  >
                                    <SubIconComponent className="w-5 h-5" style={{ color: 'inherit' }} />
                                  </ListItemIcon>
                                )}
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}

                  {/* Submenu for settings */}
                  {open && isSettingsItem && item.hasSubmenu && (
                    <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.filter((subItem) => {
                          const subKey = (subItem as { key?: string }).key;
                          if (!subKey) return true;
                          return visibleKeysForRole ? visibleKeysForRole.includes(subKey) : true;
                        }).map((subItem) => {
                          const subActive = isSubPathActive(subItem.path);
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive 
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}


                  {/* Submenu for settings */}
                  {open && isWorkflowItem && item.hasSubmenu && (
                    <Collapse in={workflowOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.map((subItem) => {
                          const subActive = isSubPathActive(subItem.path);
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive 
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}

                  {open && isFinanceItem && item.hasSubmenu && (
                    <Collapse in={financeOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.submenu?.map((subItem) => {
                          const subActive =
                            subItem.path === ROUTES.FINANCE
                              ? location.pathname === ROUTES.FINANCE
                              : location.pathname === subItem.path;
                          const SubIconComponent = (subItem as { icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }).icon;
                          return (
                            <ListItem key={subItem.path} disablePadding>
                              <ListItemButton
                                onClick={() => handleNavigation(subItem.path)}
                                sx={{
                                  ml: 4.5,
                                  mr: 1.5,
                                  px: 1.5,
                                  py: 0.75,
                                  mb: 0.5,
                                  borderRadius: 0,
                                  backgroundColor: subActive
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'transparent',
                                  color: subActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                                  minHeight: 40,
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                  },
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                {SubIconComponent && (
                                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                                    <SubIconComponent className="w-5 h-5" style={{ color: 'inherit' }} />
                                  </ListItemIcon>
                                )}
                                <ListItemText
                                  primary={subItem.title}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    fontSize: '0.8125rem',
                                    fontWeight: subActive ? 500 : 400,
                                  }}
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}

                </React.Fragment>
              );
            })}
          </List>
        </Box>

        {/* User Info & Actions */}
        <Box sx={{ mt: 'auto' }}>

          {/* Logout Button */}
          <Box
            sx={{
              backgroundColor: '#2A5A9A',
              color: 'white',
              p: open ? 2 : 1.5,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <ListItemButton
              onClick={handleLogout}
              sx={{
                mx: 0,
                px: open ? 1.5 : 1,
                py: 0.875,
                borderRadius: 0,
                color: 'rgba(255, 255, 255, 0.85)',
                justifyContent: open ? 'flex-start' : 'center',
                backgroundColor: 'transparent',
                minHeight: 44,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              title="Se déconnecter"
            >
              <ListItemIcon sx={{ 
                minWidth: open ? 40 : 0, 
                justifyContent: 'center', 
                mr: open ? 1.5 : 0,
              }}>
                <Avatar
                  sx={{
                    backgroundColor: 'white',
                    width: 32,
                    height: 32,
                    borderRadius: 0,
                  }}
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" style={{ color: '#3A75C4' }} />
                </Avatar>
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary="Déconnexion"
                  secondary="Se déconnecter"
                  primaryTypographyProps={{ 
                    variant: 'body2', 
                    fontWeight: 500, 
                    color: 'inherit',
                    fontSize: '0.875rem',
                  }}
                  secondaryTypographyProps={{ 
                    variant: 'caption', 
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontSize: '0.8125rem',
                  }}
                />
              )}
            </ListItemButton>
          </Box>
        </Box>
      </Drawer>

      {/* Toggle Button */}
      <IconButton
        onClick={onToggle}
        sx={{
          position: 'fixed',
          top: '50%',
          left: open ? 256 : 64,
          transform: 'translateY(-50%)',
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 0,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          width: 32,
          height: 32,
          '&:hover': {
            backgroundColor: '#f5f5f5',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
          },
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: { xs: 'none', sm: 'flex' },
        }}
        title={open ? 'Réduire la sidebar' : 'Étendre la sidebar'}
      >
        {open ? (
          <ChevronLeftIcon 
            className="w-6 h-6"
            style={{ color: '#3A75C4' }}
          />
        ) : (
          <ChevronRightIcon 
            className="w-6 h-6"
            style={{ color: '#3A75C4' }}
          />
        )}
      </IconButton>

      {/* Mobile Bottom Bar */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: '#3A75C4',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.1)',
            display: { xs: 'block', sm: 'none' },
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-around', 
            py: 1.5,
            px: 1,
          }}>
            {menuItems.length > 0 ? menuItems.map((item) => {
              const IconComponent = item.icon;
              const active = isMenuItemActive(item);
              return (
                <IconButton
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    flexDirection: 'column',
                    color: active ? 'white' : 'rgba(255, 255, 255, 0.7)',
                    p: 1.5,
                    minWidth: 0,
                    flex: 1,
                    borderRadius: 0,
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                    },
                  }}
                  title={item.title}
                >
                  <IconComponent 
                    className="w-6 h-6 mb-1"
                    style={{
                      filter: active ? 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3))' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} 
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontSize: '0.7rem', 
                      color: 'inherit',
                      fontWeight: active ? 600 : 400,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {item.title.split(' ')[0]}
                  </Typography>
                </IconButton>
              );
            }) : null}
          </Box>
        </Box>
      )}
    </>
  );
};

export default AppSidebar;
