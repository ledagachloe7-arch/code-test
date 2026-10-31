// Définition des routes par module
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../shared/constants';
import { useAppStore } from '../store';
import AppLayout from '../shared/components/AppLayout';
import AuthLoader from '../shared/components/AuthLoader';

// Import des composants de pages
import LoginPage from '../modules/auth/forms/LoginForm';
import { DashboardPage } from '../modules/dashboard';
import ValidationPage from './ValidationPage';
import ElevesPage from './ElevesPage';
import CNEPCPage from './CNEPCPage';


import PageUpdateAutoecole from '../modules/cnepc/forms/updateinfoAutoEcole'
import PageReferenciel from '../modules/cnepc/forms/referentiel';


// import { SettingsPage, UserManagementPage } from '../modules/settings';
import CircuitPage from '../modules/circuit/pages/CircuitPage';
import CircuitDetailPage from '../modules/circuit/pages/CircuitDetailPage';
import StatutPage from '../modules/statut/pages/StatutPage';

import { CandidateDetailsPage, TypeDemandePage, GestionDossierPage, ArchivedDossiersPage, UsagerDossierPage, InscriptionFormationPage } from '../modules/cnepc/pages';
import { CandidatDetailsPage } from '../modules/user';
import CreateDossierFlowPage from '../modules/cnepc/pages/CreateDossierFlowPage';
import { PieceJustificativePage } from '../modules/pieces-justificatives/pages';
import SettingsPage from '../modules/settings/pages/SettingsPage';
import ParametrageRolesPage from '../modules/settings/pages/ParametrageRolesPage';
import CreatePermisPage from '../modules/settings/pages/CreatePermisPage';
import { UserManagementPage } from '../modules/user';
import AutoEcolePage from './AutoEcolePage';
import ResetPasswordForm from '../modules/auth/forms/resetpassword';
import PageChangePassWord from '../modules/cnepc/forms/changePassword';

// Import des pages du module candidat_examen
import { 
  CandidatExamenListPage,
  SessionExamenListPage,
  PlanificationPage,
  EpreuvePage,
  TestPage
} from '../modules/candidat_examen/pages';
import { ReceptionDossiersPage } from '../modules/reception';
import ReceptionDossierDetailsPage from '../modules/reception/pages/ReceptionDossierDetailsPage';
import ReceptionCandidatDetailsPage from '../modules/reception/pages/ReceptionCandidatDetailsPage';
import {
  TraitementDossierPage,
  TraitementDossierIndexRoute,
  TraitementDossierDocumentsRoute,
  TraitementDossierCircuitRoute,
} from '../modules/reception/traitement-dossier';
import DemandeDetailsPage from '../modules/eleves/pages/DemandeDetailsPage';
import EleveInscritDetailsPage from '../modules/eleves/pages/EleveInscritDetailsPage';
import ProfilePage from '../modules/auth/pages/ProfilePage';
import FormationsPage from '../modules/cnepc/pages/FormationsPage';
import { FinancePage } from '../modules/finance';
import FraisDossierPage from '../modules/frais-dossier/pages/FraisDossierPage';
import { SupportDossiersPage } from '../modules/support';

// Composant de protection des routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAppStore();

  // Ne pas rediriger tant que l'état d'authentification est en cours de vérification.
  if (isLoading) {
    return React.createElement(AuthLoader, null);
  }

  // Rediriger les utilisateurs non authentifiés vers la page de connexion.
  if (!isAuthenticated) {
    return React.createElement(Navigate, {
      to: ROUTES.LOGIN,
      replace: true,
    });
  }

  // Rendre directement le contenu protégé.
  return React.createElement(React.Fragment, null, children);
};

