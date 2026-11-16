import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Chip, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeftIcon, ChevronRightIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '../../../shared/constants';
import NouvelleDemandeePage from './NouvelleDemandeePage';

/**
 * Permis de conduire : circuits Permis rose / Permis vert.
 * Chaque sous-circuit ouvre le parcours existant de « Nouvelle demande », limité à ses types de demande.
 * Pour ajouter un sous-circuit : une entrée dans `sousCircuits` (clé = nom du type de demande en base).
 */
interface SousCircuit {
  id: string;
  libelle: string;
  description: string;
  /**
   * Clés de type de demande (normalisées, ex. 'DUPLICATA'). Tableau constant : sert de dépendance React.
   * Absent = sous-circuit pas encore branché (affiché « À venir », non cliquable).
   */
  typesDemande?: string[];
}

interface Circuit {
  id: 'rose' | 'vert';
  libelle: string;
  description: string;
  couleur: string;
  sousCircuits: SousCircuit[];
}

/** Sous-circuits communs : Duplicata, Mise à jour, Renouvellement, puis un sous-circuit propre au circuit. */
const sousCircuitsCommuns = (support: string, duplicata?: string[]): SousCircuit[] => [
  { id: 'duplicata', libelle: 'Duplicata', description: `Duplicata ${support}.`, typesDemande: duplicata },
  { id: 'mise-a-jour', libelle: 'Mise à jour', description: `Correction des informations ${support}.` },
  { id: 'renouvellement', libelle: 'Renouvellement', description: `Renouvellement ${support}.` },
];

const CIRCUITS: Circuit[] = [
  {
    id: 'rose',
    libelle: 'Permis rose',
    description: 'Permis de conduire national',
    couleur: '#c2185b',
    sousCircuits: [
      ...sousCircuitsCommuns('du permis rose', ['DUPLICATA']),
      {
        id: 'informatisation',
        libelle: 'Informatisation permis de conduire',
        description: 'Informatisation d’un permis rose existant.',
      },
    ],
  },
  {
    id: 'vert',
    libelle: 'Permis vert',
    description: "Fiche d'enregistrement",
    couleur: '#2e7d32',
    sousCircuits: [
      ...sousCircuitsCommuns("de la fiche d'enregistrement", ['DUPLICATAFICHEENREGISTREMENT']),
      {
        id: 'nouvelle-fiche',
        libelle: "Création d'une nouvelle fiche",
        description: "Création d'une nouvelle fiche d'enregistrement.",
      },
    ],
  },
];

const NAVY = '#0d4a7a';

const CarteChoix: React.FC<{
  titre: string;
  description: string;
  couleur: string;
  badge?: string;
  /** Non cliquable, grisé, avec le badge « À venir ». */
  aVenir?: boolean;
  onClick: () => void;
}> = ({ titre, description, couleur, badge, aVenir, onClick }) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      ...(aVenir && { opacity: 0.55, pointerEvents: 'none' }),
      borderRadius: 2,
      borderColor: alpha(couleur, 0.35),
      borderLeft: `6px solid ${couleur}`,
      transition: 'box-shadow .15s, transform .15s',
      '&:hover': { boxShadow: `0 6px 20px ${alpha(couleur, 0.18)}`, transform: 'translateY(-1px)' },
    }}
  >
    <CardActionArea onClick={onClick} disabled={aVenir} sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(couleur, 0.12),
            color: couleur,
          }}
        >
          <IdentificationIcon style={{ width: 30, height: 30 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: couleur, lineHeight: 1.25 }}>
            {titre}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
          {aVenir && <Chip label="À venir" size="small" variant="outlined" sx={{ mt: 1 }} />}
          {badge && <Chip label={badge} size="small" sx={{ mt: 1, bgcolor: alpha(couleur, 0.1), color: couleur, fontWeight: 600 }} />}
        </Box>
        {!aVenir && <ChevronRightIcon style={{ width: 22, color: couleur, flexShrink: 0 }} />}
      </CardContent>
    </CardActionArea>
  </Card>
);

const CircuitsPermisPage: React.FC = () => {
  const navigate = useNavigate();
  const [circuit, setCircuit] = useState<Circuit | null>(null);
  const [sousCircuit, setSousCircuit] = useState<SousCircuit | null>(null);

  // Sous-circuit choisi : parcours existant, inchangé, limité aux types du sous-circuit.
  if (circuit && sousCircuit?.typesDemande) {
    return (
      <NouvelleDemandeePage
        key={`${circuit.id}:${sousCircuit.id}`}
        typesAutorises={sousCircuit.typesDemande ?? []}
        titre={`${circuit.libelle} — ${sousCircuit.libelle}`}
        sousTitre={sousCircuit.description}
        onRetour={() => setSousCircuit(null)}
      />
    );
  }

  const enTete = circuit
    ? { titre: circuit.libelle, sousTitre: 'Choisissez le sous-circuit', retour: () => setCircuit(null) }
    : { titre: 'Permis de conduire', sousTitre: 'Choisissez le circuit : permis rose ou permis vert', retour: () => navigate(ROUTES.DASHBOARD) };

  return (
    <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 3,
          p: { xs: 1.75, sm: 2 },
          borderRadius: 2,
          border: `1px solid ${alpha(NAVY, 0.14)}`,
          background: `linear-gradient(142deg, ${alpha(NAVY, 0.09)} 0%, ${alpha('#fff', 0.92)} 48%, ${alpha(NAVY, 0.04)} 100%)`,
          boxShadow: `0 4px 20px ${alpha(NAVY, 0.08)}`,
        }}
      >
        <IconButton size="small" onClick={enTete.retour} sx={{ color: NAVY }} aria-label="Retour">
          <ArrowLeftIcon style={{ width: 20 }} />
        </IconButton>
        <IdentificationIcon style={{ width: 32, height: 32, color: circuit?.couleur ?? NAVY }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: circuit?.couleur ?? NAVY, letterSpacing: -0.02 }}>
            {enTete.titre}
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(NAVY, 0.78), mt: 0.25 }}>
            {enTete.sousTitre}
          </Typography>
        </Box>
      </Box>

      {circuit && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label="Permis de conduire" size="small" variant="outlined" onClick={() => setCircuit(null)} />
          <Chip label={circuit.libelle} size="small" sx={{ bgcolor: alpha(circuit.couleur, 0.12), color: circuit.couleur, fontWeight: 600 }} />
        </Stack>
      )}

      <Grid container spacing={2}>
        {circuit
          ? circuit.sousCircuits.map((sc) => (
              <Grid item xs={12} md={6} key={sc.id}>
                <CarteChoix
                  titre={sc.libelle}
                  description={sc.description}
                  couleur={circuit.couleur}
                  aVenir={!sc.typesDemande}
                  onClick={() => setSousCircuit(sc)}
                />
              </Grid>
            ))
          : CIRCUITS.map((c) => (
              <Grid item xs={12} md={6} key={c.id}>
                <CarteChoix
                  titre={c.libelle}
                  description={c.description}
                  couleur={c.couleur}
                  badge={`${c.sousCircuits.length} sous-circuit${c.sousCircuits.length > 1 ? 's' : ''}`}
                  onClick={() => setCircuit(c)}
                />
              </Grid>
            ))}
      </Grid>
    </Container>
  );
};

export default CircuitsPermisPage;
