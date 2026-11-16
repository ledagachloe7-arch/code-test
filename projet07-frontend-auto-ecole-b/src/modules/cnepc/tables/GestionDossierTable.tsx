import React, { useState, useEffect, useRef } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableHead,
  TablePagination,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Grid,
  Stack,
  Collapse,
  Skeleton,
} from '@mui/material';
import {
  Search,
  MoreVert,
  Edit,
  Delete,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
  LockOpen,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { AutoEcole, Dossier, Formation, Referentiel } from '../types/auto-ecole';
import { TypeDemande } from '../types/type-demande';
import { autoEcoleService, gestionDossierService, referentielService, typeDemandeService } from '../services';
import { GestionDossierFilters, GestionDossierListResponse } from '../types/gestion-dossier';
import { DossierForm } from '../forms';
import { dataCategorieIncludesPermisB, textImpliesPermisCDE } from '../forms/dossierCreationReadiness';
import {
  checkIsDuplicata,
  checkIsFicheEnregistre,
  checkIsNouveauPermis,
  extractCategorieFromNumeroPermis,
} from '../forms/utils';
import { getTypeDemandeDisplayName } from '../pages/UsagerDossierPage/utils';
import { statutService } from '../../statut/services/statut.service';
import type { Statut } from '../../statut/types/statut';
import { ROUTES } from '../../../shared/constants';

interface GestionDossierTableProps {
  refreshTrigger?: number;
}

const GestionDossierTable: React.FC<GestionDossierTableProps> = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [allDossiers, setAllDossiers] = useState<Dossier[]>([]); // Tous les dossiers chargés (pour filtrage frontend)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [typeDemandeFilter, setTypeDemandeFilter] = useState<string>('');
  const [typePermisFilter, setTypePermisFilter] = useState<string>('');
  const [typeDemandes, setTypeDemandes] = useState<TypeDemande[]>([]);
  const [typePermis, setTypePermis] = useState<Referentiel[]>([]);
  const [statuts, setStatuts] = useState<Statut[]>([]);

  // États locaux pour les filtres (comme dans FiltresPanel)
  const [localFilters, setLocalFilters] = useState({
    search: '',
    statut: '',
    type_demande_id: '',
    type_permis_id: '',
  });

  // États pour les modales
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState<Dossier | null>(null);

  // Menu contextuel
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [openingDossierId, setOpeningDossierId] = useState<string | null>(null);
  
  // État pour les lignes étendues
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());


  // Cache pour les référentiels chargés
  const [referentielsCache, setReferentielsCache] = useState<Map<string, Referentiel>>(new Map());
  
  // Cache pour les formations chargées
  const [formationsCache, setFormationsCache] = useState<Map<string, Formation>>(new Map());
  
  // Cache pour les types de demande chargés
  const [typeDemandeCache, setTypeDemandeCache] = useState<Map<string, TypeDemande>>(new Map());

  // Cache pour le détail d'un dossier (ex. data_categorie non renvoyé par la liste)
  const [dossierDetailCache, setDossierDetailCache] = useState<Map<string, Dossier>>(new Map());

  /** Auto-écoles résolues par id (comme le formulaire dossier qui utilise auto_ecole_id) — la liste API n'embarque souvent pas formation.auto_ecole. */
  const [autoEcolesByIdCache, setAutoEcolesByIdCache] = useState<Map<string, AutoEcole>>(new Map());
  const autoEcolesByIdCacheRef = useRef(autoEcolesByIdCache);
  useEffect(() => {
    autoEcolesByIdCacheRef.current = autoEcolesByIdCache;
  }, [autoEcolesByIdCache]);

  // Charger un référentiel par son ID
  const loadReferentiel = async (id: string): Promise<Referentiel | null> => {
    // Vérifier le cache d'abord
    if (referentielsCache.has(id)) {
      return referentielsCache.get(id)!;
    }

    try {
      const referentiel = await referentielService.getReferentielById(id);
      // Mettre en cache
      setReferentielsCache((prev) => new Map(prev).set(id, referentiel));
      return referentiel;
    } catch (err: any) {
      console.error(`Erreur lors du chargement du référentiel ${id}:`, err);
      return null;
    }
  };

  // Charger un type de demande par son ID
  const loadTypeDemande = async (id: string): Promise<TypeDemande | null> => {
    // Vérifier le cache d'abord
    if (typeDemandeCache.has(id)) {
      return typeDemandeCache.get(id)!;
    }

    try {
      const typeDemande = await typeDemandeService.getTypeDemandeById(id);
      // Mettre en cache
      setTypeDemandeCache((prev) => new Map(prev).set(id, typeDemande));
      return typeDemande;
    } catch (err: any) {
      console.error(`Erreur lors du chargement du type de demande ${id}:`, err);
      return null;
    }
  };

  // Charger les formations manquantes pour les dossiers (formation_id sans objet formation)
  const loadMissingFormations = async (dossiers: Dossier[]): Promise<Dossier[]> => {
    const formationIds = new Set<string>();
    dossiers.forEach((dossier) => {
      const fid = dossier.formation_id ?? (dossier.formation?.id);
      if (fid && !formationsCache.has(fid) && !dossier.formation) {
        formationIds.add(fid);
      }
    });

    const loadedFormations = new Map<string, Formation>();
    if (formationIds.size > 0) {
      const promises = Array.from(formationIds).map(async (id) => {
        try {
          const formation = await autoEcoleService.getFormationById(id);
          return { id, formation };
        } catch (err: any) {
          console.error(`Erreur chargement formation ${id}:`, err);
          return { id, formation: null };
        }
      });
      const results = await Promise.all(promises);
      const newCache = new Map(formationsCache);
      results.forEach(({ id, formation }) => {
        if (formation) {
          loadedFormations.set(id, formation);
          newCache.set(id, formation);
        }
      });
      setFormationsCache(newCache);
    }

    return dossiers.map((dossier) => {
      const fid = dossier.formation_id ?? dossier.formation?.id;
      if (!fid) return dossier;
      const formation = dossier.formation ?? loadedFormations.get(fid) ?? formationsCache.get(fid);
      if (formation) return { ...dossier, formation };
      return dossier;
    });
  };

  // Charger les référentiels manquants pour les dossiers (referentiel + type_permis depuis formation)
  const loadMissingReferentiels = async (dossiers: Dossier[]): Promise<Dossier[]> => {
    const referentielIds = new Set<string>();
    dossiers.forEach((dossier) => {
      const referencielId = (dossier as any).referenciel_id;
      if (referencielId && !referentielsCache.has(referencielId)) {
        referentielIds.add(referencielId);
      }
      // Type de permis peut venir de la formation
      const formation = dossier.formation;
      const typePermisId = formation?.type_permis_id ?? (formation?.type_permis as any)?.id ?? (formation?.typePermis as any)?.id;
      if (typePermisId && !referentielsCache.has(typePermisId)) {
        referentielIds.add(typePermisId);
      }
    });

    const newCache = new Map(referentielsCache);
    if (referentielIds.size > 0) {
      const promises = Array.from(referentielIds).map((id) => loadReferentiel(id));
      const loadedReferentiels = await Promise.all(promises);
      loadedReferentiels.forEach((referentiel) => {
        if (referentiel) newCache.set(referentiel.id, referentiel);
      });
      setReferentielsCache(newCache);
    }

    return dossiers.map((dossier) => {
      const referencielId = (dossier as any).referenciel_id;
      const formation = dossier.formation;
      const typePermisId = formation?.type_permis_id ?? (formation?.type_permis as any)?.id ?? (formation?.typePermis as any)?.id;
      const refId = referencielId ?? typePermisId;
      if (refId && newCache.has(refId) && !dossier.referentiel) {
        return { ...dossier, referentiel: newCache.get(refId)! };
      }
      return dossier;
    });
  };

  // Charger les types de demande manquants pour les dossiers
  const loadMissingTypeDemandes = async (dossiers: Dossier[]): Promise<Dossier[]> => {
    const typeDemandeIds = new Set<string>();
    dossiers.forEach((dossier) => {
      if (dossier.type_demande_id && !typeDemandeCache.has(dossier.type_demande_id)) {
        typeDemandeIds.add(dossier.type_demande_id);
      }
    });

    const newCache = new Map(typeDemandeCache);
    if (typeDemandeIds.size > 0) {
      const promises = Array.from(typeDemandeIds).map((id) => loadTypeDemande(id));
      const loadedTypeDemandes = await Promise.all(promises);
      loadedTypeDemandes.forEach((typeDemande) => {
        if (typeDemande) newCache.set(typeDemande.id, typeDemande);
      });
      setTypeDemandeCache(newCache);
    }

    return dossiers.map((dossier) => {
      if (dossier.type_demande_id && newCache.has(dossier.type_demande_id) && !dossier.type_demande) {
        return { ...dossier, type_demande: newCache.get(dossier.type_demande_id)! };
      }
      return dossier;
    });
  };

  /** Charge les auto-écoles pour les dossiers qui ont auto_ecole_id sans libellé sur la formation (liste allégée). */
  const loadMissingAutoEcoles = async (dossiersList: Dossier[]) => {
    const prev = autoEcolesByIdCacheRef.current;
    const ids = new Set<string>();
    for (const d of dossiersList) {
      const formation = d.formation ?? (d.formation_id ? formationsCache.get(d.formation_id) : undefined);
      let resolved = false;
      if (formation?.auto_ecole) {
        const n =
          typeof formation.auto_ecole === 'string'
            ? formation.auto_ecole
            : (formation.auto_ecole as { nom_auto_ecole?: string })?.nom_auto_ecole;
        resolved = Boolean(n && String(n).trim());
      }
      const aeid = d.auto_ecole_id?.trim();
      if (aeid && !resolved && !prev.has(aeid)) ids.add(aeid);
    }
    if (ids.size === 0) return;
    const pairs: [string, AutoEcole][] = [];
    await Promise.all(
      Array.from(ids).map(async (id) => {
        try {
          const ae = await autoEcoleService.getAutoEcoleById(id);
          pairs.push([id, ae]);
        } catch (err: unknown) {
          console.error(`Erreur chargement auto-école ${id}:`, err);
        }
      }),
    );
    if (pairs.length === 0) return;
    setAutoEcolesByIdCache((p) => {
      const n = new Map(p);
      pairs.forEach(([id, ae]) => n.set(id, ae));
      return n;
    });
  };

  // Charger tous les types de demande
  const loadTypeDemandes = async () => {
    try {
      const response = await typeDemandeService.getTypeDemandes(1, 100);
      setTypeDemandes(response.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des types de demande:', err);
    }
  };

  // Charger tous les types de permis
  const loadTypePermis = async () => {
    try {
      const referentiels = await referentielService.getReferentielsByType('type_permis');
      setTypePermis(referentiels);
    } catch (err: any) {
      console.error('Erreur lors du chargement des types de permis:', err);
    }
  };

  // Charger les statuts de dossier (workflow) pour le filtre
  const loadStatuts = async () => {
    try {
      const response = await statutService.getAll();
      const list = Array.isArray(response) ? response : (response?.data ?? []);
      setStatuts(list);
    } catch (err: any) {
      console.error('Erreur lors du chargement des statuts:', err);
    }
  };

  // Charger les dossiers
  const loadDossiers = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: GestionDossierFilters = {
        search: searchTerm || undefined,
        statut: statutFilter ? (statutFilter as any) : undefined,
        // type_demande_id retiré - filtrage frontend uniquement
      };

      // Toujours charger tous les dossiers disponibles (jusqu'à 1000) et laisser
      // la pagination se faire entièrement côté client pour éviter le double-offset.
      const response: GestionDossierListResponse = await gestionDossierService.getDossiers(
        1,
        1000,
        filters
      );

      // Normaliser la réponse API : plusieurs formats possibles
      // { data: [...], meta: {...} }  ou  { success, data: { data: [...], meta: {...} } }
      const rawResponse: any = response;
      let dossiersArray: Dossier[] = [];
      if (Array.isArray(rawResponse)) {
        dossiersArray = rawResponse;
      } else if (Array.isArray(rawResponse?.data)) {
        dossiersArray = rawResponse.data;
      } else if (Array.isArray(rawResponse?.data?.data)) {
        dossiersArray = rawResponse.data.data;
      } else if (Array.isArray(rawResponse?.data?.data?.data)) {
        dossiersArray = rawResponse.data.data.data;
      }

      console.log('[GestionDossierTable] Dossiers reçus:', dossiersArray.length);

      // Enrichir avec formation, référentiel (type permis), type de demande
      let enrichedData = dossiersArray;
      enrichedData = await loadMissingFormations(enrichedData);
      enrichedData = await loadMissingReferentiels(enrichedData);
      enrichedData = await loadMissingTypeDemandes(enrichedData);
      await loadMissingAutoEcoles(enrichedData);

      setAllDossiers(enrichedData);
    } catch (err: any) {
      console.error('Erreur lors du chargement des dossiers:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les dossiers côté client et appliquer la pagination
  useEffect(() => {
    let filteredDossiers = [...allDossiers];

    // Filtrer par recherche textuelle (nom, prénom, numéro candidat, référence)
    if (searchTerm && searchTerm.trim() !== '') {
      const q = searchTerm.trim().toLowerCase();
      filteredDossiers = filteredDossiers.filter((dossier) => {
        const nom = (dossier.candidat?.personne?.nom || '').toLowerCase();
        const prenom = (dossier.candidat?.personne?.prenom || '').toLowerCase();
        const numero = (dossier.candidat?.numero_candidat || '').toLowerCase();
        const ref = ((dossier as any).reference || (dossier as any).numero_dossier || '').toLowerCase();
        return nom.includes(q) || prenom.includes(q) || numero.includes(q) || ref.includes(q);
      });
    }

    // Filtrer par type de demande (frontend uniquement)
    if (typeDemandeFilter && typeDemandeFilter !== '') {
      filteredDossiers = filteredDossiers.filter((dossier) => {
        if (dossier.type_demande_id === typeDemandeFilter) return true;
        if (dossier.type_demande?.id === typeDemandeFilter) return true;
        const cachedTypeDemande = typeDemandeCache.get(typeDemandeFilter);
        if (cachedTypeDemande && dossier.type_demande_id === cachedTypeDemande.id) return true;
        return false;
      });
    }

    // Filtrer par type de permis (frontend uniquement)
    if (typePermisFilter && typePermisFilter !== '') {
      filteredDossiers = filteredDossiers.filter((dossier) => {
        const referencielId = (dossier as any).referenciel_id;
        if (referencielId === typePermisFilter) return true;
        if (dossier.referentiel?.id === typePermisFilter) return true;
        const cachedReferentiel = referentielsCache.get(typePermisFilter);
        if (cachedReferentiel && referencielId === cachedReferentiel.id) return true;
        return false;
      });
    }

    // Appliquer la pagination côté client
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    setDossiers(filteredDossiers.slice(startIndex, endIndex));
    setTotal(filteredDossiers.length);
  }, [allDossiers, searchTerm, typeDemandeFilter, typePermisFilter, typeDemandeCache, referentielsCache, page, rowsPerPage]);

  // Effet pour charger les types de demande, types de permis et statuts au montage
  useEffect(() => {
    loadTypeDemandes();
    loadTypePermis();
    loadStatuts();
  }, []);

  // Synchroniser les filtres locaux avec les filtres réels au montage
  useEffect(() => {
    setLocalFilters({
      search: searchTerm,
      statut: statutFilter,
      type_demande_id: typeDemandeFilter,
      type_permis_id: typePermisFilter,
    });
  }, []);

  // Effet pour charger les données (page/rowsPerPage exclus : pagination 100 % client-side)
  useEffect(() => {
    loadDossiers();
  }, [searchTerm, statutFilter, typeDemandeFilter, typePermisFilter, refreshTrigger]);

  // Gestion de la pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  // Gestion des filtres locaux (comme dans FiltresPanel)
  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters({ ...localFilters, [key]: value });
  };

  const handleApplyFilters = () => {
    setPage(0); // Revenir à la première page avant d'appliquer les filtres
    setSearchTerm(localFilters.search);
    setStatutFilter(localFilters.statut);
    setTypeDemandeFilter(localFilters.type_demande_id);
    setTypePermisFilter(localFilters.type_permis_id);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      statut: '',
      type_demande_id: '',
      type_permis_id: '',
    };
    setLocalFilters(clearedFilters);
    setSearchTerm('');
    setStatutFilter('');
    setTypeDemandeFilter('');
    setTypePermisFilter('');
    setPage(0);
  };

  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(
      (value) => value !== undefined && value !== null && value !== ''
    ).length;
  };

  // Gestion de l'extension des lignes : au déploiement, charger le détail du dossier si data_categorie absent (liste API peut ne pas le renvoyer)
  const handleToggleExpand = (dossierId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dossierId)) {
        newSet.delete(dossierId);
      } else {
        newSet.add(dossierId);
        const dossier = allDossiers.find((d) => d.id === dossierId) ?? dossiers.find((d) => d.id === dossierId);
        const d = dossier as any;
        const hasDataCategorie = (d?.data_categorie ?? d?.dataCategorie) && Array.isArray(d?.data_categorie ?? d?.dataCategorie);
        if (dossier && !hasDataCategorie && !dossierDetailCache.has(dossierId)) {
          gestionDossierService.getDossierById(dossierId).then((fullDossier) => {
            setDossierDetailCache((cache) => new Map(cache).set(dossierId, fullDossier));
          }).catch((err) => console.error('Erreur chargement détail dossier:', err));
        }
      }
      return newSet;
    });
  };

  // Gestion du menu contextuel
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, dossierId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(dossierId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  // Actions du menu
  const handleEdit = () => {
    const dossier = dossiers.find((d) => d.id === selectedRowId);
    if (!dossier) {
      handleMenuClose();
      return;
    }
    const dossierId = dossier.id;

    // Pour garantir le préremplissage complet (tous les champs constitutifs),
    // on charge toujours le dossier complet, sauf s'il est déjà en cache.
    const cached = dossierDetailCache.get(dossierId);
    if (cached) {
      setSelectedDossier(cached);
      setFormOpen(true);
      handleMenuClose();
      return;
    }

    setError(null);
    gestionDossierService
      .getDossierById(dossierId)
      .then((fullDossier) => {
        setDossierDetailCache((cache) => new Map(cache).set(dossierId, fullDossier));
        setSelectedDossier(fullDossier);
        setFormOpen(true);
      })
      .catch((err: any) => {
        console.error('Erreur chargement détail dossier:', err);
        setError(err?.response?.data?.message || err.message || 'Impossible de charger le dossier.');
      })
      .finally(() => {
        handleMenuClose();
      });
  };

  const handleDelete = () => {
    const dossier = dossiers.find((d) => d.id === selectedRowId);
    if (dossier) {
      setDossierToDelete(dossier);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleOpenForTreatment = async () => {
    const dossier = dossiers.find((d) => d.id === selectedRowId);
    if (!dossier) {
      handleMenuClose();
      return;
    }
    setOpeningDossierId(dossier.id);
    setError(null);
    try {
      await gestionDossierService.openDossier(dossier.id);
      handleMenuClose();
      navigate(`/cnepc/dossiers/${dossier.id}`, { state: { dossier } });
    } catch (err: any) {
      handleMenuClose();
      setError(err.message || 'Impossible d\'ouvrir le dossier.');
    } finally {
      setOpeningDossierId(null);
    }
  };

  const handleGoToReceptionTreatment = async () => {
    const dossier = dossiers.find((d) => d.id === selectedRowId);
    if (!dossier) {
      handleMenuClose();
      return;
    }
    setOpeningDossierId(dossier.id);
    setError(null);
    try {
      await gestionDossierService.openDossier(dossier.id);
      handleMenuClose();
      navigate(
        generatePath(ROUTES.RECEPTION_TRAITEMENT_DOSSIER_CIRCUIT, { id: dossier.id }),
        { state: { openToNextStep: true } }
      );
    } catch (err: any) {
      handleMenuClose();
      setError(err.message || 'Impossible d\'ouvrir le traitement réception.');
    } finally {
      setOpeningDossierId(null);
    }
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    if (!dossierToDelete) return;

    try {
      await gestionDossierService.deleteDossier(dossierToDelete.id);
      setDeleteDialogOpen(false);
      setDossierToDelete(null);
      loadDossiers();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // Gestion du formulaire
  const handleFormSuccess = (updatedDossier: Dossier) => {
    // Mettre à jour le cache du dossier pour éviter d'afficher des valeurs périmées
    setDossierDetailCache((cache) => new Map(cache).set(updatedDossier.id, updatedDossier));
    setFormOpen(false);
    setSelectedDossier(undefined);
    loadDossiers();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setSelectedDossier(undefined);
  };

  // Statut réel du dossier (comme sur la page détails réception)
  const getRealStatut = (dossier: Dossier): string => {
    return (dossier.statut || 'en_attente').trim();
  };

  /** Indique si une date "jusqu'au" (valable jusqu'au) est expirée (avant aujourd'hui). */
  const isDataCategorieItemExpired = (jusquAu: string | undefined): boolean => {
    if (!jusquAu || !jusquAu.trim()) return false;
    const date = new Date(jusquAu);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Fonction pour obtenir la couleur du statut (réel ou libellé d'étape)
  const getStatutColor = (statut: string) => {
    const s = (statut || '').toLowerCase();
    if (s.includes('envoy') || s.includes('cneddt') || s.includes('impression') || s.includes('biométrie') || s.includes('biometrie')) return 'success';
    switch (statut) {
      case 'valide':
      case 'Validé':
        return 'success';
      case 'en_cours':
      case 'En cours':
        return 'info';
      case 'rejete':
      case 'Rejeté':
        return 'error';
      case 'transmis':
      case 'Transmis':
      case 'Cnepc':
      case 'CNEPC':
        return 'secondary';
      default:
        return 'warning';
    }
  };

  // Fonction pour formater le libellé du statut (réel du dossier, comme en réception)
  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      en_cours: 'En cours',
      valide: 'Validé',
      rejete: 'Rejeté',
      transmis: 'Transmis',
      Cnepc: 'CNEPC',
    };
    // Statuts "envoyé" courants du backend → libellé utilisateur
    if (/dossier\s*envoy|envoy.*cneddt|impression/i.test(statut)) return 'Envoyé à la biométrie';
    return labels[statut] || statut;
  };


  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  /** Parse data_categorie d'un dossier (tableau de strings JSON ou d'objets). Supporte data_categorie et dataCategorie. */
  const getDataCategorieItems = (dossier: Dossier): Array<{ classe: string; ville: string; codification_code: string; valable_du: string; jusqu_au: string }> => {
    const d = dossier as any;
    const raw = d.data_categorie ?? d.dataCategorie;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
    return raw.map((item: unknown) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        return {
          classe: String(o.classe ?? ''),
          ville: String(o.ville ?? ''),
          codification_code: String(o.codification_code ?? ''),
          valable_du: String(o.valable_du ?? ''),
          jusqu_au: String(o.jusqu_au ?? ''),
        };
      }
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item) as Record<string, unknown>;
          return {
            classe: String(parsed.classe ?? ''),
            ville: String(parsed.ville ?? ''),
            codification_code: String(parsed.codification_code ?? ''),
            valable_du: String(parsed.valable_du ?? ''),
            jusqu_au: String(parsed.jusqu_au ?? ''),
          };
        } catch {
          return { classe: '', ville: '', codification_code: '', valable_du: '', jusqu_au: item };
        }
      }
      return { classe: '', ville: '', codification_code: '', valable_du: '', jusqu_au: '' };
    });
  };

  // Fonction pour obtenir le libellé du type de permis
  // Priorité : 1. referentiel (referenciel_id) 2. formation.type_permis 3. formation.type_permis_id + cache/liste
  const getTypePermisLabel = (dossier: Dossier): string => {
    // 1. Référentiel directement sur le dossier
    const referencielId = (dossier as any).referenciel_id;
    if (dossier.referentiel) {
      if (dossier.referentiel.libelle) return dossier.referentiel.libelle;
      if (dossier.referentiel.code) return dossier.referentiel.code;
    }
    if (referencielId) {
      const cached = referentielsCache.get(referencielId);
      if (cached?.libelle) return cached.libelle;
      if (cached?.code) return cached.code;
    }

    // 2. Depuis la formation (objet type_permis / typePermis)
    const formation = dossier.formation ?? (dossier.formation_id ? formationsCache.get(dossier.formation_id) : undefined);
    if (formation) {
      const tp = formation.type_permis ?? formation.typePermis;
      if (tp) {
        if (typeof tp === 'string') return tp;
        if ('libelle' in tp && tp.libelle) return tp.libelle;
        if ('code' in tp && tp.code) return tp.code;
        if ('nom' in tp && tp.nom) return tp.nom;
      }
      // 3. formation.type_permis_id : liste typePermis ou cache référentiels
      const typePermisId = formation.type_permis_id ?? (formation as any).type_permis?.id ?? (formation as any).typePermis?.id;
      if (typePermisId) {
        const fromList = typePermis.find((r) => r.id === typePermisId);
        if (fromList?.libelle) return fromList.libelle;
        if (fromList?.code) return fromList.code;
        const fromCache = referentielsCache.get(typePermisId);
        if (fromCache?.libelle) return fromCache.libelle;
        if (fromCache?.code) return fromCache.code;
      }
    }

    return 'N/A';
  };

  const getTypeDemandeNameForDossier = (dossier: Dossier): string =>
    (dossier.type_demande?.name ?? '').trim() ||
    (dossier.type_demande_id ? (typeDemandeCache.get(dossier.type_demande_id)?.name ?? '').trim() : '');

  /** Demande visant une catégorie C, D, E ou F (référentiel, libellé type permis ou segment catégorie du n° de permis). */
  const dossierImpliesCdefCategory = (dossier: Dossier): boolean => {
    const ref = dossier.referentiel;
    if (ref && textImpliesPermisCDE(`${ref.libelle ?? ''} ${ref.code ?? ''}`)) return true;
    const refId = (dossier as Dossier & { referenciel_id?: string }).referenciel_id;
    if (refId) {
      const cached = referentielsCache.get(refId);
      if (cached && textImpliesPermisCDE(`${cached.libelle ?? ''} ${cached.code ?? ''}`)) return true;
    }
    const tpLabel = getTypePermisLabel(dossier);
    if (tpLabel.trim() && tpLabel !== 'N/A' && textImpliesPermisCDE(tpLabel)) return true;
    const num = String((dossier as Dossier & { numero_permis?: string }).numero_permis ?? '').trim();
    if (num) {
      const cat = extractCategorieFromNumeroPermis(num);
      if (cat && textImpliesPermisCDE(cat)) return true;
    }
    return false;
  };

  // Fonction pour obtenir le nom de l'auto-école : formation (relation) puis auto_ecole_id + cache API (comme DossierForm)
  const getAutoEcoleName = (dossier: Dossier): string => {
    const formation = dossier.formation ?? (dossier.formation_id ? formationsCache.get(dossier.formation_id) : undefined);
    if (formation?.auto_ecole) {
      if (typeof formation.auto_ecole === 'string') return formation.auto_ecole;
      if ((formation.auto_ecole as { nom_auto_ecole?: string }).nom_auto_ecole) {
        return (formation.auto_ecole as { nom_auto_ecole: string }).nom_auto_ecole;
      }
    }
    const dAny = dossier as Dossier & { auto_ecole?: AutoEcole | string };
    if (dAny.auto_ecole) {
      if (typeof dAny.auto_ecole === 'string') return dAny.auto_ecole;
      if (dAny.auto_ecole.nom_auto_ecole) return dAny.auto_ecole.nom_auto_ecole;
    }
    const aeid = dossier.auto_ecole_id?.trim();
    if (aeid) {
      const ae = autoEcolesByIdCache.get(aeid);
      if (ae?.nom_auto_ecole) return ae.nom_auto_ecole;
    }
    return 'N/A';
  };

  /** Libellés d’alerte si l’affichage actuel n’a ni auto-école ni catégorie de permis (à compléter dans le dossier). */
  const getDossierCompletenessIssues = (dossier: Dossier): string[] => {
    const issues: string[] = [];
    const ae = getAutoEcoleName(dossier);
    if (!ae.trim() || ae === 'N/A') {
      issues.push(
        'Auto-école manquante : associez une formation liée à une auto-école ou mettez à jour le dossier.',
      );
    }
    const cat = getTypePermisLabel(dossier);
    if (!cat.trim() || cat === 'N/A') {
      issues.push(
        'Catégorie de permis manquante : renseignez le référentiel / le type de permis ou la formation du dossier.',
      );
    }
    const typeDemandeName = getTypeDemandeNameForDossier(dossier);
    if (
      !checkIsNouveauPermis(typeDemandeName) &&
      (checkIsFicheEnregistre(typeDemandeName) || checkIsDuplicata(typeDemandeName)) &&
      dossierImpliesCdefCategory(dossier)
    ) {
      const dForCat = dossierDetailCache.get(dossier.id) ?? dossier;
      const origine = String(
        (dForCat as Dossier & { numero_origine_permis?: string }).numero_origine_permis ??
          (dossier as Dossier & { numero_origine_permis?: string }).numero_origine_permis ??
          '',
      ).trim();
      const rows = getDataCategorieItems(dForCat);
      if (!origine && !dataCategorieIncludesPermisB(rows as unknown[])) {
        issues.push(
          'Permis B manquant : pour une demande en catégorie C, D, E ou F (fiche d’enregistrement ou duplicata), ajoutez la ligne permis B dans les données catégorie ou renseignez le numéro de permis d’origine (permis B).',
        );
      }
    }
    if (checkIsFicheEnregistre(typeDemandeName)) {
      const dForOrig = dossierDetailCache.get(dossier.id) ?? dossier;
      const origineFiche = String(
        (dForOrig as Dossier & { numero_origine_permis?: string }).numero_origine_permis ??
          (dossier as Dossier & { numero_origine_permis?: string }).numero_origine_permis ??
          '',
      ).trim();
      if (!origineFiche) {
        issues.push(
          'Numéro de permis d’origine manquant : ce champ est obligatoire et à compléter pour une fiche d’enregistrement.',
        );
      }
    }
    return issues;
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'transparent' }} elevation={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Gestion des Dossiers</Typography>
        </Box>

        {/* Panel de filtres dans le style de FiltresPanel */}
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterList sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Filtres
                </Typography>
                {getActiveFiltersCount() > 0 && (
                  <Chip
                    label={getActiveFiltersCount()}
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  disabled={getActiveFiltersCount() === 0}
                >
                  Effacer
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleApplyFilters}
                >
                  Appliquer
                </Button>
              </Stack>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rechercher"
                  value={localFilters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Numéro candidat, nom, prénom..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={localFilters.statut || ''}
                    onChange={(e) => handleFilterChange('statut', e.target.value)}
                    label="Statut"
                  >
                    <MenuItem value="">Tous les statuts</MenuItem>
                    {statuts
                      .sort((a, b) => (a.libelle || '').localeCompare(b.libelle || ''))
                      .map((s) => (
                        <MenuItem key={s.id} value={s.libelle}>
                          {getStatutLabel(s.libelle)}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type de demandes</InputLabel>
                  <Select
                    value={localFilters.type_demande_id || ''}
                    onChange={(e) => handleFilterChange('type_demande_id', e.target.value)}
                    label="Type de demande"
                  >
                    <MenuItem value="">Tous les types</MenuItem>
                    {typeDemandes
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((typeDemande) => (
                        <MenuItem key={typeDemande.id} value={typeDemande.id}>
                          {getTypeDemandeDisplayName(typeDemande.name)}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type de permis</InputLabel>
                  <Select
                    value={localFilters.type_permis_id || ''}
                    onChange={(e) => handleFilterChange('type_permis_id', e.target.value)}
                    label="Type de permis"
                  >
                    <MenuItem value="">Tous les types</MenuItem>
                    {typePermis
                      .sort((a, b) => {
                        const libelleA = a.libelle || a.code || '';
                        const libelleB = b.libelle || b.code || '';
                        return libelleA.localeCompare(libelleB);
                      })
                      .map((referentiel) => (
                        <MenuItem key={referentiel.id} value={referentiel.id}>
                          {referentiel.libelle || referentiel.code || referentiel.id}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table sx={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
             
            <TableBody>
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton variant="circular" width={24} height={24} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={80} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={150} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={100} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={120} height={20} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={100} height={20} />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton variant="circular" width={32} height={32} />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : dossiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucun dossier trouvé
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                dossiers.map((dossier) => {
                  const isExpanded = expandedRows.has(dossier.id);
                  const dossierForDetail = dossierDetailCache.get(dossier.id) ?? dossier;
                  const completenessIssues = getDossierCompletenessIssues(dossier);
                  return (
                    <React.Fragment key={dossier.id}>
                      <TableRow 
                        hover
                        sx={{
                          boxShadow: 1,
                          backgroundColor: completenessIssues.length
                            ? (theme) => alpha(theme.palette.warning.main, 0.06)
                            : 'white',
                          borderLeft: completenessIssues.length
                            ? (theme) => `4px solid ${theme.palette.warning.main}`
                            : 'none',
                          transition: 'background-color 0.2s ease',
                          border: 'none',
                          '& td': {
                            border: 'none',
                            borderBottom: 'none',
                          },
                          '&:hover': {
                            boxShadow: 3,
                            backgroundColor: completenessIssues.length
                              ? (theme) => alpha(theme.palette.warning.main, 0.1)
                              : 'white',
                            cursor: 'pointer',
                          },
                        }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleExpand(dossier.id)}
                            sx={{ p: 0.5 }}
                          >
                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{dossier.candidat?.numero_candidat || 'N/A'}</TableCell>
                        <TableCell>
                          {dossier.candidat?.personne
                            ? `${dossier.candidat.personne.prenom} ${dossier.candidat.personne.nom}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{getTypePermisLabel(dossier)}</TableCell>
                        <TableCell>
                          {getTypeDemandeDisplayName(
                            (() => {
                              // Priorité 1: type_demande directement dans le dossier
                              if (dossier.type_demande?.name) {
                                return dossier.type_demande.name;
                              }
                              // Priorité 2: cache des types de demande
                              if (dossier.type_demande_id) {
                                const cachedTypeDemande = typeDemandeCache.get(dossier.type_demande_id);
                                if (cachedTypeDemande?.name) {
                                  return cachedTypeDemande.name;
                                }
                              }
                              // Fallback: ID ou N/A
                              return dossier.type_demande_id || 'N/A';
                            })()
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip
                              label={getStatutLabel(getRealStatut(dossier))}
                              color={getStatutColor(getRealStatut(dossier)) as any}
                              size="small"
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>{formatDate(dossier.date_creation || dossier.created_at)}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, dossier.id)}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {completenessIssues.length > 0 && (
                        <TableRow sx={{ '& td': { border: 'none', py: 0 } }}>
                          <TableCell colSpan={8} sx={{ px: 2, pb: 1, pt: 0, border: 'none' }}>
                            <Alert severity="warning" variant="outlined" sx={{ py: 0.5, alignItems: 'center' }}>
                              <Typography variant="caption" component="div" sx={{ fontWeight: 500 }}>
                                À compléter sur ce dossier :
                              </Typography>
                              <Box component="ul" sx={{ m: 0, pl: 2.5, mt: 0.25 }}>
                                {completenessIssues.map((msg) => (
                                  <Typography key={msg} variant="caption" component="li" sx={{ display: 'list-item' }}>
                                    {msg}
                                  </Typography>
                                ))}
                              </Box>
                            </Alert>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell 
                          style={{ paddingBottom: 0, paddingTop: 0, border: 'none' }} 
                          colSpan={8}
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Formation
                                  </Typography>
                                  <Typography variant="body1">
                                    {(() => {
                                      const formation = dossier.formation ?? (dossier.formation_id ? formationsCache.get(dossier.formation_id) : undefined);
                                      return formation?.nom || formation?.description || getTypePermisLabel(dossier) || 'N/A';
                                    })()}
                                  </Typography>
                                  {(() => {
                                    const formation = dossier.formation ?? (dossier.formation_id ? formationsCache.get(dossier.formation_id) : undefined);
                                    return formation?.description && formation?.nom ? (
                                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {formation.description}
                                      </Typography>
                                    ) : formation?.description ? (
                                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {formation.description}
                                      </Typography>
                                    ) : null;
                                  })()}
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Auto-École
                                  </Typography>
                                  <Typography variant="body1">
                                    {getAutoEcoleName(dossier)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Data catégorie
                                  </Typography>
                                  {(() => {
                                    const items = getDataCategorieItems(dossierForDetail);
                                    if (items.length === 0) {
                                      return (
                                        <Typography variant="body2" color="text.secondary">
                                          Aucune donnée enregistrée
                                        </Typography>
                                      );
                                    }
                                    return (
                                      <Table size="small" sx={{ backgroundColor: 'white', borderRadius: 1, overflow: 'hidden' }}>
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Classe</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Ville</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Valable du</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Jusqu&apos;au</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="center">Statut</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {items.map((item, idx) => (
                                            <TableRow key={idx}>
                                              <TableCell>{item.classe || '—'}</TableCell>
                                              <TableCell>{item.ville || '—'}</TableCell>
                                              <TableCell>{item.codification_code || '—'}</TableCell>
                                              <TableCell>{item.valable_du ? formatDate(item.valable_du) : '—'}</TableCell>
                                              <TableCell>{item.jusqu_au ? formatDate(item.jusqu_au) : '—'}</TableCell>
                                              <TableCell align="center">
                                                {!isDataCategorieItemExpired(item.jusqu_au) && (
                                                  <Chip label="Valide" color="success" size="small" variant="outlined" />
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    );
                                  })()}
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 15, 25, 50]}
          labelRowsPerPage="Lignes par page:"
        />
      </Paper>

      {/* Menu contextuel */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleOpenForTreatment} disabled={openingDossierId !== null}>
          <ListItemIcon>
            <LockOpen fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {openingDossierId === selectedRowId ? 'Ouverture…' : 'Ouvrir pour traitement'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleGoToReceptionTreatment} disabled={openingDossierId !== null}>
          <ListItemIcon>
            <AssignmentTurnedIn fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {openingDossierId === selectedRowId ? 'Redirection…' : 'Traiter en réception'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Formulaire */}
      {selectedDossier && (
        <DossierForm
          dossier={selectedDossier}
          open={formOpen}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          autoEcoleId={selectedDossier.auto_ecole_id}
        />
      )}

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestionDossierTable;


