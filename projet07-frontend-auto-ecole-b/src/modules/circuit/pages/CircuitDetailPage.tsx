import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Button,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { useParams, useNavigate } from 'react-router-dom'
import { Circuit } from '../types/circuit'
import { Etape } from '../types/etape'
import { Statut } from '../../statut/types/statut'
import { circuitService } from '../services/circuit.service'
import { etapeService } from '../services/etape.service'
import { statutService } from '../../statut/services/statut.service'
import { typeDocumentService } from '../services/type-document.service'
import { roleService } from '../services/role.service'
import { TypeDocument } from '../types'
import { Transition } from '../types/transition'
import { transitionService } from '../services/transition.service'
import WorkflowDiagramme from '../components/WorkflowDiagramme'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const CircuitDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [value, setValue] = React.useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const [circuit, setCircuit] = useState<Circuit | null>(null)
  const [etapes, setEtapes] = useState<Etape[]>([])
  const [statuts, setStatuts] = useState<Statut[]>([])
  const [transitions, setTransitions] = useState<Transition[]>([])
  const [typeDocuments, setTypeDocuments] = useState<TypeDocument[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [openAddEtape, setOpenAddEtape] = useState(false)
  const [openEditEtape, setOpenEditEtape] = useState(false)
  const [editingEtapeId, setEditingEtapeId] = useState<string | null>(null)
  const [formEtape, setFormEtape] = useState<Partial<Etape>>({
    code: '',
    libelle: '',
    ordre: 0,
    auto_advance: false,
    statut_id: '',
    pieces: [],
    roles: []
  })
  const [openAddTransition, setOpenAddTransition] = useState(false)
  const [formTransition, setFormTransition] = useState<Partial<Transition>>({
    // id?: string,
    circuit_id: "",
    code: "",
    libelle: "",
    source_etape_id: "",
    cible_etape_id: "",
  })

  // === Charger circuit, étapes et statuts ===
  const fetchData = async () => {
    if (!id) {
      setError('Identifiant de circuit manquant.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [circuitData, etapesData, statutsData, typeDocuments, rolesData, transitionsData] = await Promise.all([
        circuitService.getById(id),
        etapeService.getByCircuitId(id),
        statutService.getAll(),
        typeDocumentService.getAll({
          type_ref: "type_document"
        }),
        roleService.getAll(),
        transitionService.getByCircuitId(id),
      ])
      setCircuit(circuitData)
      const etapesArray = Array.isArray(etapesData)
        ? etapesData
        : (etapesData &&
            typeof etapesData === 'object' &&
            'data' in (etapesData as Record<string, unknown>) &&
            Array.isArray((etapesData as { data: unknown }).data)
            ? ((etapesData as { data: Etape[] }).data ?? [])
            : [])
      setEtapes(etapesArray)
      const statutsArray = Array.isArray(statutsData) 
        ? statutsData 
        : (statutsData && typeof statutsData === 'object' && 'data' in statutsData 
          ? (statutsData as { data: Statut[] }).data 
          : [])
      setStatuts(statutsArray)
      const typeDocumentsArray = Array.isArray(typeDocuments) 
        ? typeDocuments 
        : (typeDocuments && typeof typeDocuments === 'object' && 'data' in typeDocuments 
          ? (typeDocuments as { data: TypeDocument[] }).data 
          : [])
      setTypeDocuments(typeDocumentsArray);
      setRoles(Array.isArray(rolesData) ? rolesData : ((rolesData as any)?.roles || []));
      const transitionsArray = Array.isArray(transitionsData)
        ? transitionsData
        : (transitionsData &&
            typeof transitionsData === 'object' &&
            'data' in (transitionsData as Record<string, unknown>) &&
            Array.isArray((transitionsData as { data: unknown }).data)
            ? ((transitionsData as { data: Transition[] }).data ?? [])
            : [])
      setTransitions(transitionsArray);
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // === Ajouter une étape ===
  const handleAddEtape = async () => {
    if (!id) {
      setErrorForm('Identifiant de circuit manquant')
      return
    }
    
    // Validation des champs requis
    if (!formEtape.code || !formEtape.libelle) {
      setErrorForm('Le code et le libellé sont requis')
      return
    }
    
    if (!formEtape.statut_id) {
      setErrorForm('Le statut est requis')
      return
    }
    
    try {
      setErrorForm(null)
      // Préparer le payload selon les paramètres de l'API
      // Filtrer les pièces pour ne garder que celles avec un type_document valide
      const piecesValides = (formEtape.pieces || [])
        .filter(piece => piece.type_document && piece.type_document.trim() !== '')
        .map(piece => ({
          type_document: piece.type_document!,
          libelle: piece.libelle || '',
          obligatoire: piece.obligatoire || false
        }))
      
      const payload = {
        circuit_id: id,
        code: formEtape.code.trim(),
        libelle: formEtape.libelle.trim(),
        ordre: formEtape.ordre || 0,
        auto_advance: formEtape.auto_advance || false,
        statut_id: formEtape.statut_id,
        roles: (formEtape.roles || []).filter((role): role is string => Boolean(role)),
        pieces: piecesValides
      }
      
      console.log('📤 Payload de création d\'étape:', payload)
      
      await etapeService.create(payload)
      setFormEtape({
        code: '',
        libelle: '',
        ordre: 0,
        auto_advance: false,
        statut_id: '',
        pieces: [],
        roles: []
      })
      setOpenAddEtape(false)
      await fetchData()
    } catch (err: any) {
      console.error('❌ Erreur lors de l\'ajout de l\'étape:', err)
      console.error('📋 Réponse complète:', err.response?.data)
      
      let errorMessage = 'Erreur lors de l\'ajout de l\'étape'
      
      if (err.response?.status === 422) {
        // Erreur de validation - afficher les détails
        console.error('🚫 Erreur 422 - Validation échouée')
        
        if (err.response.data?.errors) {
          // Si c'est un objet d'erreurs de validation Laravel
          const errors = Object.entries(err.response.data.errors)
            .map(([field, messages]: [string, any]) => {
              const fieldName = field.replace(/_/g, ' ')
              const messagesList = Array.isArray(messages) ? messages : [messages]
              return `${fieldName}: ${messagesList.join(', ')}`
            })
            .join('\n')
          errorMessage = `Erreurs de validation:\n${errors}`
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message
        } else {
          errorMessage = 'Erreur de validation. Le code de l\'étape est peut-être déjà utilisé dans un autre circuit.'
        }
      } else if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setErrorForm(errorMessage)
    }
  }

  const handleDeleteEtape = async (etapeId: string) => {
    if (!confirm('Supprimer cette étape ?')) return
    try {
      await etapeService.remove(etapeId)
      await fetchData()
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la suppression')
    }
  }

  // === Ouvrir le dialog de modification ===
  const handleOpenEditEtape = (etape: Etape) => {
    setEditingEtapeId(etape.id!)
    setFormEtape({
      code: etape.code || '',
      libelle: etape.libelle || '',
      ordre: etape.ordre || 0,
      auto_advance: etape.auto_advance || false,
      statut_id: etape.statut_id || '',
      pieces: etape.pieces || [],
      roles: etape.roles || []
    })
    setErrorForm(null)
    setOpenEditEtape(true)
  }

  // === Fermer le dialog de modification ===
  const handleCloseEditEtape = () => {
    setOpenEditEtape(false)
    setEditingEtapeId(null)
    setFormEtape({
      code: '',
      libelle: '',
      ordre: 0,
      auto_advance: false,
      statut_id: '',
      pieces: [],
      roles: []
    })
    setErrorForm(null)
  }

  // === Modifier une étape ===
  const handleUpdateEtape = async () => {
    if (!editingEtapeId || !id) {
      setErrorForm('Identifiant manquant')
      return
    }
    
    // Validation des champs requis
    if (!formEtape.code || !formEtape.libelle) {
      setErrorForm('Le code et le libellé sont requis')
      return
    }
    
    if (!formEtape.statut_id) {
      setErrorForm('Le statut est requis')
      return
    }
    
    try {
      setErrorForm(null)
      // Préparer le payload selon les paramètres de l'API
      // Filtrer les pièces pour ne garder que celles avec un type_document valide
      const piecesValides = (formEtape.pieces || [])
        .filter(piece => piece.type_document && piece.type_document.trim() !== '')
        .map(piece => ({
          type_document: piece.type_document!,
          libelle: piece.libelle || '',
          obligatoire: piece.obligatoire || false
        }))
      
      const payload = {
        circuit_id: id,
        code: formEtape.code.trim(),
        libelle: formEtape.libelle.trim(),
        statut_id: formEtape.statut_id || '',
        roles: (formEtape.roles || []).filter((role): role is string => Boolean(role)),
        pieces: piecesValides
      }
      
      console.log('📤 Payload de modification d\'étape:', payload)
      console.log('📤 ID de l\'étape à modifier:', editingEtapeId)
      
      await etapeService.update(editingEtapeId, payload)
      handleCloseEditEtape()
      await fetchData()
    } catch (err: any) {
      console.error('❌ Erreur lors de la modification de l\'étape:', err)
      console.error('📋 Réponse complète:', err.response?.data)
      
      let errorMessage = 'Erreur lors de la modification de l\'étape'
      
      if (err.response?.status === 422) {
        // Erreur de validation - afficher les détails
        console.error('🚫 Erreur 422 - Validation échouée')
        
        if (err.response.data?.errors) {
          // Si c'est un objet d'erreurs de validation Laravel
          const errors = Object.entries(err.response.data.errors)
            .map(([field, messages]: [string, any]) => {
              const fieldName = field.replace(/_/g, ' ')
              const messagesList = Array.isArray(messages) ? messages : [messages]
              return `${fieldName}: ${messagesList.join(', ')}`
            })
            .join('\n')
          errorMessage = `Erreurs de validation:\n${errors}`
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message
        } else {
          errorMessage = 'Erreur de validation. Le code de l\'étape est peut-être déjà utilisé dans un autre circuit.'
        }
      } else if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setErrorForm(errorMessage)
    }
  }

  // === Ajouter une transition ===
  const handleAddTransition = async () => {
    try {
      const payload = { ...formTransition, circuit_id: id }
      await transitionService.create(payload)
      setFormTransition({
        circuit_id: "",
        code: "",
        libelle: "",
        source_etape_id: "",
        cible_etape_id: "",
      })
      setOpenAddTransition(false)
      await fetchData()
    } catch (err: any) {
      setErrorForm(err.message ?? 'Erreur lors de l’ajout de la transition')
    }
  }
  // === Supprimer une transition ===
  const handleDeleteTransition = async (etapeId: string) => {
    if (!confirm('Supprimer cette transition ?')) return
    try {
      await transitionService.remove(etapeId)
      await fetchData()
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la suppression')
    }
  }

  // === États de chargement et erreurs ===
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Box>
    )
  }

  if (!circuit) {
    return (
      <Box p={3}>
        <Typography>Aucun circuit trouvé.</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Box>
    )
  }

  // === Vue principale ===
  return (
    <Box sx={{ p: 3 }}>
      <Button
        variant="text"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Retour à la liste
      </Button>

      {/* === Informations du circuit === */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Détails du circuits
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Nom du circuit
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {circuit.libelle || '—'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Entité concernée
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {circuit.nom_entite || '—'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Statut
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {circuit.actif ? '✅ Actif' : '❌ Inactif'}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {circuit.description || 'Aucune description'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Etapes du circuit" {...a11yProps(0)} />
          <Tab label="Transitions du circuit" {...a11yProps(1)} />
          <Tab label="Diagramme" {...a11yProps(2)} />
        </Tabs>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6"></Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddEtape(true)}
            >
              Nouvelle étape
            </Button>
          </Box>

          {etapes.length === 0 ? (
            <Typography color="text.secondary">Aucune étape enregistrée.</Typography>
          ) : (
            <Box>
              {etapes.map((etape) => (
                <Paper
                  key={etape.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                  }}
                >
                  <Box width="100%">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {etape.libelle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Code : {etape.code} — Ordre : {etape.ordre}
                    </Typography>
                    <Typography variant="body2">
                      {etape.auto_advance ? '⏩ Passage automatique' : '🕹️ Manuel'}
                    </Typography>
                    {etape.statut_libelle && (
                      <Typography variant="body2" color="primary">
                        Statut associé : {etape.statut_libelle}
                      </Typography>
                    )}

                    {/* Exigences */}
                    {etape.pieces && etape.pieces.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="subtitle2">Exigences :</Typography>
                        <ul>
                          {etape.pieces.map((ex, idx) => (
                            <li key={idx}>
                              {ex.piece_code} — {ex.origine || 'Inconnue'} —{' '}
                              {ex.obligatoire ? 'Obligatoire' : 'Optionnelle'} -
                            </li>
                          ))}
                        </ul>
                      </Box>
                    )}
                  </Box>

                  <Box alignSelf="flex-end" display="flex" gap={1}>
                    <Tooltip title="Modifier">
                      <IconButton color="primary" onClick={() => handleOpenEditEtape(etape)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton color="error" onClick={() => handleDeleteEtape(etape.id!)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6"></Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddTransition(true)}
            >
              Nouvelle transition
            </Button>
          </Box>

          {transitions.length === 0 ? (
            <Typography color="text.secondary">Aucune transition enregistrée.</Typography>
          ) : (
            <Box>
              {transitions.map((transition) => (
                <Paper
                  key={transition.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                  }}
                >
                  <Box width="100%">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {transition.libelle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Code : {transition.code}
                    </Typography>
                    <Typography variant="body2">
                      Parcours : {transition.source?.libelle} - {transition.cible?.libelle}
                    </Typography>
                  </Box>

                  <Box alignSelf="flex-end">
                    <Tooltip title="Supprimer">
                      <IconButton color="error" onClick={() => handleDeleteTransition(transition.id!)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      </CustomTabPanel>

      <CustomTabPanel value={value} index={2}>
        {/* === DIAGRAMME DU WORKFLOW === */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Diagramme du workflow
          </Typography>
          <WorkflowDiagramme etapes={etapes} transitions={transitions} />
        </Paper>
      </CustomTabPanel>

      

      {/* === DIALOG AJOUT ÉTAPE === */}
      <Dialog open={openAddEtape} onClose={() => setOpenAddEtape(false)} maxWidth="md" fullWidth>
        <DialogTitle>Ajouter une étape</DialogTitle>
        <DialogContent>
          {errorForm && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorForm}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                value={formEtape.code ?? ''}
                onChange={(e) =>
                  setFormEtape({ ...formEtape, code: e.target.value.toUpperCase() })
                }
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Libellé"
                value={formEtape.libelle ?? ''}
                onChange={(e) => {
                  let v = e.target.value
                  v = v.charAt(0).toUpperCase() + v.slice(1)
                  setFormEtape({ ...formEtape, libelle: v })
                }}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Ordre"
                value={formEtape.ordre ?? 0}
                onChange={(e) =>
                  setFormEtape({ ...formEtape, ordre: Number(e.target.value) })
                }
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Statut associé</InputLabel>
                <Select
                  value={formEtape.statut_id ?? ''}
                  label="Statut associé"
                  onChange={(e) =>
                    setFormEtape({ ...formEtape, statut_id: e.target.value as string })
                  }
                >
                  {Array.isArray(statuts) && statuts.length > 0 ? (
                    statuts.map((statut) => (
                      <MenuItem key={statut.id} value={statut.id}>
                        {statut.libelle}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Aucun statut disponible</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Rôles</InputLabel>
                <Select
                  multiple
                  value={formEtape.roles ?? []}
                  label="Rôles"
                  onChange={(e) =>
                    setFormEtape({ ...formEtape, roles: e.target.value as string[] })
                  }
                  renderValue={(selected) => (selected as string[]).join(', ')} // affichage lisible
                >
                  {Array.isArray(roles) && roles.length > 0 ? (
                    roles.map((role) => (
                      <MenuItem key={role} value={role}>
                        <Checkbox checked={formEtape.roles?.includes(role) ?? false} />
                        <Typography>{role}</Typography>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Aucun rôle disponible</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>


            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formEtape.auto_advance ?? false}
                    onChange={(e) =>
                      setFormEtape({ ...formEtape, auto_advance: e.target.checked })
                    }
                  />
                }
                label="Passage automatique ?"
              />
            </Grid>

            {/* === Section Exigences === */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Ppièces justificatives
              </Typography>

              {(formEtape.pieces ?? []).map((piece, index) => (
                <Grid
                  container
                  key={index}
                  spacing={2}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    p: 2,
                    mb: 1,
                    backgroundColor: '#fafafa',
                  }}
                >
                  {/* === Sélecteur de type de document === */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type de document</InputLabel>
                      <Select
                        value={piece.type_document ?? ''}
                        label="Type de document"
                        onChange={(e) => {
                          const newEx = [...(formEtape.pieces ?? [])]
                          newEx[index].type_document = e.target.value // code du document
                          newEx[index].libelle = typeDocuments.find(td => td.id === e.target.value)?.libelle || ''  
                          setFormEtape({ ...formEtape, pieces: newEx })
                        }}
                      >
                        {Array.isArray(typeDocuments) && typeDocuments.length > 0 ? (
                          typeDocuments.map((doc) => (
                            <MenuItem key={doc.id} value={doc.id}>
                              {doc.libelle} ({doc.code})
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>Aucun type de document</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* === Nombre minimum === */}
                  {/* <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Nombre minimum"
                      value={piece.nombre_min ?? 0}
                      onChange={(e) => {
                        const newEx = [...(formEtape.pieces ?? [])]
                        newEx[index].nombre_min = Number(e.target.value)
                        setFormEtape({ ...formEtape, pieces: newEx })
                      }}
                    />
                  </Grid> */}

                  {/* === Origine === */}
                  {/* <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Origine"
                      value={piece.origine ?? ''}
                      onChange={(e) => {
                        const newEx = [...(formEtape.pieces ?? [])]
                        newEx[index].origine = e.target.value
                        setFormEtape({ ...formEtape, pieces: newEx })
                      }}
                    />
                  </Grid> */}

                  {/* === Checkbox obligatoire === */}
                  <Grid item xs={12} md={5} display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={piece.obligatoire ?? false}
                          onChange={(e) => {
                            const newEx = [...(formEtape.pieces ?? [])]
                            newEx[index].obligatoire = e.target.checked
                            setFormEtape({ ...formEtape, pieces: newEx })
                          }}
                        />
                      }
                      label="Obligatoire"
                    />
                  </Grid>

                  {/* === Bouton suppression === */}
                  <Grid item xs={12} md={1} display="flex" alignItems="center">
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        const newEx = (formEtape.pieces ?? []).filter((_, i) => i !== index)
                        setFormEtape({ ...formEtape, pieces: newEx })
                      }}
                    >
                      Suppr.
                    </Button>
                  </Grid>
                </Grid>
              ))}

              {/* === Bouton d'ajout === */}
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const newEx = {
                    type_document: '',
                    libelle: '',
                    obligatoire: false,
                  }
                  setFormEtape({
                    ...formEtape,
                    pieces: [...(formEtape.pieces ?? []), newEx],
                  })
                }}
              >
                + Ajouter une piece
              </Button>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenAddEtape(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleAddEtape}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAddTransition} onClose={() => setOpenAddTransition(false)} maxWidth="md" fullWidth>
        <DialogTitle>Ajouter une transition</DialogTitle>
        <DialogContent>
          {errorForm && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorForm}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                value={formTransition.code ?? ''}
                onChange={(e) =>
                  setFormTransition({ ...formTransition, code: e.target.value.toUpperCase() })
                }
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Libellé"
                value={formTransition.libelle ?? ''}
                onChange={(e) => {
                  let v = e.target.value
                  v = v.charAt(0).toUpperCase() + v.slice(1)
                  setFormTransition({ ...formTransition, libelle: v })
                }}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Etape de départ</InputLabel>
                <Select
                  value={formTransition.source_etape_id ?? ''}
                  label="Etape de départ"
                  onChange={(e) =>
                    setFormTransition({ ...formTransition, source_etape_id: e.target.value as string })
                  }
                >
                  {Array.isArray(etapes) && etapes.length > 0 ? (
                    etapes.map((etape) => (
                      <MenuItem key={etape.id} value={etape.id}>
                        {etape.libelle}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Aucun étape disponible</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Etape de fin</InputLabel>
                <Select
                  value={formTransition.cible_etape_id ?? ''}
                  label="Etape de fin"
                  onChange={(e) =>
                    setFormTransition({ ...formTransition, cible_etape_id: e.target.value as string })
                  }
                >
                  {Array.isArray(etapes) && etapes.length > 0 ? (
                    etapes.map((etape) => (
                      <MenuItem key={etape.id} value={etape.id}>
                        {etape.libelle}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Aucun étape disponible</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>


          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenAddTransition(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleAddTransition}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* === DIALOG MODIFICATION ÉTAPE === */}
      <Dialog open={openEditEtape} onClose={handleCloseEditEtape} maxWidth="md" fullWidth>
        <DialogTitle>Modifier une étape</DialogTitle>
        <DialogContent>
          {errorForm && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorForm}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Code"
                value={formEtape.code ?? ''}
                onChange={(e) =>
                  setFormEtape({ ...formEtape, code: e.target.value.toUpperCase() })
                }
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Libellé"
                value={formEtape.libelle ?? ''}
                onChange={(e) => {
                  let v = e.target.value
                  v = v.charAt(0).toUpperCase() + v.slice(1)
                  setFormEtape({ ...formEtape, libelle: v })
                }}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Ordre"
                value={formEtape.ordre ?? 0}
                onChange={(e) =>
                  setFormEtape({ ...formEtape, ordre: Number(e.target.value) })
                }
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Statut associé</InputLabel>
                <Select
                  value={formEtape.statut_id ?? ''}
                  label="Statut associé"
                  onChange={(e) =>
                    setFormEtape({ ...formEtape, statut_id: e.target.value as string })
                  }
                >
                  {Array.isArray(statuts) && statuts.length > 0 ? (
                    statuts.map((statut) => (
                      <MenuItem key={statut.id} value={statut.id}>
                        {statut.libelle}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Aucun statut disponible</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Rôles</InputLabel>
                <Select
                  multiple
                  value={formEtape.roles ?? []}
                  label="Rôles"
                  onChange={(e) =>
                    setFormEtape({ ...formEtape, roles: e.target.value as string[] })
                  }
                  renderValue={(selected) => (selected as string[]).join(', ')}
                >
                  {Array.isArray(roles) && roles.length > 0 ? (
                    roles.map((role) => (
                      <MenuItem key={role} value={role}>
                        <Checkbox checked={formEtape.roles?.includes(role) ?? false} />
                        <Typography>{role}</Typography>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Aucun rôle disponible</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formEtape.auto_advance ?? false}
                    onChange={(e) =>
                      setFormEtape({ ...formEtape, auto_advance: e.target.checked })
                    }
                  />
                }
                label="Passage automatique ?"
              />
            </Grid>

            {/* === Section Exigences === */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Pièces justificatives
              </Typography>

              {(formEtape.pieces ?? []).map((piece, index) => (
                <Grid
                  container
                  key={index}
                  spacing={2}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    p: 2,
                    mb: 1,
                    backgroundColor: '#fafafa',
                  }}
                >
                  {/* === Sélecteur de type de document === */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Type de document</InputLabel>
                      <Select
                        value={piece.type_document ?? ''}
                        label="Type de document"
                        onChange={(e) => {
                          const newEx = [...(formEtape.pieces ?? [])]
                          newEx[index].type_document = e.target.value
                          newEx[index].libelle = typeDocuments.find(td => td.id === e.target.value)?.libelle || ''  
                          setFormEtape({ ...formEtape, pieces: newEx })
                        }}
                      >
                        {Array.isArray(typeDocuments) && typeDocuments.length > 0 ? (
                          typeDocuments.map((doc) => (
                            <MenuItem key={doc.id} value={doc.id}>
                              {doc.libelle} ({doc.code})
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>Aucun type de document</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* === Checkbox obligatoire === */}
                  <Grid item xs={12} md={5} display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={piece.obligatoire ?? false}
                          onChange={(e) => {
                            const newEx = [...(formEtape.pieces ?? [])]
                            newEx[index].obligatoire = e.target.checked
                            setFormEtape({ ...formEtape, pieces: newEx })
                          }}
                        />
                      }
                      label="Obligatoire"
                    />
                  </Grid>

                  {/* === Bouton suppression === */}
                  <Grid item xs={12} md={1} display="flex" alignItems="center">
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        const newEx = (formEtape.pieces ?? []).filter((_, i) => i !== index)
                        setFormEtape({ ...formEtape, pieces: newEx })
                      }}
                    >
                      Suppr.
                    </Button>
                  </Grid>
                </Grid>
              ))}

              {/* === Bouton d'ajout === */}
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const newEx = {
                    type_document: '',
                    libelle: '',
                    obligatoire: false,
                  }
                  setFormEtape({
                    ...formEtape,
                    pieces: [...(formEtape.pieces ?? []), newEx],
                  })
                }}
              >
                + Ajouter une piece
              </Button>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseEditEtape}>Annuler</Button>
          <Button variant="contained" onClick={handleUpdateEtape}>
            Modifier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CircuitDetailPage
