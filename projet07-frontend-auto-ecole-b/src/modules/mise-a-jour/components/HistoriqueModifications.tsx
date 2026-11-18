import React from 'react';
import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { formatDate, formatDateHeure } from '../../renouvellement/components/RechercheTitulaire';
import { modificationService, type LigneModification, type ModificationDemande, type StatutModification } from '../services/modification.service';

export const STATUTS_MODIFICATION: Record<StatutModification, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
  BROUILLON: { label: 'Brouillon', color: 'default' },
  SOUMISE: { label: 'Soumise / En attente', color: 'warning' },
  APPROUVEE: { label: 'Approuvée', color: 'success' },
  REJETEE: { label: 'Rejetée', color: 'error' },
};

/** Affiche une valeur de façon lisible (dates au format JJ/MM/AAAA, lieu détaillé). */
export const afficherValeur = (l: Pick<LigneModification, 'champ' | 'details'>, valeur: string | null, nouvelle = false) => {
  if (valeur == null || valeur === '') return '—';
  if (l.champ === 'date_naissance') return formatDate(valeur);
  if (nouvelle && l.champ === 'lieu_naissance' && l.details) {
    return [l.details.ville, l.details.province, l.details.pays].filter(Boolean).join(', ');
  }
  return valeur;
};

/** Liste des champs corrigés d'une demande : « Champ : ancienne → nouvelle ». */
export const ListeCorrections: React.FC<{ lignes: LigneModification[] }> = ({ lignes }) => (
  <Box component="ul" sx={{ m: 0, pl: 2 }}>
    {lignes.map((l) => (
      <li key={l.id}>
        <Typography variant="body2" component="span">
          {l.champ_libelle} : {afficherValeur(l, l.ancienne_valeur)} → <strong>{afficherValeur(l, l.nouvelle_valeur, true)}</strong>
        </Typography>
      </li>
    ))}
  </Box>
);

export const ouvrirJustificatif = async (id: string) => {
  try {
    await modificationService.ouvrirJustificatif(id);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Impossible d’ouvrir le justificatif.');
  }
};

interface Props {
  demandes: ModificationDemande[];
  /** Id de l'agent connecté (actions sur ses propres brouillons). */
  agentId?: string | null;
  onModifier: (d: ModificationDemande) => void;
  onSoumettre: (d: ModificationDemande) => void;
  onSupprimer: (d: ModificationDemande) => void;
}

/** Historique des modifications du titulaire (non modifiable, sauf brouillons de l'agent). */
const HistoriqueModifications: React.FC<Props> = ({ demandes, agentId, onModifier, onSoumettre, onSupprimer }) => (
  <Box sx={{ overflowX: 'auto' }}>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Demande</TableCell>
          <TableCell>Corrections demandées</TableCell>
          <TableCell>Motif</TableCell>
          <TableCell>Statut</TableCell>
          <TableCell>Demandeur</TableCell>
          <TableCell>Validateur / décision</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {demandes.length === 0 && (
          <TableRow><TableCell colSpan={7} align="center">Aucune demande de modification.</TableCell></TableRow>
        )}
        {demandes.map((d) => {
          const brouillonAgent = d.statut === 'BROUILLON' && (!agentId || d.demandeur_id === agentId);
          return (
            <TableRow key={d.id}>
              <TableCell>
                {d.numero}
                <br />
                <Typography variant="caption" color="text.secondary">
                  {d.date_soumission ? `Soumise le ${formatDateHeure(d.date_soumission)}` : `Créée le ${formatDateHeure(d.created_at)}`}
                </Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 260 }}><ListeCorrections lignes={d.lignes} /></TableCell>
              <TableCell sx={{ maxWidth: 220 }}>{d.motif || '—'}</TableCell>
              <TableCell>
                <Chip size="small" label={STATUTS_MODIFICATION[d.statut].label} color={STATUTS_MODIFICATION[d.statut].color} />
              </TableCell>
              <TableCell>{d.demandeur_email ?? '—'}</TableCell>
              <TableCell>
                {d.validateur_email ? (
                  <>
                    {d.validateur_email}
                    <br />
                    <Typography variant="caption" color="text.secondary">{formatDateHeure(d.date_decision)}</Typography>
                    {d.motif_decision && (
                      <Typography variant="caption" display="block">
                        {d.statut === 'REJETEE' ? 'Motif du rejet : ' : 'Commentaire : '}{d.motif_decision}
                      </Typography>
                    )}
                  </>
                ) : '—'}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {d.a_justificatif && (
                    <Tooltip title={d.justificatif_nom ?? ''}>
                      <Button size="small" onClick={() => ouvrirJustificatif(d.id)}>Justificatif</Button>
                    </Tooltip>
                  )}
                  {brouillonAgent && (
                    <>
                      <Button size="small" onClick={() => onModifier(d)}>Modifier</Button>
                      <Button size="small" variant="contained" onClick={() => onSoumettre(d)}>Soumettre</Button>
                      <Button size="small" color="error" onClick={() => onSupprimer(d)}>Supprimer</Button>
                    </>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </Box>
);

export default HistoriqueModifications;
