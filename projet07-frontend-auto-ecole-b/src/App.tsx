import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CssBaseline } from '@mui/material';
import AppRoutes from './routes';
import { AppProvider } from './store';
import { RolePermissionsProvider } from './modules/settings/context/RolePermissionsContext';
import { DashboardCacheProvider } from './modules/dashboard/context/DashboardCacheContext';
import { DashboardDataProvider } from './modules/dashboard/context/DashboardDataContext';
import { ReceptionCacheProvider, ReceptionDataProvider } from './modules/reception/tables/ReceptionDossierTypeTable/context';
import { ReceptionCandidatDetailsDataProvider } from './modules/reception/pages/ReceptionCandidatDetailsPage/ReceptionCandidatDetailsDataContext';
import { TraitementDossierDataProvider } from './modules/reception/traitement-dossier/context/TraitementDossierDataContext';
import { FinanceDataProvider } from './modules/finance/context';

function App() {
  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) link.href = '/assets/img/mtt.png';
    else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.type = 'image/png';
      newLink.href = '/assets/img/mtt.png';
      document.head.appendChild(newLink);
    }
  }, []);
  return (
    <AppProvider>
      <DashboardCacheProvider>
        <DashboardDataProvider>
          <ReceptionCacheProvider>
            <ReceptionDataProvider>
              <ReceptionCandidatDetailsDataProvider>
                <TraitementDossierDataProvider>
                  <FinanceDataProvider>
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                      }}
                    >
                      <RolePermissionsProvider>
                        <CssBaseline />

                        <div className="min-h-screen bg-gray-50">
                          <AppRoutes />

                          <Toaster
                            position="top-right"
                            toastOptions={{
                              duration: 4000,
                              style: {
                                background: "#363636",
                                color: "#fff",
                              },
                            }}
                          />
                        </div>
                      </RolePermissionsProvider>
                    </BrowserRouter>
                  </FinanceDataProvider>
                </TraitementDossierDataProvider>
              </ReceptionCandidatDetailsDataProvider>
            </ReceptionDataProvider>
          </ReceptionCacheProvider>
        </DashboardDataProvider>
      </DashboardCacheProvider>
    </AppProvider>
  );
}

export default App

