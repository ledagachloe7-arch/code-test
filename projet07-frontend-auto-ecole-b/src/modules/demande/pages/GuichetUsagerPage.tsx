import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import RechercheTitulaire, { formatDate } from '../../renouvellement/components/RechercheTitulaire';
import {
  renouvellementService,
  type EtatRenouvellement,
  type SupportPermis,
  type TitulaireResultat,
} from '../../renouvellement/services/renouvellement.service';
import NouvelleDemandeePage from './NouvelleDemandeePage';
import RenouvellementPage from '../../renouvellement/pages/RenouvellementPage';
import MiseAJourPage from '../../mise-a-jour/pages/MiseAJourPage';
import InformatisationPage from '../../informatisation/pages/InformatisationPage';
import PaiementGroupe from '../components/PaiementGroupe';
import type { CommandeGuichet, ElementPanier } from '../services/guichet.service';

type ActionId = 'digitalisation' | 'renouvellement' | 'mise-a-jour' | 'informatisation' | 'conversion';

interface Action {
  id: ActionId;
  libelle: string;
  /** Non branché : bouton grisé « À venir ». */
  aVenir?: boolean;
}

interface Props {
  titre: string;
  couleur: string;
  support: SupportPermis;
  /** Types de demande de la digitalisation (ex. ['DUPLICATA'] pour le rose). */
  typesDigitalisation: string[];
  onRetour: () => void;
}

const Info: React.FC<{ label: string; valeur?: React.ReactNode }> = ({ label, valeur }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body1" fontWeight={600}>{valeur || '—'}</Typography>
  </Grid>
);

/**
 * Guichet usager (sous-circuit « Digitalisation du permis ») : l'agent recherche l'usager, voit toutes ses informations
 * et ses catégories, puis choisit ce que l'usager vient faire. Chaque choix ouvre un onglet avec l'écran existant,
 * déjà positionné sur cet usager (pas de nouvelle recherche).
 */
