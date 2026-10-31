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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { Statut } from '../types/statut'
import { statutService } from '../services/statut.service'
import StatutTable from '../components/StatutTable';

interface ResponseData {
  data: Statut[],
  links: any,
  meta: any
}

const StatutPage: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingStatut, setEditingStatut] = useState<Statut | null>(null)
  const [formData, setFormData] = useState<Partial<Statut>>({
    code: '',
    libelle: '',
    final: false,
    annulable: false,
  })
  const [statuts, setStatuts] = useState<Statut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // === Charger la liste ===
  const fetchStatuts = async () => {
    setError(null)
    try {
      setLoading(true)
      const response: any = await statutService.getAll()
      setStatuts(response)
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors du chargement des statuts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatuts()
  }, [])

  // === Ouvrir / fermer le dialog ===
  const handleOpenDialog = (statut?: Statut) => {
    if (statut) {
      setEditingStatut(statut)
      setFormData({
        code: statut.code,
        libelle: statut.libelle,
        final: statut.final,
        annulable: statut.annulable,
      })
    } else {
      setEditingStatut(null)
      setFormData({
        code: '',
        libelle: '',
        final: false,
        annulable: false,
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingStatut(null)
    setFormData({
      code: '',
      libelle: '',
      final: false,
      annulable: false,
    })
  }

  // === Soumission du formulaire ===
  const handleSubmit = async () => {
    try {
      if (editingStatut) {
        await statutService.update(editingStatut.id, formData)
      } else {
        await statutService.create(formData)
      }
      await fetchStatuts()
      handleCloseDialog()
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la sauvegarde du statut')
    }
  }

  // === Suppression ===
  const handleDelete = (id: string) => {
    setSelectedId(id)
    setOpenConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      await statutService.remove(selectedId as string)
      setStatuts((prev) => prev.filter((s) => s.id !== selectedId))
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la suppression du statut')
    } finally {
      setOpenConfirm(false)
      setSelectedId(null)
    }
  }

  const handleCloseConfirm = () => {
    setOpenConfirm(false)
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestion des statuts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Créer et gérer les statuts du workflow
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ height: 40 }}
        >
          Nouveau statut
        </Button>
      </Box>

      {/* CONTENU PRINCIPAL */}
      <Paper>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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
          <StatutTable
            data={statuts}
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
            refreshTrigger={statuts.length}
          />
        )}
      </Paper>

      {/* DIALOG FORM */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStatut ? 'Modifier le statut' : 'Nouveau statut'}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Code"
              value={formData.code ?? ''}
              onChange={(e) => {
                let value = e.target.value.toUpperCase()
                value = value.replace(/\s+/g, '')
                value = value.replace(/[^A-Z0-9_-]/g, '')
                setFormData({ ...formData, code: value })
              }}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Libellé"
              value={formData.libelle ?? ''}
              onChange={(e) => {
                let value = e.target.value
                // Première lettre en majuscule
                value = value.charAt(0).toUpperCase() + value.slice(1)
                setFormData({ ...formData, libelle: value })
              }}
              margin="normal"
            />

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.final ?? false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, final: e.target.checked })
                    }
                  />
                }
                label="Statut final ?"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.annulable ?? false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, annulable: e.target.checked })
                    }
                  />
                }
                label="Annulable ?"
              />
            </FormGroup>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingStatut ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG CONFIRMATION SUPPRESSION */}
      <Dialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Suppression du statut ?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Êtes-vous sûr de vouloir supprimer ce statut ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm} color="primary">
            Annuler
          </Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default StatutPage
