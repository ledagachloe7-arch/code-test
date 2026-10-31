import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  Skeleton,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { DocumentTextIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import DashboardSection from './DashboardSection';
import { useDashboardData } from '../context/DashboardDataContext';
import type { DossierStatutListEntry } from '../types';
import { ROUTES } from '../../../shared/constants';
import { useDossierPhoto } from '../../reception/tables/ReceptionDossierTypeTable/hooks/useDossierPhoto';

const STATUT_EN_ATTENTE_PAIEMENT = 'EN_ATTENTE_PAIEMENT';

function isEnAttentePaiement(statut: string): boolean {
  return statut.toUpperCase() === STATUT_EN_ATTENTE_PAIEMENT;
}

function isEnvoiImpression(statut: string): boolean {
  const upper = statut.toUpperCase();
  return upper.includes('ENVOI DE DOSSIER POUR IMPRESSION') || upper.includes('IMPRESSION');
}

/** Statut contient "en_attent" (ex. en_attente) et n'est ni paiement ni envoi impression. */
function isEnAttente(statut: string): boolean {
  const upper = statut.toUpperCase();
  return upper.includes('EN_ATTENT') && !isEnAttentePaiement(statut) && !isEnvoiImpression(statut);
}

function getCandidatLabel(d: DossierStatutListEntry): string {
  const p = d.candidat?.personne;
  if (p?.nom || p?.prenom) {
    return [p.prenom, p.nom].filter(Boolean).join(' ').trim() || '—';
  }
  if (d.candidat?.numero_candidat) return `N° ${d.candidat.numero_candidat}`;
  return '—';
}

/** Affiche le type de demande avec mots espacés pour certains codes (ex. NOUVEAUPERMIS → Nouveau permis). */
function formatTypeDemandeDisplay(raw: string): string {
  const upper = raw.toUpperCase().replace(/\s+/g, '');
  if (upper === 'NOUVEAUPERMIS') return 'Nouveau permis';
  if (upper === 'FICHEENREGISTRMENT' || upper === 'FICHEENREGISTREMENT') return 'Fiche enregistrement';
  return raw.trim();
}

function getTypeDemandeLabel(d: DossierStatutListEntry): string {
  const name = d.type_demande?.name?.trim();
  return name ? formatTypeDemandeDisplay(name) : '—';
}

function getCategoriePermisLabel(d: DossierStatutListEntry): string {
  const fp = d.formation?.type_permis;
  if (fp?.libelle) return fp.libelle;
  if (d.referentiel?.libelle) return d.referentiel.libelle;
  if (fp?.code) return fp.code;
  if (d.referentiel?.code) return d.referentiel.code;
  return '—';
}

/** Affiche le statut en espaçant les mots liés par "_" (ex. EN_ATTENTE_PAIEMENT → EN ATTENTE PAIEMENT). */
function formatStatutDisplay(statut: string): string {
  return (statut || '').trim().replace(/_/g, ' ');
}

/** Couleur MUI pour le Chip de statut : étape finale = success, paiement = warning, en attente = info. */
function getStatutChipColor(statut: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
  const upper = (statut || '').toUpperCase();
  if (upper.includes('IMPRESSION') || upper.includes('ENVOI DE DOSSIER POUR IMPRESSION')) return 'success'; // Étape finale
  if (upper === 'EN_ATTENTE_PAIEMENT') return 'warning';
  if (upper.includes('EN_ATTENT')) return 'info';
  return 'default';
}

/** Skeleton d'une carte dossier (photo + lignes + chip). */
const DossierCardSkeleton: React.FC<{ variant: 'default' | 'sidebar' }> = ({ variant }) => {
  const isCompact = variant === 'sidebar';
  const photoSize = isCompact ? { width: 48, height: 60 } : { width: 64, height: 80 };
  return (
    <Card sx={{ boxShadow: 0, borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <CardContent sx={{ py: isCompact ? 1.5 : 2, '&:last-child': { pb: isCompact ? 1.5 : 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton
            variant="rectangular"
            width={photoSize.width}
            height={photoSize.height}
            sx={{ borderRadius: 1, flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Skeleton variant="text" width="70%" height={22} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="50%" height={18} sx={{ mb: 0.25 }} />
            <Skeleton variant="text" width="45%" height={18} sx={{ mb: 0.5 }} />
            <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

/** Carte d'un dossier avec photo justificative (photo d'identité) si présente */
const DossierEnAttenteCard: React.FC<{
  d: DossierStatutListEntry;
  variant: 'default' | 'sidebar';
}> = ({ d, variant }) => {
  const { photoUrl, loading: loadingPhoto } = useDossierPhoto(d.id);
  const isCompact = variant === 'sidebar';
  const photoSize = isCompact ? { width: 48, height: 60 } : { width: 64, height: 80 };

  return (
    <Card sx={{ boxShadow: 0, borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <CardActionArea component={Link} to={ROUTES.RECEPTION_DETAILS.replace(':id', d.id)}>
        <CardContent sx={{ py: isCompact ? 1.5 : 2, '&:last-child': { pb: isCompact ? 1.5 : 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexShrink: 0 }}>
              {loadingPhoto && !photoUrl ? (
                <Skeleton variant="rectangular" width={photoSize.width} height={photoSize.height} sx={{ borderRadius: 1 }} />
              ) : photoUrl ? (
                <Box
                  component="img"
                  src={photoUrl}
                  alt="Photo candidat"
                  sx={{
                    width: photoSize.width,
                    height: photoSize.height,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: photoSize.width,
                    height: photoSize.height,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    color: 'text.disabled',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Photo absente"
                >
                  <UserCircleIcon className={isCompact ? 'w-8 h-8' : 'w-10 h-10'} />
                </Box>
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {getCandidatLabel(d)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }} noWrap title={getTypeDemandeLabel(d)}>
                Type : {getTypeDemandeLabel(d)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" noWrap title={getCategoriePermisLabel(d)}>
                Permis : {getCategoriePermisLabel(d)}
              </Typography>
              <Chip
                label={formatStatutDisplay(d.statut)}
                size="small"
                color={getStatutChipColor(d.statut)}
                variant="filled"
                sx={{ mt: 0.5, fontWeight: 500, fontSize: '0.7rem' }}
              />
              {d.autoEcoleNom && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }} noWrap>
                  {d.autoEcoleNom}
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export interface DossiersEnAttenteListProps {
  /** "sidebar" = affichage compact dans la barre latérale droite */
  variant?: 'default' | 'sidebar';
}

function DossiersEnAttenteList({ variant = 'default' }: DossiersEnAttenteListProps): React.ReactElement {
  const { adminData, loadingAdmin } = useDashboardData();
  const items = adminData?.dossiersEnAttente ?? [];
  const loading = loadingAdmin;

  const enAttentePaiement = items.filter((d) => isEnAttentePaiement(d.statut));
  const envoiImpression = items.filter((d) => isEnvoiImpression(d.statut));
  const enAttente = items.filter((d) => isEnAttente(d.statut));
  const hasAny =
    enAttentePaiement.length > 0 || envoiImpression.length > 0 || enAttente.length > 0;
  const subtitle = loading
    ? 'Chargement...'
    : !hasAny
      ? 'Aucun dossier en attente de paiement, en envoi pour impression ou en attente.'
      : `${enAttentePaiement.length} en attente de paiement, ${envoiImpression.length} en envoi pour impression, ${enAttente.length} en attente`;

  const renderList = (list: DossierStatutListEntry[], emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {emptyMessage}
        </Typography>
      );
    }
    return (
      <Stack spacing={1.5}>
        {list.map((d) => (
          <DossierEnAttenteCard key={d.id} d={d} variant={variant} />
        ))}
      </Stack>
    );
  };

  const content = (
    <>
      {loading ? (
        <Stack spacing={1.5}>
          <Box>
            <Skeleton variant="text" width={160} height={22} sx={{ mb: 0.5 }} />
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <DossierCardSkeleton variant={variant} />
              </Box>
            ))}
          </Box>
        </Stack>
      ) : !hasAny ? (
        <Typography variant="body2" color="text.secondary">Aucun dossier à afficher.</Typography>
      ) : (
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              En attente de paiement ({enAttentePaiement.length})
            </Typography>
            {renderList(enAttentePaiement, 'Aucun.')}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              Envoi pour impression ({envoiImpression.length})
            </Typography>
            {renderList(envoiImpression, 'Aucun.')}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              En attente ({enAttente.length})
            </Typography>
            {renderList(enAttente, 'Aucun.')}
          </Box>
        </Stack>
      )}
    </>
  );

  if (variant === 'sidebar') {
    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <DocumentTextIcon className="w-5 h-5" style={{ color: 'inherit', flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Dossiers en attente
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        </Stack>
        {content}
      </Box>
    );
  }

  return (
    <DashboardSection
      title="Dossiers en attente (paiement, envoi impression, en_attente)"
      subtitle={subtitle}
      icon={<DocumentTextIcon className="w-6 h-6" style={{ color: 'inherit' }} />}
    >
      {content}
    </DashboardSection>
  );
};

export default DossiersEnAttenteList;
