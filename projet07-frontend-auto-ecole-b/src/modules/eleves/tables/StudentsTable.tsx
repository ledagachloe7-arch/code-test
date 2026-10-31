import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Paper, 
  Chip, 
  TextField, 
  Box,
  IconButton,
  Typography,
  Grid,
  Card,
  CardContent
} from '@mui/material';
// Heroicons imports
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import ValidationService, { EleveValide } from '../services/validationService';
import { ROUTES } from '../../../shared/constants';

const StudentsTable: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [elevesValides, setElevesValides] = useState<EleveValide[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistiques, setStatistiques] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Charger les élèves validés au montage du composant
  useEffect(() => {
    chargerElevesValides();
    
    // Écouter les événements de validation de dossier pour rafraîchir automatiquement
    const handleDossierValidated = () => {
      console.log('🔄 Événement de validation reçu, rafraîchissement de la liste des élèves validés...');
      chargerElevesValides();
    };
    
    // Écouter aussi quand la page redevient visible (au cas où l'utilisateur navigue vers cette page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page devenue visible, rafraîchissement de la liste des élèves validés...');
        chargerElevesValides();
      }
    };
    
    window.addEventListener('dossierValidated', handleDossierValidated);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Nettoyer les écouteurs lors du démontage
    return () => {
      window.removeEventListener('dossierValidated', handleDossierValidated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const chargerElevesValides = async () => {
    try {
      setLoading(true);
      console.log('🔄 Chargement des élèves validés...');
      const eleves = await ValidationService.getElevesValides();
      console.log('📊 Élèves validés récupérés:', eleves.length);
      console.log('📋 Liste des élèves:', eleves);
      const stats = await ValidationService.getStatistiquesElevesValides();
      console.log('📊 Statistiques:', stats);
      setElevesValides(eleves);
      setStatistiques(stats);
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des élèves validés:', error);
      console.error('📋 Détails de l\'erreur:', {
        message: error?.message,
        stack: error?.stack
      });
      setElevesValides([]);
      setStatistiques(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = elevesValides.filter(eleve => {
    const firstName = eleve.firstName?.toLowerCase() || '';
    const lastName = eleve.lastName?.toLowerCase() || '';
    const email = eleve.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return firstName.includes(search) || 
           lastName.includes(search) || 
           email.includes(search);
  });

  // Log pour débogage
  useEffect(() => {
    console.log('🔍 État de StudentsTable:');
    console.log('  - Élèves validés:', elevesValides.length);
    console.log('  - Élèves filtrés:', filteredStudents.length);
    console.log('  - Terme de recherche:', searchTerm);
    console.log('  - Données:', elevesValides);
  }, [elevesValides, filteredStudents, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated': return 'Validé';
      default: return 'Inconnu';
    }
  };

  const handleViewStudent = (studentId: string) => {
    const eleve = elevesValides.find(e => e.id === studentId);
    if (eleve && eleve.demandeId) {
      // Naviguer vers la page de détails en utilisant le demandeId (qui correspond au dossier)
      navigate(ROUTES.ELEVE_INSCRIT_DETAILS.replace(':id', eleve.demandeId));
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await ValidationService.supprimerEleveValide(studentId);
      await chargerElevesValides(); // Recharger la liste
      console.log('Élève supprimé:', studentId);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography>Chargement des élèves validés...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Statistiques */}
      {statistiques && (
        <Grid container spacing={1} sx={{ mb: 1.5, flexShrink: 0 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography color="text.secondary" gutterBottom variant="body2" sx={{ mb: 0.5 }}>
                  Total validés
                </Typography>
                <Typography variant="h5">
                  {statistiques.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography color="text.secondary" gutterBottom variant="body2" sx={{ mb: 0.5 }}>
                  Documents complets
                </Typography>
                <Typography variant="h5" color="success.main">
                  {statistiques.documentsComplets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography color="text.secondary" gutterBottom variant="body2" sx={{ mb: 0.5 }}>
                  Documents incomplets
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {statistiques.documentsIncomplets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography color="text.secondary" gutterBottom variant="body2" sx={{ mb: 0.5 }}>
                  Taux de complétude
                </Typography>
                <Typography variant="h5" color="info.main">
                  {statistiques.total > 0 ? Math.round((statistiques.documentsComplets / statistiques.total) * 100) : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ mb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <TextField
          placeholder="Rechercher un élève"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <MagnifyingGlassIcon className="w-5 h-5 mr-1 text-gray-400" />
          }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      <Box
        component={Paper}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          maxHeight: 'calc(100vh - 400px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <TableContainer 
          sx={{
            overflow: 'auto',
            flex: 1,
            minHeight: 0
          }}
        >
          <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'white' }}>
              <TableCell sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Nom</TableCell>
              <TableCell sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Email</TableCell>
              <TableCell sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Téléphone</TableCell>
              <TableCell sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Auto-École</TableCell>
              <TableCell sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Statut</TableCell>
              <TableCell sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Documents</TableCell>
              <TableCell sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Date de validation</TableCell>
              <TableCell align="right" sx={{ py: 1.25, fontWeight: 600, fontSize: '0.875rem', color: 'black' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chargement...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {elevesValides.length === 0 
                      ? 'Aucun élève validé trouvé. Les dossiers avec statut "valide" apparaîtront ici.' 
                      : `Aucun élève ne correspond à "${searchTerm}"`}
                  </Typography>
                  {elevesValides.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Vérifiez la console pour voir les détails de la récupération des données.
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((eleve) => (
                <TableRow key={eleve.id} hover sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.4 }}>
                      {eleve.firstName} {eleve.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {eleve.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {eleve.phone}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {eleve.autoEcole.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Chip
                      label={getStatusLabel(eleve.status)}
                      color={getStatusColor(eleve.status) as any}
                      size="small"
                      sx={{ height: 24, fontSize: '0.75rem', fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Chip
                      label={`${eleve.documentsCount}/4`}
                      color={eleve.documentsCount === 4 ? 'success' : 'warning'}
                      size="small"
                      sx={{ height: 24, fontSize: '0.75rem', fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {new Date(eleve.validatedAt).toLocaleDateString('fr-FR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleViewStudent(eleve.id)}
                        title="Voir détails"
                        sx={{ 
                          padding: 0.75,
                          color: '#3A75C4',
                          '&:hover': { 
                            backgroundColor: '#e3f2fd',
                            color: '#2A5A9A'
                          }
                        }}
                      >
                        <EyeIcon className="w-5 h-5" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteStudent(eleve.id)}
                        title="Supprimer"
                        sx={{ 
                          padding: 0.75,
                          color: '#d32f2f',
                          '&:hover': { 
                            backgroundColor: '#ffebee',
                            color: '#c62828'
                          }
                        }}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </TableContainer>
        <TablePagination
          sx={{ flexShrink: 0, py: 0.75, borderTop: '1px solid #e5e7eb' }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredStudents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Lignes:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`}
        />
      </Box>
    </Box>
  );
};

export default StudentsTable;
