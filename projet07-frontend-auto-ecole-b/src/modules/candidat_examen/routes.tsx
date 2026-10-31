// Routes pour le module candidat_examen
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  CandidatExamenListPage,
  SessionExamenListPage,
  PlanificationPage,
  EpreuvePage,
} from './pages';
import { CandidatExamenDemo } from './demo';

const CandidatExamenRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CandidatExamenListPage />} />
      <Route path="/candidats" element={<CandidatExamenListPage />} />
      <Route path="/sessions" element={<SessionExamenListPage />} />
      <Route path="/planification" element={<PlanificationPage />} />
      <Route path="/epreuves/:id" element={<EpreuvePage />} />
      <Route path="/demo" element={<CandidatExamenDemo />} />
    </Routes>
  );
};

export default CandidatExamenRoutes;
