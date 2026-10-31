// Composant pour afficher une carte de candidat aux examens
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Button,
  Divider,
  Grid,
} from '@mui/material';
import {
  School,
  CalendarToday,
  Phone,
  Email,
  Edit,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { CandidatExamen } from '../types';

interface CandidatExamenCardProps {
  candidat: CandidatExamen;
  onView?: (candidat: CandidatExamen) => void;
  onEdit?: (candidat: CandidatExamen) => void;
  onDelete?: (candidat: CandidatExamen) => void;
}

const CandidatExamenCard: React.FC<CandidatExamenCardProps> = ({
  candidat,
  onView,
  onEdit,
  onDelete,
}) => {
  // Obtenir la couleur du statut
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'inscrit': return 'primary';
      case 'en_attente': return 'warning';
      case 'programme': return 'info';
      case 'present': return 'success';
      case 'absent': return 'error';
      case 'reussi': return 'success';
      case 'echoue': return 'error';
      case 'annule': return 'default';
      default: return 'default';
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* En-tête avec avatar et nom */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              color: 'white',
              mr: 2,
            }}
          >
            {candidat.candidat.personne.prenom[0]}{candidat.candidat.personne.nom[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold" noWrap>
              {candidat.candidat.personne.prenom} {candidat.candidat.personne.nom}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {candidat.candidat.numero_candidat}
            </Typography>
          </Box>
          <Chip
            label={candidat.statut_libelle}
            color={getStatutColor(candidat.statut) as any}
            size="small"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Informations du candidat */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Email sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {candidat.candidat.personne.email}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Phone sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {candidat.candidat.personne.contact}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <School sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {candidat.auto_ecole.nom_auto_ecole}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Inscrit le {formatDate(candidat.date_inscription)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Session d'examen */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Session d'examen
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {candidat.session_examen.nom}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {candidat.session_examen.type_permis.libelle} - {candidat.formation.nom}
          </Typography>
        </Box>

        {/* Commentaires */}
        {candidat.commentaires && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Commentaires
            </Typography>
            <Typography variant="body2" sx={{ 
              fontStyle: 'italic',
              backgroundColor: 'grey.50',
              p: 1,
              borderRadius: 1,
            }}>
              {candidat.commentaires}
            </Typography>
          </Box>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Box>
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={() => onView?.(candidat)}
          >
            Voir
          </Button>
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => onEdit?.(candidat)}
          >
            Modifier
          </Button>
        </Box>
        <Box>
          <IconButton
            size="small"
            onClick={() => onDelete?.(candidat)}
            color="error"
          >
            <Delete />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

export default CandidatExamenCard;
