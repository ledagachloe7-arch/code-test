// Composant pour afficher les statistiques
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  People,
  School,
  CheckCircle,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { CandidatExamenStats, SessionExamenStats, CreneauStats } from '../types';

interface StatistiquesPanelProps {
  type: 'candidats' | 'sessions' | 'creneaux';
  stats: CandidatExamenStats | SessionExamenStats | CreneauStats | null;
  loading?: boolean;
}

const StatistiquesPanel: React.FC<StatistiquesPanelProps> = ({
  type,
  stats,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Chargement des statistiques...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Aucune donnée disponible
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const renderCandidatStats = (stats: CandidatExamenStats) => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">
                {stats.total}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Total Candidats
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircle color="success" sx={{ mr: 1 }} />
              <Typography variant="h6" color="success.main">
                {stats.reussis}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Réussis
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.taux_reussite.toFixed(1)}% de réussite
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Cancel color="error" sx={{ mr: 1 }} />
              <Typography variant="h6" color="error.main">
                {stats.echoues}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Échoués
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule color="info" sx={{ mr: 1 }} />
              <Typography variant="h6" color="info.main">
                {stats.presents}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Présents
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.taux_presence.toFixed(1)}% de présence
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Détail des statuts */}
      <Grid item xs={12}>
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Répartition par statut
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Chip label={`Inscrits: ${stats.inscrits}`} color="primary" variant="outlined" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Chip label={`Programmés: ${stats.programmes}`} color="info" variant="outlined" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Chip label={`Présents: ${stats.presents}`} color="success" variant="outlined" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Chip label={`Absents: ${stats.absents}`} color="error" variant="outlined" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Chip label={`Réussis: ${stats.reussis}`} color="success" variant="outlined" />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Chip label={`Échoués: ${stats.echoues}`} color="error" variant="outlined" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSessionStats = (stats: SessionExamenStats) => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <School color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">
                {stats.total}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Total Sessions
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp color="success" sx={{ mr: 1 }} />
              <Typography variant="h6" color="success.main">
                {stats.ouvertes}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Ouvertes
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircle color="info" sx={{ mr: 1 }} />
              <Typography variant="h6" color="info.main">
                {stats.terminees}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Terminées
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" color="warning.main">
                {stats.taux_occupation.toFixed(1)}%
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Taux d'occupation
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Capacité */}
      <Grid item xs={12}>
        <Card elevation={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Capacité des sessions
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Utilisée: {stats.capacite_utilisee} / {stats.capacite_totale}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.taux_occupation.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={stats.taux_occupation}
                color={stats.taux_occupation >= 100 ? 'error' : stats.taux_occupation >= 80 ? 'warning' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderCreneauStats = (stats: CreneauStats) => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">
                {stats.total}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Total Créneaux
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircle color="success" sx={{ mr: 1 }} />
              <Typography variant="h6" color="success.main">
                {stats.disponibles}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Disponibles
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Cancel color="error" sx={{ mr: 1 }} />
              <Typography variant="h6" color="error.main">
                {stats.complets}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Complets
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp color="info" sx={{ mr: 1 }} />
              <Typography variant="h6" color="info.main">
                {stats.taux_occupation.toFixed(1)}%
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Taux d'occupation
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Statistiques {type === 'candidats' ? 'des Candidats' : type === 'sessions' ? 'des Sessions' : 'des Créneaux'}
      </Typography>
      
      {type === 'candidats' && renderCandidatStats(stats as CandidatExamenStats)}
      {type === 'sessions' && renderSessionStats(stats as SessionExamenStats)}
      {type === 'creneaux' && renderCreneauStats(stats as CreneauStats)}
    </Box>
  );
};

export default StatistiquesPanel;
