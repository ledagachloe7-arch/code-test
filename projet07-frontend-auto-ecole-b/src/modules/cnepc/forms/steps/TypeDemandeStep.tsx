import React, { useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  Button
} from '@mui/material';
import { CheckCircle, ArrowBack, ArrowForward, Description, RadioButtonUnchecked, Info } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { TypeDemande } from '../../services';

interface TypeDemandeStepProps {
  typeDemandeId: string;
  typeDemandes: TypeDemande[];
  loadingTypeDemandes: boolean;
  loading: boolean;
  selectedTypeDemande: TypeDemande | null;
  isNouveauPermis: boolean;
  onTypeDemandeChange: (value: string) => void;
  onBack: () => void;
  onNextClick: () => void;
}

export const TypeDemandeStep: React.FC<TypeDemandeStepProps> = ({
  typeDemandeId,
  typeDemandes,
  loadingTypeDemandes,
  loading,
  selectedTypeDemande,
  isNouveauPermis,
  onTypeDemandeChange,
  onBack,
  onNextClick,
}) => {
  if (loadingTypeDemandes || loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          py: 8,
          gap: 2
        }}
      >
        <CircularProgress 
          size={50}
          sx={{
            color: 'primary.main',
          }}
        />
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 500,
            color: 'text.secondary',
          }}
        >
          Chargement des types de demande...
        </Typography>
      </Box>
    );
  }

  // Filtrer pour exclure NOUVEAUPERMIS
  const filteredTypeDemandes = typeDemandes.filter(
    (typeDemande) => typeDemande.name.toUpperCase() !== 'NOUVEAUPERMIS'
  );

  // Afficher un toast quand un type de demande est sélectionné
  useEffect(() => {
    if (selectedTypeDemande) {
      const message = isNouveauPermis
        ? 'Ce type de demande nécessite la sélection d\'une auto-école et d\'une formation.'
        : 'Ce type de demande ne nécessite pas d\'auto-école ni de formation.';

      toast.custom(
        (t) => (
          <Box
            onClick={() => toast.dismiss(t.id)}
            sx={{
              p: 3,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              cursor: 'pointer',
              minWidth: '300px',
              maxWidth: '500px',
              animation: t.visible
                ? 'slideInRight 0.3s ease-out forwards'
                : 'slideOutRight 0.3s ease-in forwards',
              '@keyframes slideInRight': {
                '0%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
              '@keyframes slideOutRight': {
                '0%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: isNouveauPermis ? '#1976d2' : '#ff9800',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Info
                sx={{
                  color: 'text.secondary',
                  fontSize: 24,
                  mt: 0.5,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  {message}
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
        {
          position: 'bottom-right',
          duration: 5000,
        }
      );
    }
  }, [selectedTypeDemande, isNouveauPermis]);

  // Libellé affiché : "FICHE D'ENREGISTREMENT" pour le type FICHEENREGISTREMENT
  const getDisplayName = (name: string) => {
    const normalized = name.replace(/\s+/g, '').replace(/'/g, '').toUpperCase();
    if (normalized === 'FICHEENREGISTREMENT' || normalized === "FICHED'ENREGISTREMENT") {
      return "FICHE D'ENREGISTREMENT";
    }
    return name;
  };

  if (filteredTypeDemandes.length === 0) {
    return (
      <Box 
        sx={{ 
          py: 8, 
          textAlign: 'center',
          p: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
          border: '2px dashed',
          borderColor: 'divider',
        }}
      >
        <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
          Aucun type de demande disponible
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'stretch',
          '& > *': {
            flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(20% - 16px)' },
            minWidth: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(20% - 16px)' },
            maxWidth: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(20% - 16px)' },
          },
        }}
      >
        {filteredTypeDemandes.map((typeDemande) => {
          const isSelected = typeDemandeId === typeDemande.id;
          return (
            <Card
              key={typeDemande.id}
              onClick={() => !loading && onTypeDemandeChange(typeDemande.id)}
              sx={{
                cursor: loading ? 'default' : 'pointer',
                position: 'relative',
                height: 120,
                minHeight: 120,
                borderRadius: 0,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(66, 165, 245, 0.04) 100%)'
                  : '#ffffff',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(25, 118, 210, 0.15)'
                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: isSelected
                    ? '0 6px 16px rgba(25, 118, 210, 0.2)'
                    : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(66, 165, 245, 0.06) 100%)'
                    : '#ffffff',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 3,
                  height: '100%',
                  background: isSelected ? '#1976d2' : 'transparent',
                },
              }}
            >
              <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, boxSizing: 'border-box' }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between',
                    mb: 1,
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 0,
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(66, 165, 245, 0.1) 100%)'
                        : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Description 
                      sx={{ 
                        fontSize: 18,
                        color: isSelected ? 'primary.main' : 'text.secondary',
                      }} 
                    />
                  </Box>
                  {isSelected ? (
                    <CheckCircle 
                      sx={{ 
                        fontSize: 18,
                        color: 'primary.main',
                      }} 
                    />
                  ) : (
                    <RadioButtonUnchecked 
                      sx={{ 
                        fontSize: 18,
                        color: 'text.disabled',
                      }} 
                    />
                  )}
                </Box>
                <Typography 
                  variant="body2" 
                  component="div" 
                  sx={{ 
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'primary.main' : 'text.primary',
                    lineHeight: 1.4,
                    fontSize: '0.8rem',
                    flex: 1,
                    minHeight: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {getDisplayName(typeDemande.name)}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
        >
          Retour
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={onNextClick}
          disabled={!typeDemandeId || loadingTypeDemandes}
        >
          Suivant
        </Button>
      </Box>
    </Box>
  );
};

