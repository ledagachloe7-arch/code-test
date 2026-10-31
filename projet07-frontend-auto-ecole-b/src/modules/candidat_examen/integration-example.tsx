// Exemple d'intégration du module candidat_examen dans le routeur principal
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CandidatExamenRoutes } from './routes';
import { ROUTES } from '../../shared/constants';

// Exemple d'intégration dans App.tsx ou votre routeur principal
const AppWithCandidatExamen: React.FC = () => {
  return (
    <Routes>
      {/* Vos routes existantes */}
      <Route path="/" element={<div>Accueil</div>} />
      <Route path="/login" element={<div>Login</div>} />
      <Route path="/dashboard" element={<div>Dashboard</div>} />
      
      {/* Routes du module candidat_examen */}
      <Route path={`${ROUTES.CANDIDATS_EXAMEN}/*`} element={<CandidatExamenRoutes />} />
      
      {/* Autres routes... */}
    </Routes>
  );
};

export default AppWithCandidatExamen;

// Alternative: Intégration directe des routes
export const CandidatExamenRoutesIntegration = () => (
  <Routes>
    <Route path={ROUTES.CANDIDATS_EXAMEN} element={<CandidatExamenRoutes />} />
    <Route path={ROUTES.CANDIDATS_EXAMEN_CANDIDATS} element={<CandidatExamenRoutes />} />
    <Route path={ROUTES.CANDIDATS_EXAMEN_SESSIONS} element={<CandidatExamenRoutes />} />
    <Route path={ROUTES.CANDIDATS_EXAMEN_PLANIFICATION} element={<CandidatExamenRoutes />} />
    <Route path={ROUTES.CANDIDATS_EXAMEN_DEMO} element={<CandidatExamenRoutes />} />
  </Routes>
);
