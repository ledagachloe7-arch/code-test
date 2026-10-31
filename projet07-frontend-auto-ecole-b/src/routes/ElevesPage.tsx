import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DemandesInscriptionPage from '../modules/eleves/pages/DemandesInscriptionPage';
import ElevesInscritsPage from '../modules/eleves/pages/ElevesInscritsPage';
import HistoriquePage from '../modules/eleves/pages/HistoriquePage';
import NouvelleDemandeForm from '../modules/eleves/forms/NouvelleDemandeForm';
import NouvelleDemandeePage from '../modules/demande/pages/NouvelleDemandeePage';

const ElevesPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/eleves/demandes" replace />} />
      <Route path="/demandes" element={<DemandesInscriptionPage />} />
      <Route path="/inscrits" element={<ElevesInscritsPage />} />
      <Route path="/nouvelle-demande" element={<NouvelleDemandeePage />} />
      <Route path="/nouvelle" element={<NouvelleDemandeForm />} />
      <Route path="/historique" element={<HistoriquePage />} />
    </Routes>
  );
};

export default ElevesPage;
