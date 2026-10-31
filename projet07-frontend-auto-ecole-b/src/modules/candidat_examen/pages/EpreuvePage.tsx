// Page pour la gestion des épreuves d'un candidat
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  CircularProgress,
  Alert,
  IconButton,
  Stack,
  TextField,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { ReceptionDossier, EpreuvesResultat, EpreuveAttempt, EpreuveStatut } from '../../reception/types';
import axiosClient from '../../../shared/utils/axiosConfig';

const MAX_ATTEMPTS = 3;

function computeOverall(attempts?: EpreuveAttempt[], legacy?: EpreuveStatut): EpreuveStatut {
  if (legacy && legacy !== 'non_saisi') return legacy;
  if (!attempts || attempts.length === 0) return 'non_saisi';
  if (attempts.some(a => a.result === 'reussi')) return 'reussi';
  if (attempts.length >= MAX_ATTEMPTS && attempts.every(a => a.result !== 'reussi')) return 'echoue';
  return attempts[attempts.length - 1].result;
}

function computeGeneral(
  creneaux: EpreuveStatut,
  codeConduite: EpreuveStatut,
  tourVille: EpreuveStatut
): EpreuveStatut {
  const statuses: EpreuveStatut[] = [creneaux, codeConduite, tourVille];
  
  if (statuses.every(s => s === 'reussi')) return 'reussi';
  if (statuses.some(s => s === 'echoue')) return 'echoue';
  if (statuses.some(s => s === 'absent')) return 'absent';
  
  return 'non_saisi';
}

const EpreuveRow: React.FC<{
  label: string;
  attempts: EpreuveAttempt[];
  onAdd: (a: EpreuveAttempt) => void;
  onChange: (index: number, a: EpreuveAttempt) => void;
  onLock?: (index: number) => void;
  lockedAttempts?: Set<number>;
  disabled?: boolean;
}> = ({ label, attempts, onAdd, onChange, onLock, lockedAttempts = new Set(), disabled }) => {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">{label}</Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={disabled || attempts.length >= MAX_ATTEMPTS}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (attempts.length < MAX_ATTEMPTS) {
              onAdd({ result: 'non_saisi', date: new Date().toISOString() });
            }
          }}
        >
          Ajouter tentative
        </Button>
      </Stack>
      <Stack spacing={1}>
        {attempts.map((a, idx) => {
          const isLocked = lockedAttempts.has(idx);
          return (
            <Stack key={idx} direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ width: 60 }}>Tentative {idx + 1}</Typography>
              <Select
                size="small"
                value={a.result}
                onChange={(e: SelectChangeEvent) => onChange(idx, { ...a, result: e.target.value as any })}
                sx={{ width: 160 }}
                disabled={disabled || isLocked}
              >
                <MenuItem value="non_saisi">Non saisi</MenuItem>
                <MenuItem value="reussi">Réussi</MenuItem>
                <MenuItem value="echoue">Échoué</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
              </Select>
              <TextField
                size="small"
                type="datetime-local"
                sx={{ width: 240 }}
                value={new Date(a.date).toISOString().slice(0,16)}
                onChange={(e) => onChange(idx, { ...a, date: new Date(e.target.value).toISOString() })}
                disabled={disabled || isLocked}
              />
              <TextField
                size="small"
                placeholder="Note (optionnel)"
                value={a.note || ''}
                onChange={(e) => onChange(idx, { ...a, note: e.target.value })}
                sx={{ flex: 1 }}
                disabled={disabled || isLocked}
              />
              {onLock && (
                <Tooltip title={isLocked ? "Déverrouiller la tentative" : "Verrouiller la tentative"}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onLock(idx)}
                      color={isLocked ? "primary" : "default"}
                      disabled={disabled}
                    >
                      {isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Stack>
          );
        })}
        {attempts.length === 0 && (
          <Typography variant="body2" color="text.secondary">Aucune tentative saisie.</Typography>
        )}
      </Stack>
    </Box>
  );
};

const EpreuvePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<ReceptionDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<EpreuvesResultat>({});
  const addingAttemptRef = useRef<Set<string>>(new Set());
  const previousDossierIdRef = useRef<string | null>(null);
  
  const [lockedAttempts, setLockedAttempts] = useState<{
    creneaux: Set<number>;
    codeConduite: Set<number>;
    tourVille: Set<number>;
  }>({
    creneaux: new Set(),
    codeConduite: new Set(),
    tourVille: new Set()
  });
  
  const [lockConfirmation, setLockConfirmation] = useState<{
    open: boolean;
    type: 'creneaux' | 'codeConduite' | 'tourVille' | null;
    previousStatus: EpreuveStatut | null;
  }>({
    open: false,
    type: null,
    previousStatus: null
  });
  
  const [failureConfirmation, setFailureConfirmation] = useState<{
    open: boolean;
    type: 'creneaux' | 'codeConduite' | 'tourVille' | null;
  }>({
    open: false,
    type: null
  });
  
  const previousStatusRef = useRef<{
    creneaux: EpreuveStatut;
    codeConduite: EpreuveStatut;
    tourVille: EpreuveStatut;
  }>({
    creneaux: 'non_saisi',
    codeConduite: 'non_saisi',
    tourVille: 'non_saisi'
  });
  
  const refusedLockRef = useRef<Set<'creneaux' | 'codeConduite' | 'tourVille'>>(new Set());
  const refusedFailureLockRef = useRef<Set<'creneaux' | 'codeConduite' | 'tourVille'>>(new Set());

  // Charger le dossier
  useEffect(() => {
    const loadDossier = async () => {
      if (!id) {
        setError('ID du programme session manquant');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Récupérer le programme-session pour obtenir le dossier_id
        const programmeSessionResponse = await axiosClient.get(`/programme-sessions/${id}`);
        const programmeSession = programmeSessionResponse.data?.data || 
                                 programmeSessionResponse.data?.programme_session || 
                                 programmeSessionResponse.data;

        const dossierId = programmeSession?.dossier_id || programmeSession?.dossier?.id;

        if (!dossierId) {
          throw new Error('Aucun dossier associé à ce programme session');
        }

        // Charger le dossier complet
        const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`);
        let dossierComplet = dossierResponse.data?.data || dossierResponse.data;

        // Enrichir les données de formation si nécessaire (charger type_permis si seulement l'ID est présent)
        if (dossierComplet?.formation) {
          console.log('📋 Formation trouvée:', {
            hasTypePermis: !!dossierComplet.formation.type_permis,
            typePermisId: dossierComplet.formation.type_permis_id,
            formation: dossierComplet.formation
          });

          // Si on a seulement l'ID du type_permis mais pas l'objet complet
          if (!dossierComplet.formation.type_permis && dossierComplet.formation.type_permis_id) {
            try {
              console.log('🔄 Chargement du type de permis depuis référentiels:', dossierComplet.formation.type_permis_id);
              // Charger le type de permis via l'endpoint référentiels
              const typePermisResponse = await axiosClient.get(`/referentiels/${dossierComplet.formation.type_permis_id}`);
              if (typePermisResponse.data?.success && typePermisResponse.data.data) {
                dossierComplet.formation.type_permis = typePermisResponse.data.data;
              } else if (typePermisResponse.data?.data) {
                dossierComplet.formation.type_permis = typePermisResponse.data.data;
              } else if (typePermisResponse.data) {
                dossierComplet.formation.type_permis = typePermisResponse.data;
              }
              console.log('✅ Type de permis chargé:', dossierComplet.formation.type_permis);
            } catch (error: any) {
              console.warn('⚠️ Impossible de charger le type de permis:', error);
            }
          }
        }

        // Convertir en ReceptionDossier
        const receptionDossier: ReceptionDossier = {
          id: dossierComplet.id || dossierId,
          reference: dossierComplet.reference || dossierComplet.id || dossierId,
          candidatNom: dossierComplet.candidat?.personne?.nom || '',
          candidatPrenom: dossierComplet.candidat?.personne?.prenom || '',
          autoEcoleNom: dossierComplet.auto_ecole?.nom_auto_ecole || '',
          dateEnvoi: dossierComplet.date_creation || dossierComplet.created_at || new Date().toISOString(),
          statut: dossierComplet.statut || 'transmis',
          dateExamen: programmeSession?.date_examen,
          details: dossierComplet
        };

        setDossier(receptionDossier);
        previousDossierIdRef.current = receptionDossier.id;
      } catch (err: any) {
        console.error('❌ Erreur lors du chargement du dossier:', err);
        setError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement du dossier');
      } finally {
        setLoading(false);
      }
    };

    loadDossier();
  }, [id]);

  // Charger les résultats depuis l'API /resultats
  useEffect(() => {
    const loadResultats = async () => {
      if (!dossier) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await axiosClient.get('/resultats', {
          params: { dossier_id: dossier.id }
        });
        
        const resultats = Array.isArray(response.data?.data) ? response.data.data : [];
        
        const creneauxMap = new Map<string, EpreuveAttempt>();
        const codeConduiteMap = new Map<string, EpreuveAttempt>();
        const tourVilleMap = new Map<string, EpreuveAttempt>();
        let notes = '';
        
        resultats.forEach((resultat: any) => {
          const dateKey = resultat.date ? new Date(resultat.date).toISOString().slice(0, 16) : '';
          const uniqueKey = `${resultat.typeExamen}_${dateKey}_${resultat.statut}`;
          
          const attempt: EpreuveAttempt = {
            result: resultat.statut as EpreuveStatut,
            date: resultat.date,
            note: resultat.commentaire || ''
          };
          
          const typeExamen = (resultat.typeExamen || '').toLowerCase().trim();
          
          if (typeExamen.includes('creneau') || typeExamen === 'creneaux') {
            if (!creneauxMap.has(uniqueKey)) {
              creneauxMap.set(uniqueKey, attempt);
            }
          } else if (typeExamen.includes('code') || typeExamen === 'codeconduite' || typeExamen === 'code_conduite') {
            if (!codeConduiteMap.has(uniqueKey)) {
              codeConduiteMap.set(uniqueKey, attempt);
            }
          } else if (typeExamen.includes('ville') || typeExamen === 'tourville' || typeExamen === 'tour_ville') {
            if (!tourVilleMap.has(uniqueKey)) {
              tourVilleMap.set(uniqueKey, attempt);
            }
          }
          
          if (resultat.commentaire && !notes) {
            notes = resultat.commentaire;
          }
        });
        
        const creneauxAttempts = Array.from(creneauxMap.values()).sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        const codeConduiteAttempts = Array.from(codeConduiteMap.values()).sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        const tourVilleAttempts = Array.from(tourVilleMap.values()).sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });
        
        setValues({
          creneauxAttempts,
          codeConduiteAttempts,
          tourVilleAttempts,
          notes
        });
        
        const loadedCreneauxStatus = computeOverall(creneauxAttempts);
        const loadedCodeStatus = computeOverall(codeConduiteAttempts);
        const loadedVilleStatus = computeOverall(tourVilleAttempts);
        
        if (loadedCreneauxStatus === 'reussi' && creneauxAttempts.length > 0) {
          const allCreneauxIndices = new Set(creneauxAttempts.map((_, idx) => idx));
          setLockedAttempts(prev => ({
            ...prev,
            creneaux: allCreneauxIndices
          }));
          previousStatusRef.current.creneaux = 'reussi';
        } else if (loadedCreneauxStatus === 'echoue' && 
                   creneauxAttempts.length === MAX_ATTEMPTS &&
                   creneauxAttempts.every(a => a.result === 'echoue' || a.result === 'absent')) {
          const allCreneauxIndices = new Set(creneauxAttempts.map((_, idx) => idx));
          setLockedAttempts(prev => ({
            ...prev,
            creneaux: allCreneauxIndices
          }));
          previousStatusRef.current.creneaux = 'echoue';
        }
        
        if (loadedCodeStatus === 'reussi' && codeConduiteAttempts.length > 0) {
          const allCodeIndices = new Set(codeConduiteAttempts.map((_, idx) => idx));
          setLockedAttempts(prev => ({
            ...prev,
            codeConduite: allCodeIndices
          }));
          previousStatusRef.current.codeConduite = 'reussi';
        } else if (loadedCodeStatus === 'echoue' && 
                   codeConduiteAttempts.length === MAX_ATTEMPTS &&
                   codeConduiteAttempts.every(a => a.result === 'echoue' || a.result === 'absent')) {
          const allCodeIndices = new Set(codeConduiteAttempts.map((_, idx) => idx));
          setLockedAttempts(prev => ({
            ...prev,
            codeConduite: allCodeIndices
          }));
          previousStatusRef.current.codeConduite = 'echoue';
        }
        
        if (loadedVilleStatus === 'reussi' && tourVilleAttempts.length > 0) {
          const allVilleIndices = new Set(tourVilleAttempts.map((_, idx) => idx));
          setLockedAttempts(prev => ({
            ...prev,
            tourVille: allVilleIndices
          }));
          previousStatusRef.current.tourVille = 'reussi';
        } else if (loadedVilleStatus === 'echoue' && 
                   tourVilleAttempts.length === MAX_ATTEMPTS &&
                   tourVilleAttempts.every(a => a.result === 'echoue' || a.result === 'absent')) {
          const allVilleIndices = new Set(tourVilleAttempts.map((_, idx) => idx));
          setLockedAttempts(prev => ({
            ...prev,
            tourVille: allVilleIndices
          }));
          previousStatusRef.current.tourVille = 'echoue';
        }
        
        previousStatusRef.current = {
          creneaux: loadedCreneauxStatus,
          codeConduite: loadedCodeStatus,
          tourVille: loadedVilleStatus
        };
      } catch (err: any) {
        console.error('❌ Erreur lors du chargement des résultats:', err);
        if (err?.response?.status !== 404) {
          setError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement des résultats');
        }
        setValues({
          creneauxAttempts: [],
          codeConduiteAttempts: [],
          tourVilleAttempts: [],
          notes: ''
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (dossier) {
      loadResultats();
    }
  }, [dossier]);

  const addAttempt = useCallback((key: keyof EpreuvesResultat) => (a: EpreuveAttempt) => {
    const keyString = String(key);
    
    if (addingAttemptRef.current.has(keyString)) {
      return;
    }
    
    addingAttemptRef.current.add(keyString);
    
    setValues(v => {
      const currentArray = (v[key] as any[] || []);
      if (currentArray.length >= MAX_ATTEMPTS) {
        addingAttemptRef.current.delete(keyString);
        return v;
      }
      const newArray = [...currentArray, a];
      addingAttemptRef.current.delete(keyString);
      return { ...v, [key]: newArray as any };
    });
  }, []);

  const setAttempt = (key: keyof EpreuvesResultat) => (index: number, a: EpreuveAttempt) => {
    setValues(v => {
      const arr = [ ...(v[key] as any[] || []) ];
      arr[index] = a;
      return { ...v, [key]: arr as any };
    });
  };

  const handleLockAttempt = useCallback((key: 'creneaux' | 'codeConduite' | 'tourVille') => (index: number) => {
    setLockedAttempts(prev => {
      const newSet = new Set(prev[key]);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return {
        ...prev,
        [key]: newSet
      };
    });
  }, []);

  const handleSave = async () => {
    if (!dossier) return;
    setSaving(true);
    setError(null);
    
    try {
      const resultatsToSave: Array<{
        dossier_id: string;
        typeExamen: string;
        statut: string;
        date: string;
        commentaire: string;
      }> = [];
      
      (values.creneauxAttempts || []).forEach((attempt) => {
        resultatsToSave.push({
          dossier_id: dossier.id,
          typeExamen: 'creneaux',
          statut: attempt.result,
          date: attempt.date,
          commentaire: attempt.note || values.notes || ''
        });
      });
      
      (values.codeConduiteAttempts || []).forEach((attempt) => {
        resultatsToSave.push({
          dossier_id: dossier.id,
          typeExamen: 'codeConduite',
          statut: attempt.result,
          date: attempt.date,
          commentaire: attempt.note || values.notes || ''
        });
      });
      
      (values.tourVilleAttempts || []).forEach((attempt) => {
        resultatsToSave.push({
          dossier_id: dossier.id,
          typeExamen: 'tourVille',
          statut: attempt.result,
          date: attempt.date,
          commentaire: attempt.note || values.notes || ''
        });
      });
      
      const savePromises = resultatsToSave.map((resultat) =>
        axiosClient.post('/resultats', resultat)
      );
      
      await Promise.all(savePromises);
      
      // Rediriger vers la liste après sauvegarde
      navigate(-1);
    } catch (err: any) {
      console.error('❌ Erreur lors de l\'enregistrement des résultats:', err);
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const overallCreneaux = computeOverall(values.creneauxAttempts, values.creneaux);
  const overallCode = computeOverall(values.codeConduiteAttempts, values.codeConduite);
  const overallVille = computeOverall(values.tourVilleAttempts, values.tourVille);
  const overallGeneral = computeGeneral(overallCreneaux, overallCode, overallVille);

  const creneauxAttemptsCount = (values.creneauxAttempts || []).length;
  const codeAttemptsCount = (values.codeConduiteAttempts || []).length;
  const tourVilleAttemptsCount = (values.tourVilleAttempts || []).length;

  const creneauxLocked = overallCreneaux === 'reussi' && 
    creneauxAttemptsCount > 0 && 
    lockedAttempts.creneaux.size === creneauxAttemptsCount;
  const codeLocked = overallCode === 'reussi' && 
    codeAttemptsCount > 0 && 
    lockedAttempts.codeConduite.size === codeAttemptsCount;
  const villeLocked = overallVille === 'reussi' && 
    tourVilleAttemptsCount > 0 && 
    lockedAttempts.tourVille.size === tourVilleAttemptsCount;

  const getStatutGlobalInfo = (statut: EpreuveStatut) => {
    switch (statut) {
      case 'reussi':
        return { label: 'Validé', color: 'success' as const };
      case 'echoue':
        return { label: 'Échoué', color: 'error' as const };
      case 'absent':
        return { label: 'Absent', color: 'warning' as const };
      case 'non_saisi':
      default:
        return { label: 'Non saisi', color: 'default' as const };
    }
  };

  const statutGlobalInfo = getStatutGlobalInfo(overallGeneral);

  const hasThreeFailedAttempts = (attempts: EpreuveAttempt[]): boolean => {
    return attempts.length === MAX_ATTEMPTS && 
           attempts.every(a => a.result === 'echoue' || a.result === 'absent');
  };

  // Détecter les changements de statut pour les confirmations
  useEffect(() => {
    if (!dossier || loading) return;
    
    const creneauxAttempts = values.creneauxAttempts || [];
    const codeAttempts = values.codeConduiteAttempts || [];
    const tourVilleAttempts = values.tourVilleAttempts || [];
    
    const creneauxAlreadyLocked = overallCreneaux === 'reussi' && 
      creneauxAttempts.length > 0 && 
      lockedAttempts.creneaux.size === creneauxAttempts.length;
    const codeAlreadyLocked = overallCode === 'reussi' && 
      codeAttempts.length > 0 && 
      lockedAttempts.codeConduite.size === codeAttempts.length;
    const villeAlreadyLocked = overallVille === 'reussi' && 
      tourVilleAttempts.length > 0 && 
      lockedAttempts.tourVille.size === tourVilleAttempts.length;
    
    if (overallCreneaux === 'reussi' && 
        previousStatusRef.current.creneaux !== 'reussi' && 
        !refusedLockRef.current.has('creneaux') &&
        !creneauxAlreadyLocked) {
      setLockConfirmation({
        open: true,
        type: 'creneaux',
        previousStatus: previousStatusRef.current.creneaux
      });
    } else if (hasThreeFailedAttempts(creneauxAttempts) && 
               overallCreneaux === 'echoue' &&
               lockedAttempts.creneaux.size !== creneauxAttempts.length &&
               !refusedFailureLockRef.current.has('creneaux')) {
      setFailureConfirmation({
        open: true,
        type: 'creneaux'
      });
    } else if (overallCode === 'reussi' && 
               previousStatusRef.current.codeConduite !== 'reussi' && 
               !refusedLockRef.current.has('codeConduite') &&
               !codeAlreadyLocked) {
      setLockConfirmation({
        open: true,
        type: 'codeConduite',
        previousStatus: previousStatusRef.current.codeConduite
      });
    } else if (hasThreeFailedAttempts(codeAttempts) && 
               overallCode === 'echoue' &&
               lockedAttempts.codeConduite.size !== codeAttempts.length &&
               !refusedFailureLockRef.current.has('codeConduite')) {
      setFailureConfirmation({
        open: true,
        type: 'codeConduite'
      });
    } else if (overallVille === 'reussi' && 
               previousStatusRef.current.tourVille !== 'reussi' && 
               !refusedLockRef.current.has('tourVille') &&
               !villeAlreadyLocked) {
      setLockConfirmation({
        open: true,
        type: 'tourVille',
        previousStatus: previousStatusRef.current.tourVille
      });
    } else if (hasThreeFailedAttempts(tourVilleAttempts) && 
               overallVille === 'echoue' &&
               lockedAttempts.tourVille.size !== tourVilleAttempts.length &&
               !refusedFailureLockRef.current.has('tourVille')) {
      setFailureConfirmation({
        open: true,
        type: 'tourVille'
      });
    }
    
    if (previousStatusRef.current.creneaux !== overallCreneaux ||
        previousStatusRef.current.codeConduite !== overallCode ||
        previousStatusRef.current.tourVille !== overallVille) {
      previousStatusRef.current = {
        creneaux: overallCreneaux,
        codeConduite: overallCode,
        tourVille: overallVille
      };
    }
  }, [overallCreneaux, overallCode, overallVille, dossier, loading, values, lockedAttempts]);

  const handleLockConfirmation = (confirmed: boolean) => {
    if (confirmed && lockConfirmation.type) {
      const attempts = lockConfirmation.type === 'creneaux' 
        ? values.creneauxAttempts || []
        : lockConfirmation.type === 'codeConduite'
        ? values.codeConduiteAttempts || []
        : values.tourVilleAttempts || [];
      
      const allIndices = new Set(attempts.map((_, idx) => idx));
      setLockedAttempts(prev => ({
        ...prev,
        [lockConfirmation.type!]: allIndices
      }));
      refusedLockRef.current.delete(lockConfirmation.type);
    } else if (lockConfirmation.type) {
      refusedLockRef.current.add(lockConfirmation.type);
    }
    
    setLockConfirmation({
      open: false,
      type: null,
      previousStatus: null
    });
  };

  const handleFailureConfirmation = (confirmed: boolean) => {
    if (confirmed && failureConfirmation.type) {
      const attempts = failureConfirmation.type === 'creneaux' 
        ? values.creneauxAttempts || []
        : failureConfirmation.type === 'codeConduite'
        ? values.codeConduiteAttempts || []
        : values.tourVilleAttempts || [];
      
      const allIndices = new Set(attempts.map((_, idx) => idx));
      setLockedAttempts(prev => ({
        ...prev,
        [failureConfirmation.type!]: allIndices
      }));
      refusedFailureLockRef.current.delete(failureConfirmation.type);
    } else if (failureConfirmation.type) {
      refusedFailureLockRef.current.add(failureConfirmation.type);
    }
    
    setFailureConfirmation({
      open: false,
      type: null
    });
  };

  if (loading && !dossier) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !dossier) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Container>
    );
  }

  if (!dossier) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Dossier non trouvé
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          Résultats d'épreuves
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Carte à gauche - Informations du candidat et de la formation */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Informations du candidat
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Nom complet
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {dossier.candidatNom} {dossier.candidatPrenom}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Référence du dossier
                  </Typography>
                  <Typography variant="body1">
                    {dossier.reference}
                  </Typography>
                </Box>

                {dossier.details?.candidat && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Numéro candidat
                      </Typography>
                      <Typography variant="body1">
                        {dossier.details.candidat.numero_candidat || 'N/A'}
                      </Typography>
                    </Box>

                    {dossier.details.candidat.personne && (
                      <>
                        <Divider />
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Email
                          </Typography>
                          <Typography variant="body1">
                            {dossier.details.candidat.personne.email || 'N/A'}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Contact
                          </Typography>
                          <Typography variant="body1">
                            {dossier.details.candidat.personne.contact || 'N/A'}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </>
                )}

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Auto-école
                  </Typography>
                  <Typography variant="body1">
                    {dossier.autoEcoleNom || 'N/A'}
                  </Typography>
                </Box>

                {dossier.details?.formation && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1 }}>
                        Formation
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Nom de la formation
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {dossier.details.formation.nom || 'N/A'}
                        </Typography>
                      </Box>

                      {(dossier.details.formation.type_permis || dossier.details.formation.type_permis_id) && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Type de permis
                          </Typography>
                          <Typography variant="body1">
                            {dossier.details.formation.type_permis?.libelle || 
                             dossier.details.formation.type_permis?.nom ||
                             dossier.details.formation.type_permis?.code ||
                             (dossier.details.formation.type_permis_id ? `ID: ${dossier.details.formation.type_permis_id}` : 'N/A')}
                          </Typography>
                        </Box>
                      )}

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Montant
                        </Typography>
                        <Typography variant="body1">
                          {dossier.details.formation.montant_formate || 
                           `${dossier.details.formation.montant || 0} FCFA`}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}

                {dossier.dateExamen && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Date d'examen
                      </Typography>
                      <Typography variant="body1">
                        {new Date(dossier.dateExamen).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Contenu au centre - Épreuves */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gap: 3 }}>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Chargement des résultats depuis l'API...
                  </Typography>
                </Box>
              )}
              {!loading && (
                <>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>Résultat global</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip
                        label={statutGlobalInfo.label}
                        color={statutGlobalInfo.color}
                        size="medium"
                        variant={overallGeneral === 'non_saisi' ? 'outlined' : 'filled'}
                      />
                      <Typography variant="body2" color="text.secondary">
                        ({overallGeneral})
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {overallGeneral === 'reussi' && '✅ Toutes les épreuves sont validées'}
                      {overallGeneral === 'echoue' && '❌ Au moins une épreuve est échouée'}
                      {overallGeneral === 'absent' && '⚠️ Au moins un candidat est absent'}
                      {overallGeneral === 'non_saisi' && '📝 En attente de saisie des résultats'}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Créneaux:</strong> {overallCreneaux} | 
                        <strong> Code:</strong> {overallCode} | 
                        <strong> Tour de ville:</strong> {overallVille}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider />
                  <EpreuveRow
                    label={`Créneaux (statut: ${overallCreneaux})`}
                    attempts={values.creneauxAttempts || []}
                    onAdd={addAttempt('creneauxAttempts')}
                    onChange={setAttempt('creneauxAttempts')}
                    onLock={handleLockAttempt('creneaux')}
                    lockedAttempts={lockedAttempts.creneaux}
                    disabled={creneauxLocked}
                  />
                  <Divider />
                  <EpreuveRow
                    label={`Code de conduite (statut: ${overallCode})`}
                    attempts={values.codeConduiteAttempts || []}
                    onAdd={addAttempt('codeConduiteAttempts')}
                    onChange={setAttempt('codeConduiteAttempts')}
                    onLock={handleLockAttempt('codeConduite')}
                    lockedAttempts={lockedAttempts.codeConduite}
                    disabled={codeLocked}
                  />
                  <Divider />
                  <EpreuveRow
                    label={`Tour de ville (statut: ${overallVille})`}
                    attempts={values.tourVilleAttempts || []}
                    onAdd={addAttempt('tourVilleAttempts')}
                    onChange={setAttempt('tourVilleAttempts')}
                    onLock={handleLockAttempt('tourVille')}
                    lockedAttempts={lockedAttempts.tourVille}
                    disabled={villeLocked}
                  />
                  <Divider />
                  <TextField
                    label="Notes générales"
                    value={values.notes || ''}
                    onChange={(e) => setValues(v => ({ ...v, notes: e.target.value }))}
                    multiline
                    minRows={3}
                  />
                  <Stack direction="row" justifyContent="flex-end" spacing={1}>
                    <Button onClick={() => navigate(-1)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog de confirmation pour le verrouillage automatique (réussite) */}
      <Dialog
        open={lockConfirmation.open}
        onClose={() => handleLockConfirmation(false)}
        aria-labelledby="lock-confirmation-dialog-title"
        aria-describedby="lock-confirmation-dialog-description"
      >
        <DialogTitle id="lock-confirmation-dialog-title">
          Confirmer le verrouillage de l'épreuve
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="lock-confirmation-dialog-description">
            L'épreuve "{lockConfirmation.type === 'creneaux' ? 'Créneaux' : lockConfirmation.type === 'codeConduite' ? 'Code de conduite' : 'Tour de ville'}" a été réussie.
            <br />
            <br />
            Voulez-vous verrouiller cette épreuve pour empêcher toute modification ultérieure ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleLockConfirmation(false)} color="inherit">
            Annuler
          </Button>
          <Button onClick={() => handleLockConfirmation(true)} variant="contained" color="primary" autoFocus>
            Verrouiller
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de confirmation pour l'échec définitif (3 tentatives échouées) */}
      <Dialog
        open={failureConfirmation.open}
        onClose={() => handleFailureConfirmation(false)}
        aria-labelledby="failure-confirmation-dialog-title"
        aria-describedby="failure-confirmation-dialog-description"
      >
        <DialogTitle id="failure-confirmation-dialog-title">
          Confirmer l'échec définitif de l'épreuve
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="failure-confirmation-dialog-description">
            L'épreuve "{failureConfirmation.type === 'creneaux' ? 'Créneaux' : failureConfirmation.type === 'codeConduite' ? 'Code de conduite' : 'Tour de ville'}" a échoué 3 fois.
            <br />
            <br />
            Voulez-vous verrouiller cette épreuve pour confirmer qu'elle est définitivement échouée ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleFailureConfirmation(false)} color="inherit">
            Annuler
          </Button>
          <Button onClick={() => handleFailureConfirmation(true)} variant="contained" color="error" autoFocus>
            Confirmer l'échec
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EpreuvePage;