const AppRoutes: React.FC = () => {
  return React.createElement(Routes, null,
    // Route par défaut - redirige vers le dashboard ou login
    React.createElement(Route, { 
      path: "/", 
      element: React.createElement(Navigate, { to: ROUTES.DASHBOARD, replace: true }) 
    }),
    // Route de connexion
    React.createElement(Route, { path: ROUTES.LOGIN, element: React.createElement(LoginPage) }),

       // reset password 
    React.createElement(Route, { path: ROUTES.RPW, element: React.createElement(ResetPasswordForm) }),

     //   React.createElement(Route, { path: ROUTES.UPDATE, element: React.createElement(PageUpdateAutoecole) }),
    // Routes protégées avec layout
    React.createElement(Route, { 
      path: ROUTES.DASHBOARD, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(DashboardPage))
      ) 
    }),
     React.createElement(Route, { 
      path: ROUTES.UPDATE, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(PageUpdateAutoecole))
      ) 
    }),
      React.createElement(Route, { 
      path: ROUTES.REF, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(PageReferenciel))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.VALIDATION, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ValidationPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.ELEVES + "/*", 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ElevesPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.FORMATIONS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(FormationsPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.CNEPC, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(CNEPCPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.RECEPTION, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ReceptionDossiersPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.RECEPTION_DETAILS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ReceptionDossierDetailsPage))
      ) 
    }),
    React.createElement(Route, {
      path: ROUTES.RECEPTION_TRAITEMENT_DOSSIER,
      element: React.createElement(ProtectedRoute, null,
        React.createElement(AppLayout, { fullWidth: true, children: React.createElement(TraitementDossierPage) })
      ),
    },
      React.createElement(Route, { index: true, element: React.createElement(TraitementDossierIndexRoute) }),
      React.createElement(Route, { path: 'documents', element: React.createElement(TraitementDossierDocumentsRoute) }),
      React.createElement(Route, { path: 'circuit', element: React.createElement(TraitementDossierCircuitRoute) })
    ),
    React.createElement(Route, { 
      path: ROUTES.RECEPTION_CANDIDAT_DETAILS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ReceptionCandidatDetailsPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.FINANCE, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(FinancePage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.FINANCE_FRAIS_DOSSIER, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(FraisDossierPage))
      ) 
    }),
    React.createElement(Route, {
      path: ROUTES.SUPPORT_DOSSIERS,
      element: React.createElement(ProtectedRoute, null,
        React.createElement(AppLayout, null, React.createElement(SupportDossiersPage))
      )
    }),
    React.createElement(Route, { 
      path: ROUTES.AUTO_ECOLES, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(AutoEcolePage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.INSCRIPTION_FORMATION, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(InscriptionFormationPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.TYPE_DEMANDES, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(TypeDemandePage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.GESTION_DOSSIER, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(GestionDossierPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.GESTION_DOSSIER_ARCHIVES, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ArchivedDossiersPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.USAGER_DOSSIER, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(UsagerDossierPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.CREATE_DOSSIER, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, { hideSidebar: true, fullWidth: true, children: React.createElement(CreateDossierFlowPage) })
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.PIECES_JUSTIFICATIVES, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(PieceJustificativePage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.CANDIDAT_DETAILS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(CandidatDetailsPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.DEMANDE_DETAILS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(DemandeDetailsPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.ELEVE_INSCRIT_DETAILS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(EleveInscritDetailsPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.PROFILE, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ProfilePage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.UPDATE, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(PageUpdateAutoecole))
      ) 
    }),
        // Routes changement de mot de passe
    React.createElement(Route, { 
      path: ROUTES.CPW, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(PageChangePassWord))
      ) 
    }),
    // Routes Settings



    // React.createElement(Route, { 
    //   path: ROUTES.SETTINGS, 
    //   element: React.createElement(ProtectedRoute, null, 
    //     React.createElement(AppLayout, null, React.createElement(SettingsPage))
    //   ) 
    // }),
    // React.createElement(Route, { 
    //   path: ROUTES.USER_MANAGEMENT, 
    //   element: React.createElement(ProtectedRoute, null, 
    //     React.createElement(AppLayout, null, React.createElement(UserManagementPage))
    //   ) 
    // }),

    React.createElement(Route, { 
      path: ROUTES.WORKFLOW_CIRCUIT, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(CircuitPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.WORKFLOW_CIRCUIT_DETAIL, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(CircuitDetailPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.WORKFLOW_STATUT, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(StatutPage))
  )}),
    React.createElement(Route, { 
      path: ROUTES.SETTINGS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(SettingsPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.USER_MANAGEMENT, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(UserManagementPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.PARAMETRAGE, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(ParametrageRolesPage))
      ) 
    }),
    React.createElement(Route, {
      path: ROUTES.SETTINGS_PERMIS_CREATE,
      element: React.createElement(ProtectedRoute, null,
        React.createElement(AppLayout, null, React.createElement(CreatePermisPage))
      )
    }),

    // Routes du module candidat_examen
    React.createElement(Route, { 
      path: ROUTES.CANDIDATS_EXAMEN, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(CandidatExamenListPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.CANDIDATS_EXAMEN_CANDIDATS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(CandidatExamenListPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.CANDIDATS_EXAMEN_SESSIONS, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(SessionExamenListPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.CANDIDATS_EXAMEN_PLANIFICATION, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(PlanificationPage))
      ) 
    }),
    React.createElement(Route, { 
      path: ROUTES.CANDIDATS_EXAMEN_EPREUVES, 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(EpreuvePage))
      ) 
    }),
    // Route de test temporaire
    React.createElement(Route, { 
      path: "/test-candidats-examen", 
      element: React.createElement(ProtectedRoute, null, 
        React.createElement(AppLayout, null, React.createElement(TestPage))
      ) 
    }),

    // Route 404
    React.createElement(Route, { 
      path: "*", 
      element: React.createElement('div', null, 'Page non trouvée - 404') 
    })
  );
};

export default AppRoutes;
