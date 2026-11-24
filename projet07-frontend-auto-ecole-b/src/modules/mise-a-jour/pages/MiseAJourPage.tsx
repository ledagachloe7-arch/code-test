import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../../../store';
import RechercheTitulaire, { formatDate } from '../../renouvellement/components/RechercheTitulaire';
import type { SupportPermis, TitulaireResultat } from '../../renouvellement/services/renouvellement.service';
import { modificationService, type FicheTitulaire, type ModificationDemande } from '../services/modification.service';
import FormulaireModification from '../components/FormulaireModification';
import HistoriqueModifications from '../components/HistoriqueModifications';
import DemandesAValider from '../components/DemandesAValider';

interface MiseAJourPageProps {
  titre?: string;
  couleur?: string;
  onRetour?: () => void;
  /** ROSE = permis rose, VERT = fiche d'enregistrement : recherche et demandes à valider limitées à ce support. */
  support?: SupportPermis;
  /** Titulaire déjà identifié (guichet usager) : sa fiche est chargée directement, sans recherche. */
  titulaireInitial?: TitulaireResultat;
  /** Guichet usager : demande créée → ajoutée au paiement groupé. */
  onDemandeCreee?: (demande: ModificationDemande) => void;
}

const Info: React.FC<{ label: string; valeur: React.ReactNode }> = ({ label, valeur }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body1" fontWeight={600}>{valeur || '—'}</Typography>
  </Grid>
);

/**
 * Mise à jour des informations personnelles : l'agent soumet une demande (champ, nouvelle valeur, motif, justificatif) ;
 * un responsable habilité, distinct du demandeur, l'approuve ou la rejette.
 */
const MiseAJourPage: React.FC<MiseAJourPageProps> = ({ titre = 'Mise à jour des informations personnelles', couleur, onRetour, support, titulaireInitial, onDemandeCreee }) => {
  const { user } = useAppStore();
  const [onglet, setOnglet] = useState<'demande' | 'validation'>('demande');
  const [nbAValider, setNbAValider] = useState(0);

  const [selection, setSelection] = useState<TitulaireResultat | null>(null);
  const [fiche, setFiche] = useState<FicheTitulaire | null>(null);
  const [chargement, setChargement] = useState(false);
  const [brouillon, setBrouillon] = useState<ModificationDemande | null>(null);

  const compterAValider = useCallback(async () => {
    try {
      setNbAValider((await modificationService.aValider(support)).data.length);
    } catch {
      /* compteur indicatif */
    }
  }, [support]);

  useEffect(() => {
    compterAValider();
  }, [compterAValider]);

  const chargerFiche = useCallback(async (t: TitulaireResultat) => {
    setSelection(t);
    setBrouillon(null);
    setChargement(true);
    try {
      setFiche(await modificationService.fiche(t.hPermisId));
    } catch (err) {
      setFiche(null);
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (titulaireInitial) void chargerFiche(titulaireInitial);
  }, [titulaireInitial, chargerFiche]);

  const rafraichir = async () => {
    setBrouillon(null);
    if (selection) await chargerFiche(selection);
    compterAValider();
  };

  const soumettre = async (d: ModificationDemande) => {
    try {
      toast.success((await modificationService.soumettre(d.id)).message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
    await rafraichir();
  };

  const supprimer = async (d: ModificationDemande) => {
    if (!window.confirm(`Supprimer le brouillon ${d.numero} ?`)) return;
    try {
      await modificationService.supprimerBrouillon(d.id);
      toast.success('Brouillon supprimé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
    await rafraichir();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {onRetour && (
          <IconButton size="small" onClick={onRetour} aria-label="Retour" sx={{ color: couleur }}>
            <ArrowLeftIcon style={{ width: 20 }} />
          </IconButton>
        )}
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: couleur }}>
          {titre}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Aucune modification directe : chaque changement fait l'objet d'une demande motivée avec justificatif, validée par un
        responsable habilité distinct du demandeur. L'ancienne valeur est conservée dans l'historique.
      </Typography>

      <Tabs value={onglet} onChange={(_, v) => { setOnglet(v); if (v === 'demande') compterAValider(); }} sx={{ mb: 3 }}>
        <Tab value="demande" label="Demande de modification" />
        <Tab
          value="validation"
          label={
            <Badge color="warning" badgeContent={nbAValider} sx={{ '& .MuiBadge-badge': { right: -14 } }}>
              Demandes à valider
            </Badge>
          }
        />
      </Tabs>

      {onglet === 'validation' ? (
        <DemandesAValider support={support} onDecision={() => { compterAValider(); if (selection) chargerFiche(selection); }} />
      ) : (
        <>
          {!titulaireInitial && <RechercheTitulaire onSelect={chargerFiche} selectionCle={selection?.cle} support={support} />}

          {chargement && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}

          {!chargement && fiche && (
            <>
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Informations actuelles du titulaire</Typography>
                <Grid container spacing={2}>
                  <Info label="Nom" valeur={fiche.titulaire.nom} />
                  <Info label="Prénom" valeur={fiche.titulaire.prenom} />
                  <Info
                    label="Date de naissance"
                    valeur={`${formatDate(fiche.titulaire.date_naissance)}${fiche.titulaire.age != null ? ` (${fiche.titulaire.age} ans)` : ''}`}
                  />
                  <Info label="Lieu de naissance" valeur={fiche.titulaire.lieu_naissance} />
                  <Info label="Nationalité" valeur={fiche.titulaire.nationalite} />
                  <Info label="Pièce d'identité" valeur={fiche.titulaire.numero_identite} />
                </Grid>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                  {fiche.permis.map((p) => (
                    <Chip key={p.h_permis_id} size="small" variant="outlined" label={`${p.categorie} · ${p.numero_permis ?? '—'}`} />
                  ))}
                </Stack>
              </Paper>

              <FormulaireModification
                fiche={fiche}
                brouillon={brouillon}
                onTermine={(d) => {
                  if (d) onDemandeCreee?.(d);
                  void rafraichir();
                }}
                onAnnulerBrouillon={() => setBrouillon(null)}
              />

              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Historique des modifications</Typography>
                <HistoriqueModifications
                  demandes={fiche.demandes}
                  agentId={user?.id}
                  onModifier={(d) => { setBrouillon(d); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onSoumettre={soumettre}
                  onSupprimer={supprimer}
                />
              </Paper>
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default MiseAJourPage;