const GuichetUsagerPage: React.FC<Props> = ({ titre, couleur, support, typesDigitalisation, onRetour }) => {
  const [selection, setSelection] = useState<TitulaireResultat | null>(null);
  const [etat, setEtat] = useState<EtatRenouvellement | null>(null);
  const [chargement, setChargement] = useState(false);
  const [onglets, setOnglets] = useState<ActionId[]>([]);
  const [actif, setActif] = useState<ActionId | null>(null);
  /** Actions à payer ensemble (un seul paiement à la fin). */
  const [panier, setPanier] = useState<ElementPanier[]>([]);
  /** Dossier de digitalisation créé dans l'onglet, et s'il est payé (→ transfert à la biométrie). */
  const [dossierDigitalisation, setDossierDigitalisation] = useState<string | null>(null);
  const [dossiersPayes, setDossiersPayes] = useState<string[]>([]);

  const ajouterAuPanier = useCallback((element: ElementPanier) => {
    setPanier((p) => (p.some((e) => e.type === element.type && e.objet_id === element.objet_id) ? p : [...p, element]));
    toast.success(`${element.libelle} : ajouté au paiement groupé.`);
  }, []);

  const actions: Action[] = [
    { id: 'digitalisation', libelle: 'Digitaliser' },
    { id: 'renouvellement', libelle: 'Renouveler' },
    { id: 'mise-a-jour', libelle: 'Mise à jour' },
    ...(support === 'ROSE'
      ? ([
          { id: 'informatisation', libelle: 'Informatisation' },
          { id: 'conversion', libelle: 'Conversion', aVenir: true },
        ] as Action[])
      : []),
  ];
  const libelle = (id: ActionId) => actions.find((a) => a.id === id)?.libelle ?? id;

  const choisirUsager = useCallback(async (t: TitulaireResultat) => {
    setSelection(t);
    setOnglets([]);
    setActif(null);
    setPanier([]);
    setDossierDigitalisation(null);
    setDossiersPayes([]);
    setChargement(true);
    try {
      setEtat((await renouvellementService.etat(t.hPermisId)).etat);
    } catch (err) {
      setEtat(null);
      toast.error(err instanceof Error ? err.message : 'Impossible de charger les informations de l’usager.');
    } finally {
      setChargement(false);
    }
  }, []);

  const ouvrir = (id: ActionId) => {
    setOnglets((o) => (o.includes(id) ? o : [...o, id]));
    setActif(id);
  };

  const fermer = (id: ActionId) => {
    const reste = onglets.filter((o) => o !== id);
    setOnglets(reste);
    if (actif === id) setActif(reste[reste.length - 1] ?? null);
  };

  /** Paiement confirmé : panier vidé, informations rechargées, onglet renouvellement (périmé) fermé. */
  const apresPaiement = async (commande: CommandeGuichet) => {
    setPanier([]);
    const payes = commande.lignes.filter((l) => l.type === 'DIGITALISATION' && l.statut === 'PAYE').map((l) => l.objet_id);
    setDossiersPayes((d) => [...d, ...payes]);
    setOnglets((o) => o.filter((id) => id !== 'renouvellement'));
    // Dossier de digitalisation payé : on ramène l'agent sur son onglet pour le transfert à la biométrie.
    if (dossierDigitalisation && payes.includes(dossierDigitalisation)) {
      setActif('digitalisation');
      toast('Digitalisation payée : transférez maintenant le dossier à la biométrie (onglet Digitaliser).', { icon: '➡️', duration: 8000 });
    } else {
      setActif((a) => (a === 'renouvellement' ? null : a));
    }
    if (!selection) return;
    try {
      setEtat((await renouvellementService.etat(selection.hPermisId)).etat);
    } catch {
      /* affichage seulement */
    }
  };

  const numeroPrincipal =selection?.categories.find((c) => c.numero_permis)?.numero_permis ?? undefined;
  const t = etat?.titulaire;

  const contenu = (id: ActionId) => {
    if (!selection) return null;
    const retour = () => fermer(id);
    const sousTitre = `${titre} — ${libelle(id)}`;
    switch (id) {
      case 'digitalisation':
        return (
          <NouvelleDemandeePage
            typesAutorises={typesDigitalisation}
            titre={sousTitre}
            sousTitre="Carte numérique : document déjà délivré, envoyé à la biométrie."
            numeroPermisInitial={numeroPrincipal}
            identiteVerrouillee
            onDossierCree={(dossierId) => {
              setDossierDigitalisation(dossierId);
              ajouterAuPanier({ type: 'DIGITALISATION', objet_id: dossierId, libelle: 'Digitalisation' });
            }}
            paiementGroupeActif
            paiementGroupePaye={Boolean(dossierDigitalisation && dossiersPayes.includes(dossierDigitalisation))}
            onRetour={retour}
          />
        );
      case 'renouvellement':
        return (
          <RenouvellementPage
            titre={sousTitre}
            couleur={couleur}
            support={support}
            titulaireInitial={selection}
            onAjouterAuPaiement={() => ajouterAuPanier({ type: 'RENOUVELLEMENT', libelle: 'Renouvellement' })}
            dansPaiement={panier.some((p) => p.type === 'RENOUVELLEMENT')}
            onRetour={retour}
          />
        );
      case 'mise-a-jour':
        return (
          <MiseAJourPage
            titre={sousTitre}
            couleur={couleur}
            support={support}
            titulaireInitial={selection}
            onDemandeCreee={(d) => ajouterAuPanier({ type: 'MISE_A_JOUR', objet_id: d.id, libelle: `Mise à jour — demande ${d.numero}` })}
            onRetour={retour}
          />
        );
      case 'informatisation':
        return <InformatisationPage titre={sousTitre} couleur={couleur} onRetour={retour} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={onRetour} aria-label="Retour" sx={{ color: couleur }}>
          <ArrowLeftIcon style={{ width: 20 }} />
        </IconButton>
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: couleur }}>
          {titre}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Recherchez l’usager : toutes ses informations s’affichent. Choisissez ensuite ce qu’il vient faire ; chaque choix
        s’ouvre dans un onglet, déjà positionné sur cet usager. L’usager peut tout faire en même temps : chaque action
        s’ajoute au paiement groupé, en bas de page, et il paie tout en une seule fois.
      </Typography>

      <RechercheTitulaire onSelect={choisirUsager} selectionCle={selection?.cle} support={support} />

      {chargement && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {selection && etat && t && !chargement && (
        <>
          <Paper sx={{ p: 2, mb: 3, borderLeft: `6px solid ${couleur}` }}>
            <Typography variant="h6" gutterBottom>
              Informations de l’usager
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Info label="Nom" valeur={t.nom} />
              <Info label="Prénom" valeur={t.prenom} />
              <Info label="Date de naissance" valeur={formatDate(t.date_naissance)} />
              <Info label="Lieu de naissance" valeur={t.lieu_naissance} />
              <Info label="Sexe" valeur={t.sexe} />
              <Info label="Nationalité" valeur={t.nationalite} />
              <Info label="Support" valeur={support === 'VERT' ? 'Fiche d’enregistrement (permis vert)' : 'Permis rose'} />
            </Grid>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Numéro de permis</TableCell>
                    <TableCell>Catégorie</TableCell>
                    <TableCell>Obtention</TableCell>
                    <TableCell>Expiration</TableCell>
                    <TableCell>Situation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {etat.categories.map((c) => (
                    <TableRow key={c.h_permis_id}>
                      <TableCell>{c.numero_permis ?? '—'}</TableCell>
                      <TableCell>{c.categorie}</TableCell>
                      <TableCell>{formatDate(c.date_obtention)}</TableCell>
                      <TableCell>{formatDate(c.date_expiration)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={c.renouvelable ? 'warning' : 'success'}
                          variant="outlined"
                          label={c.renouvelable ? 'À renouveler' : 'Valide'}
                          title={c.message}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {etat.renouvellement_en_attente && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Un renouvellement est en attente de paiement ({etat.renouvellement_en_attente.numero}).
              </Alert>
            )}
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Que vient faire l’usager ?
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {actions.map((a) => (
                <Button
                  key={a.id}
                  variant={actif === a.id ? 'contained' : 'outlined'}
                  disabled={a.aVenir}
                  onClick={() => ouvrir(a.id)}
                  sx={{
                    borderColor: couleur,
                    color: actif === a.id ? '#fff' : couleur,
                    bgcolor: actif === a.id ? couleur : undefined,
                    '&:hover': { bgcolor: actif === a.id ? couleur : alpha(couleur, 0.08), borderColor: couleur },
                  }}
                >
                  {a.libelle}
                  {a.aVenir && ' (à venir)'}
                </Button>
              ))}
            </Stack>
          </Paper>

          {onglets.length > 0 && actif && (
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={actif}
                onChange={(_, v: ActionId) => setActif(v)}
                variant="scrollable"
                sx={{ borderBottom: 1, borderColor: 'divider', '& .Mui-selected': { color: `${couleur} !important` } }}
                TabIndicatorProps={{ style: { backgroundColor: couleur } }}
              >
                {onglets.map((id) => (
                  <Tab
                    key={id}
                    value={id}
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <span>{libelle(id)}</span>
                        <Box
                          component="span"
                          role="button"
                          aria-label={`Fermer ${libelle(id)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            fermer(id);
                          }}
                          sx={{ display: 'inline-flex', borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <XMarkIcon style={{ width: 16 }} />
                        </Box>
                      </Stack>
                    }
                  />
                ))}
              </Tabs>
              {/* Les onglets ouverts restent montés : passer de l'un à l'autre ne perd pas la saisie. */}
              {onglets.map((id) => (
                <Box key={`${selection.cle}:${id}`} sx={{ display: actif === id ? 'block' : 'none' }}>
                  {contenu(id)}
                </Box>
              ))}
            </Paper>
          )}

          <PaiementGroupe
            key={selection.cle}
            hPermisId={selection.hPermisId}
            panier={panier}
            couleur={couleur}
            onRetirer={(i) => setPanier((p) => p.filter((_, j) => j !== i))}
            onPaye={(c) => void apresPaiement(c)}
          />
        </>
      )}
    </Container>
  );
};

export default GuichetUsagerPage;
