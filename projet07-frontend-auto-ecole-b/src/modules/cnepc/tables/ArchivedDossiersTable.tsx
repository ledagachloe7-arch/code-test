import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
  LockOpen,
  Inventory,
  Edit,
} from '@mui/icons-material';
import { Dossier, Formation, Referentiel } from '../types/auto-ecole';
import { TypeDemande } from '../types/type-demande';
import { autoEcoleService, gestionDossierService, referentielService, typeDemandeService } from '../services';
import { GestionDossierFilters, GestionDossierListResponse } from '../types/gestion-dossier';
import { getTypeDemandeDisplayName } from '../pages/UsagerDossierPage/utils';
import { DossierForm } from '../forms';

interface ArchivedDossiersTableProps {
  refreshTrigger?: number;
}

const ArchivedDossiersTable: React.FC<ArchivedDossiersTableProps> = ({ refreshTrigger }) => {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [allDossiers, setAllDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeDemandeFilter, setTypeDemandeFilter] = useState<string>('');
  const [typePermisFilter, setTypePermisFilter] = useState<string>('');
  const [typeDemandes, setTypeDemandes] = useState<TypeDemande[]>([]);
  const [typePermis, setTypePermis] = useState<Referentiel[]>([]);

  const [localFilters, setLocalFilters] = useState({
    search: '',
    type_demande_id: '',
    type_permis_id: '',
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [openingDossierId, setOpeningDossierId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | undefined>();

  const [referentielsCache, setReferentielsCache] = useState<Map<string, Referentiel>>(new Map());
  const [formationsCache, setFormationsCache] = useState<Map<string, Formation>>(new Map());
  const [typeDemandeCache, setTypeDemandeCache] = useState<Map<string, TypeDemande>>(new Map());
  const [dossierDetailCache, setDossierDetailCache] = useState<Map<string, Dossier>>(new Map());

  const loadReferentiel = async (id: string): Promise<Referentiel | null> => {
    if (referentielsCache.has(id)) return referentielsCache.get(id)!;
    try {
      const referentiel = await referentielService.getReferentielById(id);
      setReferentielsCache((prev) => new Map(prev).set(id, referentiel));
      return referentiel;
    } catch {
      return null;
    }
  };

  const loadTypeDemande = async (id: string): Promise<TypeDemande | null> => {
    if (typeDemandeCache.has(id)) return typeDemandeCache.get(id)!;
    try {
      const typeDemande = await typeDemandeService.getTypeDemandeById(id);
      setTypeDemandeCache((prev) => new Map(prev).set(id, typeDemande));
      return typeDemande;
    } catch {
      return null;
    }
  };

  const loadMissingFormations = async (items: Dossier[]): Promise<Dossier[]> => {
    const formationIds = new Set<string>();
    items.forEach((d) => {
      const fid = d.formation_id ?? d.formation?.id;
      if (fid && !formationsCache.has(fid) && !d.formation) formationIds.add(fid);
    });
    const loadedFormations = new Map<string, Formation>();
    if (formationIds.size > 0) {
      const results = await Promise.all(
        Array.from(formationIds).map(async (id) => {
          try {
            const formation = await autoEcoleService.getFormationById(id);
            return { id, formation };
          } catch {
            return { id, formation: null };
          }
        })
      );
      const newCache = new Map(formationsCache);
      results.forEach(({ id, formation }) => {
        if (formation) { loadedFormations.set(id, formation); newCache.set(id, formation); }
      });
      setFormationsCache(newCache);
    }
    return items.map((d) => {
      const fid = d.formation_id ?? d.formation?.id;
      if (!fid) return d;
      const formation = d.formation ?? loadedFormations.get(fid) ?? formationsCache.get(fid);
      return formation ? { ...d, formation } : d;
    });
  };

  const loadMissingReferentiels = async (items: Dossier[]): Promise<Dossier[]> => {
    const referentielIds = new Set<string>();
    items.forEach((d) => {
      const rid = (d as any).referenciel_id;
      if (rid && !referentielsCache.has(rid)) referentielIds.add(rid);
      const formation = d.formation;
      const tpId = formation?.type_permis_id ?? (formation?.type_permis as any)?.id ?? (formation?.typePermis as any)?.id;
      if (tpId && !referentielsCache.has(tpId)) referentielIds.add(tpId);
    });
    const newCache = new Map(referentielsCache);
    if (referentielIds.size > 0) {
      const loaded = await Promise.all(Array.from(referentielIds).map((id) => loadReferentiel(id)));
      loaded.forEach((r) => { if (r) newCache.set(r.id, r); });
      setReferentielsCache(newCache);
    }
    return items.map((d) => {
      const rid = (d as any).referenciel_id;
      const formation = d.formation;
      const tpId = formation?.type_permis_id ?? (formation?.type_permis as any)?.id ?? (formation?.typePermis as any)?.id;
      const refId = rid ?? tpId;
      if (refId && newCache.has(refId) && !d.referentiel) return { ...d, referentiel: newCache.get(refId)! };
      return d;
    });
  };

  const loadMissingTypeDemandes = async (items: Dossier[]): Promise<Dossier[]> => {
    const ids = new Set<string>();
    items.forEach((d) => { if (d.type_demande_id && !typeDemandeCache.has(d.type_demande_id)) ids.add(d.type_demande_id); });
    const newCache = new Map(typeDemandeCache);
    if (ids.size > 0) {
      const loaded = await Promise.all(Array.from(ids).map((id) => loadTypeDemande(id)));
      loaded.forEach((td) => { if (td) newCache.set(td.id, td); });
      setTypeDemandeCache(newCache);
    }
    return items.map((d) => {
      if (d.type_demande_id && newCache.has(d.type_demande_id) && !d.type_demande)
        return { ...d, type_demande: newCache.get(d.type_demande_id)! };
      return d;
    });
  };

  const isEnvoyeBiometrie = (dossier: Dossier): boolean => {
    const statut = (dossier.statut || '').trim();
    return /dossier\s*envoy|envoy.*cneddt|impression/i.test(statut) || /biom[eé]trie/i.test(statut)
      || getStatutLabel(statut) === 'Envoyé à la biométrie';
  };

  const getRealStatut = (dossier: Dossier): string => (dossier.statut || 'en_attente').trim();

  const getStatutColor = (statut: string) => {
    const s = (statut || '').toLowerCase();
    if (s.includes('envoy') || s.includes('cneddt') || s.includes('impression') || s.includes('biométrie') || s.includes('biometrie')) return 'success';
    switch (statut) {
      case 'valide': case 'Validé': return 'success';
      case 'en_cours': case 'En cours': return 'info';
      case 'rejete': case 'Rejeté': return 'error';
      default: return 'warning';
    }
  };

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      en_attente: 'En attente', en_cours: 'En cours', valide: 'Validé',
      rejete: 'Rejeté', transmis: 'Transmis', Cnepc: 'CNEPC',
    };
    if (/dossier\s*envoy|envoy.*cneddt|impression/i.test(statut)) return 'Envoyé à la biométrie';
    return labels[statut] || statut;
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR');

  const isDataCategorieItemExpired = (jusquAu: string | undefined): boolean => {
    if (!jusquAu || !jusquAu.trim()) return false;
    const date = new Date(jusquAu);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDataCategorieItems = (dossier: Dossier): Array<{ classe: string; ville: string; codification_code: string; valable_du: string; jusqu_au: string }> => {
    const d = dossier as any;
    const raw = d.data_categorie ?? d.dataCategorie;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
    return raw.map((item: unknown) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        return { classe: String(o.classe ?? ''), ville: String(o.ville ?? ''), codification_code: String(o.codification_code ?? ''), valable_du: String(o.valable_du ?? ''), jusqu_au: String(o.jusqu_au ?? '') };
      }
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item) as Record<string, unknown>;
          return { classe: String(parsed.classe ?? ''), ville: String(parsed.ville ?? ''), codification_code: String(parsed.codification_code ?? ''), valable_du: String(parsed.valable_du ?? ''), jusqu_au: String(parsed.jusqu_au ?? '') };
        } catch { return { classe: '', ville: '', codification_code: '', valable_du: '', jusqu_au: item }; }
      }
      return { classe: '', ville: '', codification_code: '', valable_du: '', jusqu_au: '' };
    });
  };

  const getTypePermisLabel = (dossier: Dossier): string => {
    const referencielId = (dossier as any).referenciel_id;
    if (dossier.referentiel?.libelle) return dossier.referentiel.libelle;
    if (dossier.referentiel?.code) return dossier.referentiel.code;
    if (referencielId) {
      const cached = referentielsCache.get(referencielId);
      if (cached?.libelle) return cached.libelle;
      if (cached?.code) return cached.code;
    }
    const formation = dossier.formation ?? (dossier.formation_id ? formationsCache.get(dossier.formation_id) : undefined);
    if (formation) {
      const tp = formation.type_permis ?? formation.typePermis;
      if (tp) {
        if (typeof tp === 'string') return tp;
        if ('libelle' in tp && tp.libelle) return tp.libelle;
        if ('code' in tp && tp.code) return tp.code;
      }
      const tpId = formation.type_permis_id ?? (formation as any).type_permis?.id ?? (formation as any).typePermis?.id;
      if (tpId) {
        const fromList = typePermis.find((r) => r.id === tpId);
        if (fromList?.libelle) return fromList.libelle;
        const fromCache = referentielsCache.get(tpId);
        if (fromCache?.libelle) return fromCache.libelle;
      }
    }
    return 'N/A';
  };

  const getAutoEcoleName = (dossier: Dossier): string => {
    const formation = dossier.formation ?? (dossier.formation_id ? formationsCache.get(dossier.formation_id) : undefined);
    if (formation?.auto_ecole) {
      if (typeof formation.auto_ecole === 'string') return formation.auto_ecole;
      if ((formation.auto_ecole as any).nom_auto_ecole) return (formation.auto_ecole as any).nom_auto_ecole;
    }
    return 'N/A';
  };

  const loadDossiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: GestionDossierFilters = {};
      const response: GestionDossierListResponse = await gestionDossierService.getDossiers(1, 1000, filters);
      let enriched = response.data;
      enriched = await loadMissingFormations(enriched);
      enriched = await loadMissingReferentiels(enriched);
      enriched = await loadMissingTypeDemandes(enriched);
      // Garder uniquement les dossiers archivés
      setAllDossiers(enriched.filter((d) => isEnvoyeBiometrie(d)));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  };

  const loadTypeDemandes = async () => {
    try {
      const response = await typeDemandeService.getTypeDemandes(1, 100);
      setTypeDemandes(response.data);
    } catch { /* silencieux */ }
  };

  const loadTypePermis = async () => {
    try {
      const referentiels = await referentielService.getReferentielsByType('type_permis');
      setTypePermis(referentiels);
    } catch { /* silencieux */ }
  };

  useEffect(() => {
    let filtered = [...allDossiers];

    // Filtrage par nom / prénom / numéro candidat (frontend)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((d) => {
        const nom = (d.candidat?.personne?.nom ?? '').toLowerCase();
        const prenom = (d.candidat?.personne?.prenom ?? '').toLowerCase();
        const numero = (d.candidat?.numero_candidat ?? '').toLowerCase();
        return nom.includes(term) || prenom.includes(term) || numero.includes(term);
      });
    }

    if (typeDemandeFilter) {
      filtered = filtered.filter((d) => {
        if (d.type_demande_id === typeDemandeFilter) return true;
        if (d.type_demande?.id === typeDemandeFilter) return true;
        const cached = typeDemandeCache.get(typeDemandeFilter);
        return !!(cached && d.type_demande_id === cached.id);
      });
    }
    if (typePermisFilter) {
      filtered = filtered.filter((d) => {
        const rid = (d as any).referenciel_id;
        if (rid === typePermisFilter) return true;
        if (d.referentiel?.id === typePermisFilter) return true;
        const cached = referentielsCache.get(typePermisFilter);
        return !!(cached && rid === cached.id);
      });
    }
    const startIndex = page * rowsPerPage;
    setDossiers(filtered.slice(startIndex, startIndex + rowsPerPage));
    setTotal(filtered.length);
  }, [allDossiers, searchTerm, typeDemandeFilter, typePermisFilter, typeDemandeCache, referentielsCache, page, rowsPerPage]);

  useEffect(() => {
    loadTypeDemandes();
    loadTypePermis();
  }, []);

  useEffect(() => {
    loadDossiers();
  }, [refreshTrigger]);

  const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (key: string, value: any) => setLocalFilters({ ...localFilters, [key]: value });

  const handleApplyFilters = () => {
    setSearchTerm(localFilters.search);
    setTypeDemandeFilter(localFilters.type_demande_id);
    setTypePermisFilter(localFilters.type_permis_id);
    setPage(0);
  };

  const handleClearFilters = () => {
    const cleared = { search: '', type_demande_id: '', type_permis_id: '' };
    setLocalFilters(cleared);
    setSearchTerm('');
    setTypeDemandeFilter('');
    setTypePermisFilter('');
    setPage(0);
  };

  const getActiveFiltersCount = () => Object.values(localFilters).filter((v) => v !== '' && v != null).length;

  const handleToggleExpand = (dossierId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dossierId)) {
        newSet.delete(dossierId);
      } else {
        newSet.add(dossierId);
        const dossier = allDossiers.find((d) => d.id === dossierId);
        const d = dossier as any;
        const hasDataCategorie = (d?.data_categorie ?? d?.dataCategorie) && Array.isArray(d?.data_categorie ?? d?.dataCategorie);
        if (dossier && !hasDataCategorie && !dossierDetailCache.has(dossierId)) {
          gestionDossierService.getDossierById(dossierId)
            .then((full) => setDossierDetailCache((c) => new Map(c).set(dossierId, full)))
            .catch((err) => console.error('Erreur chargement détail dossier:', err));
        }
      }
      return newSet;
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, dossierId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(dossierId);
  };

  const handleMenuClose = () => { setAnchorEl(null); setSelectedRowId(null); };

  const handleEdit = () => {
    const dossier = dossiers.find((d) => d.id === selectedRowId);
    if (!dossier) {
      handleMenuClose();
      return;
    }

    const dossierId = dossier.id;
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

  const handleOpenForTreatment = async () => {
    const dossier = dossiers.find((d) => d.id === selectedRowId);
    if (!dossier) { handleMenuClose(); return; }
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

  const handleFormSuccess = (updatedDossier: Dossier) => {
    // Mettre à jour le cache du dossier pour éviter d'afficher des anciennes valeurs
    setDossierDetailCache((cache) => new Map(cache).set(updatedDossier.id, updatedDossier));
    setFormOpen(false);
    setSelectedDossier(undefined);
    loadDossiers();
  };

  const handleFormCancel = () => {
    setFormOpen(false);
    setSelectedDossier(undefined);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'transparent' }} elevation={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Inventory sx={{ color: 'success.main' }} />
            <Typography variant="h6">Dossiers archivés</Typography>
            <Chip label={`${total} dossier${total > 1 ? 's' : ''}`} size="small" color="success" variant="outlined" />
          </Box>
        </Box>

        {/* Filtres */}
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterList sx={{ mr: 1 }} />
                <Typography variant="h6">Filtres</Typography>
                {getActiveFiltersCount() > 0 && (
                  <Chip label={getActiveFiltersCount()} color="primary" size="small" sx={{ ml: 1 }} />
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<Clear />} onClick={handleClearFilters} disabled={getActiveFiltersCount() === 0}>
                  Effacer
                </Button>
                <Button size="small" variant="contained" startIcon={<Search />} onClick={handleApplyFilters}>
                  Appliquer
                </Button>
              </Stack>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth size="small" label="Rechercher"
                  value={localFilters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Numéro candidat, nom, prénom..."
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type de demandes</InputLabel>
                  <Select
                    value={localFilters.type_demande_id || ''}
                    onChange={(e) => handleFilterChange('type_demande_id', e.target.value)}
                    label="Type de demandes"
                  >
                    <MenuItem value="">Tous les types</MenuItem>
                    {typeDemandes.sort((a, b) => a.name.localeCompare(b.name)).map((td) => (
                      <MenuItem key={td.id} value={td.id}>{getTypeDemandeDisplayName(td.name)}</MenuItem>
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
                      .sort((a, b) => (a.libelle || a.code || '').localeCompare(b.libelle || b.code || ''))
                      .map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.libelle || r.code || r.id}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
        )}

        <TableContainer>
          <Table sx={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <TableBody>
              {loading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={80} /></TableCell>
                      <TableCell><Skeleton variant="text" width={150} /></TableCell>
                      <TableCell><Skeleton variant="text" width={100} /></TableCell>
                      <TableCell><Skeleton variant="text" width={120} /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={100} /></TableCell>
                      <TableCell align="right"><Skeleton variant="circular" width={32} height={32} /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : dossiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Inventory sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography variant="body1" color="text.secondary">
                        Aucun dossier archivé
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Les dossiers avec le statut "Envoyé à la biométrie" apparaîtront ici.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                dossiers.map((dossier) => {
                  const isExpanded = expandedRows.has(dossier.id);
                  const dossierForDetail = dossierDetailCache.get(dossier.id) ?? dossier;
                  return (
                    <React.Fragment key={dossier.id}>
                      <TableRow
                        hover
                        sx={{
                          boxShadow: 1,
                          backgroundColor: 'white',
                          transition: 'background-color 0.2s ease',
                          border: 'none',
                          '& td': { border: 'none', borderBottom: 'none' },
                          '&:hover': { boxShadow: 3, backgroundColor: 'white', cursor: 'pointer' },
                        }}
                      >
                        <TableCell>
                          <IconButton size="small" onClick={() => handleToggleExpand(dossier.id)} sx={{ p: 0.5 }}>
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
                              if (dossier.type_demande?.name) return dossier.type_demande.name;
                              if (dossier.type_demande_id) {
                                const cached = typeDemandeCache.get(dossier.type_demande_id);
                                if (cached?.name) return cached.name;
                              }
                              return dossier.type_demande_id || 'N/A';
                            })()
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatutLabel(getRealStatut(dossier))}
                            color={getStatutColor(getRealStatut(dossier)) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(dossier.date_creation || dossier.created_at)}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, dossier.id)}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 'none' }} colSpan={8}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Formation</Typography>
                                  <Typography variant="body1">
                                    {(() => {
                                      const formation = dossier.formation ?? (dossier.formation_id ? formationsCache.get(dossier.formation_id) : undefined);
                                      return formation?.nom || formation?.description || getTypePermisLabel(dossier) || 'N/A';
                                    })()}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Auto-École</Typography>
                                  <Typography variant="body1">{getAutoEcoleName(dossier)}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Data catégorie</Typography>
                                  {(() => {
                                    const items = getDataCategorieItems(dossierForDetail);
                                    if (items.length === 0) {
                                      return <Typography variant="body2" color="text.secondary">Aucune donnée enregistrée</Typography>;
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
          <ListItemIcon><LockOpen fontSize="small" /></ListItemIcon>
          <ListItemText>{openingDossierId === selectedRowId ? 'Ouverture…' : 'Ouvrir pour traitement'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
      </Menu>

      {/* Formulaire de modification */}
      {selectedDossier && (
        <DossierForm
          dossier={selectedDossier}
          open={formOpen}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          autoEcoleId={selectedDossier.auto_ecole_id}
        />
      )}
    </Box>
  );
};

export default ArchivedDossiersTable;
