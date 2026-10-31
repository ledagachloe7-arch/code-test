import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  circuitSuiviService,
  CircuitSuivi,
  EtapeCircuit,
  Document
} from '../services/circuit-suivi.service';
import EtapeDetails from './EtapeDetails';
import axiosClient from '../../../shared/utils/axiosConfig';

interface CircuitEtapesViewProps {
  circuit: CircuitSuivi;
  dossierId?: string;
  onEtapeChange?: (etape: EtapeCircuit) => void;
}

const STORAGE_KEY_PREFIX = 'reception_etapes_view_tab';

const CircuitEtapesView: React.FC<CircuitEtapesViewProps> = ({
  circuit,
  dossierId,
  onEtapeChange
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [etapes, setEtapes] = useState<EtapeCircuit[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasRestoredTabRef = useRef(false);

  // Réinitialiser le flag de restauration quand le dossier ou le circuit change
  useEffect(() => {
    hasRestoredTabRef.current = false;
  }, [dossierId, circuit?.id]);

  // Restaurer l'onglet actif depuis sessionStorage après chargement des étapes (ex. après refresh)
  useEffect(() => {
    if (etapes.length === 0 || !dossierId || !circuit?.id || hasRestoredTabRef.current) return;
    hasRestoredTabRef.current = true;
    const key = `${STORAGE_KEY_PREFIX}_${dossierId}_${circuit.id}`;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored != null) {
        const idx = parseInt(stored, 10);
        if (!isNaN(idx) && idx >= 0 && idx < etapes.length) {
          setActiveTab(idx);
        }
      }
    } catch (_) {
      // ignore
    }
  }, [dossierId, circuit?.id, etapes.length, etapes]);

  // Persister l'onglet actif pour survivre au refresh
  const setActiveTabAndPersist = useCallback((nextIndex: number) => {
    setActiveTab(nextIndex);
    try {
      if (dossierId && circuit?.id) {
        sessionStorage.setItem(`${STORAGE_KEY_PREFIX}_${dossierId}_${circuit.id}`, String(nextIndex));
      }
    } catch (_) {
      // ignore
    }
  }, [dossierId, circuit?.id]);

  // Charger les étapes du circuit
  useEffect(() => {
    const loadEtapes = async () => {
      if (!circuit.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Si le circuit a déjà des étapes, les utiliser
        if (circuit.etapes && circuit.etapes.length > 0) {
          // Trier les étapes par ordre (si disponible), sinon par code
          const sortedEtapes = [...circuit.etapes].sort((a, b) => {
            // Priorité à l'ordre si disponible
            if (a.ordre !== undefined && b.ordre !== undefined) {
              return a.ordre - b.ordre;
            }
            if (a.ordre !== undefined) return -1;
            if (b.ordre !== undefined) return 1;
            // Fallback sur le code si pas d'ordre
            return (a.code || '').localeCompare(b.code || '');
          });
          setEtapes(sortedEtapes);
        } else {
          // Sinon, essayer de charger depuis l'API
          try {
            const response = await axiosClient.get(`/workflow/etapes`, {
              params: { circuit_id: circuit.id }
            });
            const data = response.data;
            const sortedEtapes = Array.isArray(data) ? data : (data.data || []);
            sortedEtapes.sort((a: EtapeCircuit, b: EtapeCircuit) => {
              // Priorité à l'ordre si disponible
              if (a.ordre !== undefined && b.ordre !== undefined) {
                return a.ordre - b.ordre;
              }
              if (a.ordre !== undefined) return -1;
              if (b.ordre !== undefined) return 1;
              // Fallback sur le code si pas d'ordre
              return (a.code || '').localeCompare(b.code || '');
            });
            setEtapes(sortedEtapes);
          } catch (err) {
            console.error('Erreur lors du chargement des étapes depuis l\'API:', err);
          }
        }
      } catch (err: any) {
        console.error('Erreur lors du chargement des étapes:', err);
        setError('Erreur lors du chargement des étapes');
      } finally {
        setLoading(false);
      }
    };

    loadEtapes();
  }, [circuit]);

  // Fonction helper pour charger le mapping depuis localStorage
  const loadPieceJustificationMapping = React.useCallback(() => {
    try {
      const stored = localStorage.getItem('document_piece_mapping');
      if (stored) {
        const parsed = JSON.parse(stored);
        const mapping = new Map<string, string>();
        Object.entries(parsed).forEach(([docId, data]: [string, any]) => {
          if (data && data.piece_justification_id) {
            mapping.set(docId, data.piece_justification_id);
          }
        });
        return mapping;
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors du chargement du mapping depuis localStorage:', error);
    }
    return new Map<string, string>();
  }, []);

  // Charger les documents du dossier
  useEffect(() => {
    const loadDocuments = async () => {
      if (!dossierId) {
        setDocuments([]);
        return;
      }

      try {
        // Charger le mapping depuis localStorage au début de chaque chargement de documents
        const pieceJustificationMapping = loadPieceJustificationMapping();
        console.log('🔄 Rechargement des documents - Mapping chargé:', {
          nombreMappings: pieceJustificationMapping.size,
          mappings: Array.from(pieceJustificationMapping.entries()).map(([docId, pieceId]) => ({ docId, pieceId }))
        });

        const docs = await circuitSuiviService.getDocumentsByDossier(dossierId);
        
        // Normaliser les documents pour restaurer piece_justification_id depuis le mapping si manquant
        const normalizedDocs = docs.map((doc: any) => {
          // IMPORTANT: Le mapping est la source de vérité car c'est ce qui a été envoyé lors de l'upload
          // L'API peut retourner un mauvais piece_justification_id, donc on priorise le mapping
          const apiPieceId = doc.piece_justification_id || null;
          const mappedPieceId = doc.id ? pieceJustificationMapping.get(doc.id) : null;
          // PRIORISER le mapping (source de vérité) au lieu de l'API
          const restoredPieceJustificationId = mappedPieceId || apiPieceId || null;
          
          // Log pour debug si on utilise le mapping au lieu de l'API
          if (mappedPieceId && apiPieceId && mappedPieceId !== apiPieceId && doc.id) {
            console.log('🔧 Utilisation du mapping au lieu de l\'API:', {
              documentId: doc.id,
              nomFichier: doc.nom_fichier || doc.nom,
              apiPieceId: apiPieceId,
              mappedPieceId: mappedPieceId,
              etapeId: doc.etape_id
            });
          } else if (!apiPieceId && mappedPieceId && doc.id) {
            console.log('🔧 Restauration piece_justification_id depuis le mapping:', {
              documentId: doc.id,
              nomFichier: doc.nom_fichier || doc.nom,
              pieceJustificationId: mappedPieceId,
              etapeId: doc.etape_id
            });
          }
          
          return {
            ...doc,
            // Restaurer piece_justification_id depuis le mapping si manquant
            piece_justification_id: restoredPieceJustificationId,
          };
        });
        
        console.log('📋 Documents normalisés avec piece_justification_id:', 
          normalizedDocs.map(d => ({
            id: d.id,
            nom: d.nom_fichier,
            piece_justification_id: d.piece_justification_id,
            etape_id: d.etape_id
          }))
        );
        
        setDocuments(normalizedDocs);
      } catch (err: any) {
        console.error('Erreur lors du chargement des documents:', err);
        setDocuments([]);
      }
    };

    loadDocuments();
  }, [dossierId, loadPieceJustificationMapping]);

  // Écouter les événements de document uploadé
  useEffect(() => {
    const handleDocumentUploaded = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail || {};
      
      // Vérifier que l'événement concerne ce dossier
      if (detail.documentable_id && detail.documentable_id !== dossierId) {
        return;
      }
      
      if (dossierId) {
        // Attendre un peu pour laisser le temps au backend de sauvegarder
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Charger le mapping depuis localStorage
        const pieceJustificationMapping = loadPieceJustificationMapping();
        
        const docs = await circuitSuiviService.getDocumentsByDossier(dossierId);
        
        // Normaliser les documents pour restaurer piece_justification_id depuis le mapping si manquant
        const normalizedDocs = docs.map((doc: any) => {
          const apiPieceId = doc.piece_justification_id || null;
          const mappedPieceId = doc.id ? pieceJustificationMapping.get(doc.id) : null;
          const restoredPieceJustificationId = mappedPieceId || apiPieceId || null;
          
          return {
            ...doc,
            piece_justification_id: restoredPieceJustificationId,
          };
        });
        
        setDocuments(normalizedDocs);
      }
    };

    window.addEventListener('documentUploaded', handleDocumentUploaded as EventListener);
    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUploaded as EventListener);
    };
  }, [dossierId, loadPieceJustificationMapping]);

  // Détecter l'étape active (première étape en attente ou en cours)
  useEffect(() => {
    if (etapes.length > 0 && onEtapeChange) {
      const activeEtape = etapes[activeTab] || etapes[0];
      onEtapeChange(activeEtape);
    }
  }, [etapes, activeTab, onEtapeChange]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTabAndPersist(newValue);
    if (etapes[newValue] && onEtapeChange) {
      onEtapeChange(etapes[newValue]);
    }
  };

  const handleDocumentUploaded = async () => {
    if (dossierId) {
      // Attendre un peu pour laisser le temps au backend de sauvegarder
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Charger le mapping depuis localStorage
      const pieceJustificationMapping = loadPieceJustificationMapping();
      
      const docs = await circuitSuiviService.getDocumentsByDossier(dossierId);
      
      // Normaliser les documents pour restaurer piece_justification_id depuis le mapping si manquant
      const normalizedDocs = docs.map((doc: any) => {
        const apiPieceId = doc.piece_justification_id || null;
        const mappedPieceId = doc.id ? pieceJustificationMapping.get(doc.id) : null;
        const restoredPieceJustificationId = mappedPieceId || apiPieceId || null;
        
        return {
          ...doc,
          piece_justification_id: restoredPieceJustificationId,
        };
      });
      
      setDocuments(normalizedDocs);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (etapes.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Aucune étape définie pour ce circuit.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {etapes.map((etape) => (
            <Tab
              key={etape.id}
              label={etape.libelle}
              sx={{ textTransform: 'none' }}
            />
          ))}
        </Tabs>
      </Paper>

      {etapes.map((etape, index) => (
        <Box
          key={etape.id}
          role="tabpanel"
          hidden={activeTab !== index}
          id={`etape-tabpanel-${index}`}
          aria-labelledby={`etape-tab-${index}`}
        >
          {activeTab === index && (
            <EtapeDetails
              etape={etape}
              circuitId={circuit.id || ''}
              etapeIndex={index}
              isActive={activeTab === index}
              isCompleted={false}
              isBlocked={false}
              uploadedDocuments={documents}
              dossierId={dossierId}
              onDocumentUploaded={handleDocumentUploaded}
              onTransitionToNext={index < etapes.length - 1 ? () => setActiveTabAndPersist(index + 1) : undefined}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default CircuitEtapesView;

