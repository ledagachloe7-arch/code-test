
import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Paper,
  Alert,
  CircularProgress,
  DialogContentText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'

import AddIcon from '@mui/icons-material/Add'

import { Circuit } from '../types/circuit'
import { circuitService } from '../services/circuit.service'
import { typePermisService } from '../services/type-permis.service'
import { typeDemandeService } from '../../cnepc/services'
import { TypeDemande } from '../../cnepc/types/type-demande'
import CircuitTable from '../components/CircuitTable'
import { Referentiel } from '../../../shared/model/referentiel'

const CircuitPage: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCircuit, setEditingCircuit] = useState<Circuit | null>(null)

  const [formData, setFormData] = useState<Partial<Circuit>>({
    libelle: '',
    description: '',
    actif: true,
    nom_entite: '',
    type_permis: '',
    nationalite: '',
  })

  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [typePermis, setTypePermis] = useState<Referentiel[]>([])
  const [typeDemandes, setTypeDemandes] = useState<TypeDemande[]>([])

  const [loadingTypeDemandes, setLoadingTypeDemandes] = useState(false)
  const [selectedTypeDemandeId, setSelectedTypeDemandeId] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [etrangerValues] = useState<string[]>(['OUI', 'NON'])

  // ==========================================
  // CHARGER LES CIRCUITS
  // ==========================================

  const fetchCircuits = async () => {
    setError(null)

    try {
      setLoading(true)

      const response: any = await circuitService.getAll()

      const liste = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : []

      setCircuits(liste)
    } catch (err: any) {
      console.error('Erreur chargement circuits :', err)
      setError(err.message ?? 'Erreur lors du chargement des circuits')
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // CHARGER LES TYPES DE PERMIS
  // ==========================================

  const fetchTypePermis = async () => {
    try {
      const response: any = await typePermisService.getAll({
        type_ref: 'type_permis',
      })

      const liste = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : []

      setTypePermis(liste)

      console.log('Types de permis récupérés :', liste)
    } catch (err: any) {
      console.error('Erreur chargement types de permis :', err)
      setTypePermis([])
    }
  }

  // ==========================================
  // CHARGER LES TYPES DE DEMANDE / ENTITÉS
  // ==========================================

  const fetchTypeDemandes = async (): Promise<TypeDemande[]> => {
    setLoadingTypeDemandes(true)

    try {
      const response: any = await typeDemandeService.getTypeDemandes(1, 1000)

      console.log('Réponse API types de demande :', response)

      const liste = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.data)
            ? response.data.data
            : []

      console.log('Types de demande récupérés :', liste)

      setTypeDemandes(liste)

      return liste
    } catch (err: any) {
      console.error('Erreur chargement types de demande :', err)

      setTypeDemandes([])

      return []
    } finally {
      setLoadingTypeDemandes(false)
    }
  }

  // ==========================================
  // INITIALISATION
  // ==========================================

  useEffect(() => {
    fetchCircuits()
    fetchTypePermis()
    fetchTypeDemandes()
  }, [])

  // ==========================================
  // OUVRIR LE FORMULAIRE
  // ==========================================

  const handleOpenDialog = async (circuit?: Circuit) => {
    let demandesDisponibles = typeDemandes

    // Recharger les entités si nécessaire
    if (demandesDisponibles.length === 0) {
      demandesDisponibles = await fetchTypeDemandes()
    }

    if (circuit) {
      setEditingCircuit(circuit)

      const circuitNomEntiteNormalized =
        circuit.nom_entite
          ?.toUpperCase()
          .replace(/\s+/g, '')
          .replace(/[^A-Z0-9_-]/g, '') || ''

      const matchingTypeDemande = demandesDisponibles.find(td => {
        const tdNameNormalized = td.name
          .toUpperCase()
          .replace(/\s+/g, '')
          .replace(/[^A-Z0-9_-]/g, '')

        return (
          tdNameNormalized === circuitNomEntiteNormalized ||
          td.name === circuit.nom_entite ||
          td.name.toUpperCase() === circuit.nom_entite
        )
      })

      setSelectedTypeDemandeId(matchingTypeDemande?.id || '')

      setFormData({
        libelle: circuit.libelle,
        description: circuit.description,
        actif: circuit.actif,
        nom_entite: circuit.nom_entite,
        type_permis: circuit.type_permis,
        nationalite: circuit.nationalite,
      })
    } else {
      setEditingCircuit(null)
      setSelectedTypeDemandeId('')

      setFormData({
        libelle: '',
        description: '',
        actif: true,
        nom_entite: '',
        type_permis: '',
        nationalite: '',
      })
    }

    setError(null)
    setOpenDialog(true)
  }

  // ==========================================
  // FERMER LE FORMULAIRE
  // ==========================================

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingCircuit(null)
    setSelectedTypeDemandeId('')

    setFormData({
      libelle: '',
      description: '',
      actif: true,
      nom_entite: '',
      type_permis: '',
      nationalite: '',
    })
  }

  // ==========================================
  // SÉLECTIONNER UNE ENTITÉ
  // ==========================================

  const handleTypeDemandeChange = (typeDemandeId: string) => {
    setSelectedTypeDemandeId(typeDemandeId)

    const selectedTypeDemande = typeDemandes.find(
      td => td.id === typeDemandeId
    )

    if (selectedTypeDemande) {
      setFormData(prev => ({
        ...prev,
        nom_entite: selectedTypeDemande.name,
      }))
    }
  }

  // ==========================================
  // ENREGISTRER LE CIRCUIT
  // ==========================================

  const handleSubmit = async () => {
    try {
      setError(null)

      if (!formData.libelle || formData.libelle.trim() === '') {
        setError('Le nom du circuit est requis')
        return
      }

      if (!formData.nom_entite || formData.nom_entite.trim() === '') {
        setError("L'entité concernée est requise")
        return
      }

      const nomEntite = formData.nom_entite.trim()

      const payload: Record<string, any> = {
        libelle: formData.libelle.trim(),
        actif: formData.actif ?? true,
        nom_entite: nomEntite,
      }

      if (formData.nationalite?.trim()) {
        payload.nationalite = formData.nationalite.trim()
      }

      if (formData.type_permis?.trim()) {
        payload.type_permis = formData.type_permis.trim()
      }

      console.log('Payload circuit :', payload)

      if (editingCircuit) {
        const result = await circuitService.update(
          editingCircuit.id,
          payload
        )

        console.log('Circuit mis à jour :', result)
      } else {
        const result = await circuitService.create(payload)

        console.log('Circuit créé :', result)
      }

      await fetchCircuits()
      handleCloseDialog()
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde du circuit :', err)

      let errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Erreur lors de la sauvegarde du circuit'

      if (err.response?.data?.errors) {
        const validationErrors = Object.entries(
          err.response.data.errors
        )
          .map(([field, messages]: [string, any]) =>
            `${field}: ${
              Array.isArray(messages)
                ? messages.join(', ')
                : messages
            }`
          )
          .join('; ')

        errorMessage += ` - ${validationErrors}`
      }

      setError(errorMessage)
    }
  }

  // ==========================================
  // SUPPRIMER UN CIRCUIT
  // ==========================================

  const handleDelete = (id: string) => {
    setSelectedId(id)
    setOpen(true)
  }

  const confirmDelete = async () => {
    try {
      if (!selectedId) return

      await circuitService.remove(selectedId)

      setCircuits(prev =>
        prev.filter(c => c.id !== selectedId)
      )
    } catch (err: any) {
      console.error('Erreur suppression circuit :', err)

      setError(
        err.message ?? 'Erreur lors de la suppression du circuit'
      )
    } finally {
      setOpen(false)
      setSelectedId(null)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  // ==========================================
  // AFFICHAGE
  // ==========================================

  return (
    <Box sx={{ flexGrow: 1 }}>

      {/* HEADER */}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestion des circuits
          </Typography>

          <Typography variant="body1" color="text.secondary">
            Créer et gérer les circuits de workflow
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ height: 40 }}
        >
          Nouveau circuit
        </Button>
      </Box>

      {/* CONTENU PRINCIPAL */}

      <Paper>
        {loading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          </Box>
        )}

        {!loading && (
          <CircuitTable
            data={circuits}
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
            refreshTrigger={circuits.length}
          />
        )}
      </Paper>

      {/* FORMULAIRE NOUVEAU / MODIFICATION CIRCUIT */}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCircuit ? 'Modifier le circuit' : 'Nouveau circuit'}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>

            {/* NOM */}

            <TextField
              fullWidth
              label="Nom"
              value={formData.libelle ?? ''}
              onChange={(e) => {
                let value = e.target.value

                value =
                  value.charAt(0).toUpperCase() +
                  value.slice(1)

                setFormData(prev => ({
                  ...prev,
                  libelle: value,
                }))
              }}
              margin="normal"
            />

            {/* ENTITÉ */}

            <FormControl
              fullWidth
              margin="normal"
              required
            >
              <InputLabel id="entite-label">
                Entité concernée
              </InputLabel>

              <Select
                labelId="entite-label"
                value={selectedTypeDemandeId}
                label="Entité concernée"
                onChange={(e) =>
                  handleTypeDemandeChange(e.target.value as string)
                }
                disabled={loadingTypeDemandes}
              >
                {loadingTypeDemandes ? (
                  <MenuItem disabled>
                    Chargement des entités...
                  </MenuItem>
                ) : typeDemandes.length > 0 ? (
                  typeDemandes.map((typeDemande) => (
                    <MenuItem
                      key={typeDemande.id}
                      value={typeDemande.id}
                    >
                      {typeDemande.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    Aucune entité disponible dans la base de données
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {!loadingTypeDemandes && typeDemandes.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Aucune entité n'a été enregistrée dans les types de demande.
                Vérifie les données de la table type_demandes.
              </Alert>
            )}

            {/* TYPE DE PERMIS */}

            <FormControl fullWidth margin="normal">
              <InputLabel id="type-permis-label">
                Type de permis
              </InputLabel>

              <Select
                labelId="type-permis-label"
                value={formData.type_permis ?? ''}
                label="Type de permis"
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    type_permis: e.target.value as string,
                  }))
                }
              >
                {typePermis.length > 0 ? (
                  typePermis.map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item.code}
                    >
                      {item.libelle}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    Aucun type de permis disponible
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* ÉTRANGER */}

            <FormControl fullWidth margin="normal">
              <InputLabel id="etranger-label">
                Étranger ?
              </InputLabel>

              <Select
                labelId="etranger-label"
                value={formData.nationalite ?? ''}
                label="Étranger ?"
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    nationalite: e.target.value as string,
                  }))
                }
              >
                {etrangerValues.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* DESCRIPTION */}

            <TextField
              fullWidth
              label="Description"
              value={formData.description ?? ''}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              margin="normal"
              multiline
              rows={4}
            />

            {/* ACTIF */}

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.actif ?? false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({
                        ...prev,
                        actif: e.target.checked,
                      }))
                    }
                  />
                }
                label="Actif ?"
              />
            </FormGroup>

          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Annuler
          </Button>

          <Button
            onClick={handleSubmit}
            variant="contained"
          >
            {editingCircuit ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRMATION SUPPRESSION */}

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Suppression de l'élément ?
        </DialogTitle>

        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Êtes-vous sûr de vouloir supprimer cet élément ?
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Annuler
          </Button>

          <Button
            autoFocus
            color="primary"
            onClick={confirmDelete}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}

export default CircuitPage
