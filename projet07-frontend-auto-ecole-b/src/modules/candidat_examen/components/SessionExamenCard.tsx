// Composant pour afficher une carte de session d'examen
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  Divider,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  School,
  CalendarToday,
  LocationOn,
  Person,
  Group,
  Edit,
  Delete,
  Visibility,
  PlayArrow,
  Stop,
} from '@mui/icons-material';
import { SessionExamen } from '../types';

interface SessionExamenCardProps {
  session: SessionExamen;
  onView?: (session: SessionExamen) => void;
  onEdit?: (session: SessionExamen) => void;
  onDelete?: (session: SessionExamen) => void;
  onOuvrirInscriptions?: (session: SessionExamen) => void;
  onFermerInscriptions?: (session: SessionExamen) => void;
}

const SessionExamenCard: React.FC<SessionExamenCardProps> = ({
  session,
  onView,
  onEdit,
  onDelete,
  onOuvrirInscriptions,
  onFermerInscriptions,
}) => {
  // Obtenir la couleur du statut
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'planifiee': return 'default';
      case 'ouverte': return 'success';
      case 'fermee': return 'warning';
      case 'en_cours': return 'info';
      case 'terminee': return 'success';
      case 'annulee': return 'error';
      default: return 'default';
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculer le pourcentage d'occupation
  const tauxOccupation = session.capacite_maximale > 0 
    ? (session.capacite_utilisee / session.capacite_maximale) * 100 
    : 0;

  return (
    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* En-tête avec nom et statut */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {session.nom}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {session.type_permis.libelle} - {session.type_permis.categorie}
            </Typography>
          </Box>
          <Chip
            label={session.statut_libelle}
            color={getStatutColor(session.statut) as any}
            size="small"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Description */}
        {session.description && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {session.description}
            </Typography>
          </Box>
        )}

        {/* Informations de la session */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Du {formatDate(session.date_debut)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Au {formatDate(session.date_fin)}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {session.lieu}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {session.adresse}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {session.responsable.nom_complet}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Group sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {session.capacite_utilisee} / {session.capacite_maximale} candidats
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Barre de progression de l'occupation */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Occupation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tauxOccupation.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={tauxOccupation}
            color={tauxOccupation >= 100 ? 'error' : tauxOccupation >= 80 ? 'warning' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Nombre d'épreuves */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {session.epreuves.length} épreuve(s) programmée(s)
          </Typography>
        </Box>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Box>
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={() => onView?.(session)}
          >
            Voir
          </Button>
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => onEdit?.(session)}
          >
            Modifier
          </Button>
        </Box>
        <Box>
          {session.statut === 'planifiee' && (
            <Button
              size="small"
              startIcon={<PlayArrow />}
              color="success"
              onClick={() => onOuvrirInscriptions?.(session)}
            >
              Ouvrir
            </Button>
          )}
          {session.statut === 'ouverte' && (
            <Button
              size="small"
              startIcon={<Stop />}
              color="warning"
              onClick={() => onFermerInscriptions?.(session)}
            >
              Fermer
            </Button>
          )}
          <Button
            size="small"
            startIcon={<Delete />}
            color="error"
            onClick={() => onDelete?.(session)}
          >
            Supprimer
          </Button>
        </Box>
      </CardActions>
    </Card>
  );
};

export default SessionExamenCard;
