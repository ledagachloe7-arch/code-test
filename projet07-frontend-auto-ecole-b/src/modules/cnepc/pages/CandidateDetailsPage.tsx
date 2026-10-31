import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Alert,
  IconButton,
  Button,
  Skeleton,
  Fade,
  Paper,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { autoEcoleService, typeDemandeService } from '../services';
import { Dossier } from '../types/auto-ecole';
import { TypeDemande } from '../types/type-demande';
import DossierCard from './UsagerDossierPage/components/DossierCard';
import DocumentsList from './UsagerDossierPage/components/DocumentsList';

const CandidateDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeDemandeCache, setTypeDemandeCache] = useState<Map<string, TypeDemande>>(new Map());

  const dossierId = id;

  // Fonction pour enrichir les données du type de demande
  const enrichTypeDemandeData = async (dossier: Dossier) => {
    if (!dossier.type_demande_id) {
      return;
    }

    // Si le type de demande est déjà chargé, ne rien faire
    if (dossier.type_demande) {
      return;
    }

    // Si le type de demande est dans le cache, l'utiliser
    if (typeDemandeCache.has(dossier.type_demande_id)) {
      const cachedTypeDemande = typeDemandeCache.get(dossier.type_demande_id)!;
      setDossier(prevDossier => ({
        ...prevDossier!,
        type_demande: cachedTypeDemande
      }));
      return;
    }

    try {
      console.log('🔄 Enrichissement du type de demande pour:', dossier.type_demande_id);
      
      const typeDemande = await typeDemandeService.getTypeDemandeById(dossier.type_demande_id);
      
      console.log('✅ Type de demande chargé:', typeDemande);
      
      // Mettre à jour le dossier avec le type de demande
      setDossier(prevDossier => ({
        ...prevDossier!,
        type_demande: typeDemande
      }));
      
      // Mettre à jour le cache
      const newCache = new Map(typeDemandeCache);
      newCache.set(typeDemande.id, typeDemande);
      setTypeDemandeCache(newCache);
    } catch (error) {
      console.error('❌ Erreur lors de l\'enrichissement du type de demande:', error);
    }
  };


  // Charger les détails du dossier
  useEffect(() => {
    const loadDossierDetails = async () => {
      if (!dossierId) {
        setError('ID du dossier manquant');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Chargement des détails du dossier:', dossierId);
        
        // Essayer d'abord de récupérer les données depuis l'état de navigation
        const stateDossier = location.state?.dossier;
        if (stateDossier) {
          console.log('✅ Utilisation des données passées en paramètre:', stateDossier);
          setDossier(stateDossier);
          
          // Enrichir les données du type de demande en arrière-plan
          enrichTypeDemandeData(stateDossier);
          
          setLoading(false);
          return;
        }
        
        // Sinon, essayer l'API
        try {
          const dossier = await autoEcoleService.getDossierById(dossierId);
          
          // Mapper les documents selon la structure de l'API
          // Les documents de l'API ont la structure: { id, documentable_id, documentable_type, nom_fichier, chemin_fichier, etc. }
          if (dossier.documents && Array.isArray(dossier.documents)) {
            dossier.documents = dossier.documents.map((doc: any) => ({
              id: doc.id,
              dossier_id: doc.documentable_id || dossier.id,
              type_document_id: doc.type_document_id || null,
              nom: doc.nom_fichier || doc.nom || 'Document',
              nom_fichier: doc.nom_fichier || doc.nom || 'Document',
              chemin_fichier: doc.chemin_fichier,
              type_mime: doc.type_mime || 'application/octet-stream',
              taille_fichier: doc.taille_fichier || 0,
              taille_fichier_formate: doc.taille_fichier_formate || '0 B',
              statut: doc.statut || 'en_attente',
              valide: doc.valide !== undefined ? doc.valide : false,
              valide_libelle: doc.valide_libelle || (doc.valide ? 'Validé' : 'Non validé'),
              date_upload: doc.created_at || doc.date_upload || new Date().toISOString(),
              commentaires: doc.commentaires || null,
              created_at: doc.created_at,
              updated_at: doc.updated_at
            }));
          }
          
          setDossier(dossier);
          console.log('✅ Dossier chargé via API:', dossier);
          console.log('📄 Documents dans le dossier:', dossier.documents?.length || 0);
          
          // Enrichir les données du type de demande en arrière-plan
          enrichTypeDemandeData(dossier);
        } catch (apiError: any) {
          console.warn('⚠️ API non disponible, utilisation des données de base:', apiError);
          
          // Si l'API échoue, créer un dossier minimal avec les données disponibles
          // Cela permet d'afficher au moins les informations de base
          const minimalDossier: Dossier = {
            id: dossierId,
            candidat_id: 'unknown',
            auto_ecole_id: 'unknown',
            formation_id: 'unknown',
            statut: 'en_attente',
            date_creation: new Date().toISOString(),
            date_modification: new Date().toISOString(),
            commentaires: 'Données limitées disponibles',
            candidat: {
              id: 'unknown',
              personne_id: 'unknown',
              numero_candidat: 'N/A',
              date_naissance: 'N/A',
              lieu_naissance: 'N/A',
              nip: 'N/A',
              type_piece: 'N/A',
              numero_piece: 'N/A',
              nationalite: 'N/A',
              genre: 'N/A',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              personne: {
                id: 'unknown',
                nom: 'Non disponible',
                prenom: 'Non disponible',
                nom_complet: 'Non disponible',
                email: 'Non disponible',
                contact: 'Non disponible',
                adresse: 'Non disponible',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            },
            formation: {
              id: 'unknown',
              auto_ecole_id: 'unknown',
              type_permis_id: 'unknown',
              montant: 0,
              montant_formate: 'N/A',
              nom: 'Formation non disponible',
              description: 'Les détails de la formation ne sont pas disponibles',
              duree_jours: 0,
              statut: false,
              statut_libelle: 'Non disponible',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            documents: [], // Aucun document disponible
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          setDossier(minimalDossier);
        }
        
      } catch (err: any) {
        console.error('❌ Erreur lors du chargement du dossier:', err);
        
        // Gestion spécifique des erreurs
        if (err.response?.status === 404) {
          setError('Dossier non trouvé. Vérifiez que l\'ID du dossier est correct.');
        } else if (err.response?.status === 403) {
          setError('Vous n\'avez pas les permissions pour consulter ce dossier.');
        } else if (err.response?.status === 401) {
          setError('Session expirée. Veuillez vous reconnecter.');
        } else {
          setError(err.response?.data?.message || 'Erreur lors du chargement des détails du candidat');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDossierDetails();
  }, [dossierId, location.state]);

  const handleBack = () => {
    navigate(-1);
  };

  const referentielsCache = new Map<string, any>();
  const dossierStatusCache = new Map<string, string>(
    dossier ? [[dossier.id, dossier.statut]] : []
  );

  if (loading) {
    return (
      <Fade in timeout={300}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Skeleton variant="text" width={250} height={40} />
          </Box>
          <Grid container spacing={3}>
            {[1, 2].map((i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Skeleton variant="rectangular" height={340} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          </Grid>
        </Box>
      </Fade>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={handleBack} startIcon={<ArrowBack />}>Retour</Button>
      </Box>
    );
  }

  if (!dossier) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>Dossier non trouvé</Alert>
        <Button variant="contained" onClick={handleBack} startIcon={<ArrowBack />}>Retour</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Détails du Candidat
        </Typography>
      </Box>

      {/* Carte permis (DossierCard) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <DossierCard
          dossier={dossier}
          isSelected={false}
          referentielsCache={referentielsCache}
          typeDemandeCache={typeDemandeCache}
          dossierStatusCache={dossierStatusCache}
          onDossierClick={() => {}}
        />
      </Grid>

      {/* Liste des documents */}
      <Paper elevation={2} sx={{ p: 0, overflow: 'hidden' }}>
        <DocumentsList
          documents={(dossier.documents || []) as any[]}
          piecesJustificativesMap={new Map()}
          candidatDossiers={[dossier]}
          selectedDossierId={dossier.id}
          initialId={dossier.id}
          loadingDossiers={false}
          referentielsCache={referentielsCache}
          typeDemandeCache={typeDemandeCache}
        />
      </Paper>
    </Box>
  );
};

export default CandidateDetailsPage;
