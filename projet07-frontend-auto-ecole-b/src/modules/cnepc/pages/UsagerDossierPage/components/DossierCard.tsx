import React, { useState } from 'react';
import { Grid, Chip, Box, Typography, Tooltip, Avatar } from '@mui/material';
import {
  Person, CreditCard, LocationOn, CalendarToday,
  Badge, Flip, ArrowForward, ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { Dossier } from '../../../types/auto-ecole';
import {
  getTypePermisLabel, getTypeDemandeName, getTypeDemandeDisplayName, formatDate,
} from '../utils';

interface DossierCardProps {
  dossier: Dossier;
  isSelected: boolean;
  referentielsCache: Map<string, any>;
  typeDemandeCache: Map<string, any>;
  dossierStatusCache?: Map<string, string>;
  onDossierClick: (dossierId: string) => void;
}

const getDataCategorieItems = (dossier: Dossier): Array<{
  classe: string; ville: string; codification_code: string; valable_du: string; jusqu_au: string;
}> => {
  const d = dossier as any;
  const raw = d.data_categorie ?? d.dataCategorie;
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((item: unknown) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      return {
        classe: String(o.classe ?? ''), ville: String(o.ville ?? ''),
        codification_code: String(o.codification_code ?? ''),
        valable_du: String(o.valable_du ?? ''), jusqu_au: String(o.jusqu_au ?? ''),
      };
    }
    if (typeof item === 'string') {
      try {
        const p = JSON.parse(item) as Record<string, unknown>;
        return {
          classe: String(p.classe ?? ''), ville: String(p.ville ?? ''),
          codification_code: String(p.codification_code ?? ''),
          valable_du: String(p.valable_du ?? ''), jusqu_au: String(p.jusqu_au ?? ''),
        };
      } catch { return { classe: '', ville: '', codification_code: '', valable_du: '', jusqu_au: item }; }
    }
    return { classe: '', ville: '', codification_code: '', valable_du: '', jusqu_au: '' };
  });
};

const isExpired = (jusquAu: string | undefined): boolean => {
  if (!jusquAu?.trim()) return false;
  const date = new Date(jusquAu);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); date.setHours(0, 0, 0, 0);
  return date < today;
};

// ─── Composant face générique ────────────────────────────────────────────────
const Face: React.FC<{ children: React.ReactNode; isBack?: boolean }> = ({ children, isBack }) => (
  <Box
    sx={{
      gridArea: '1 / 1',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      transform: isBack ? 'rotateY(180deg)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRadius: 0,
    }}
  >
    {children}
  </Box>
);

// ─── En-tête partagé ─────────────────────────────────────────────────────────
const CardHeader: React.FC<{
  title: string; subtitle: string; bg?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, bg = 'linear-gradient(135deg,#0d47a1 0%,#1565c0 55%,#1976d2 100%)', right }) => (
  <Box sx={{
    background: bg, px: 2.5, py: 1.4,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexShrink: 0,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <CreditCard sx={{ color: '#fff', fontSize: 22, opacity: 0.85 }} />
      <Box>
        <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2, lineHeight: 1 }}>
          {subtitle}
        </Typography>
        <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 800, letterSpacing: 0.8, lineHeight: 1.3 }}>
          {title}
        </Typography>
      </Box>
    </Box>
    {right}
  </Box>
);

// ─── Pied partagé ────────────────────────────────────────────────────────────
const CardFooter: React.FC<{ left: string; right: string; hint: string; hintIcon: React.ReactNode }> = ({
  left, right, hint, hintIcon,
}) => (
  <Box sx={{
    background: 'linear-gradient(90deg,#0d47a1 0%,#1976d2 100%)',
    px: 2.5, py: 0.8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap',
  }}>
    <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem' }}>{left}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.62rem', fontStyle: 'italic' }}>{hint}</Typography>
      <Box sx={{ color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center' }}>{hintIcon}</Box>
    </Box>
    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.62rem', fontFamily: 'monospace' }}>{right}</Typography>
  </Box>
);

// ─── Composant principal ──────────────────────────────────────────────────────
const DossierCard: React.FC<DossierCardProps> = React.memo(({
  dossier, isSelected, referentielsCache, typeDemandeCache, onDossierClick,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const typePermis = getTypePermisLabel(dossier, referentielsCache);
  const typeDemande = getTypeDemandeDisplayName(getTypeDemandeName(dossier, typeDemandeCache));
  const categories = getDataCategorieItems(dossier);
  const personne = dossier.candidat?.personne;
  const candidat = dossier.candidat;
  const fullName = personne
    ? `${(personne.prenom ?? '').toUpperCase()} ${(personne.nom ?? '').toUpperCase()}`
    : 'N/A';

  const handleClick = () => {
    setIsFlipped(prev => !prev);
    onDossierClick(dossier.id);
  };

  return (
    <Grid item xs={12} sm={6}>
      {/* Conteneur de perspective */}
      <Box sx={{ perspective: '1400px' }}>
        <Box
          onClick={handleClick}
          sx={{
            cursor: 'pointer',
            display: 'grid',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.65s cubic-bezier(0.4,0.2,0.2,1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            boxShadow: isSelected
              ? '0 6px 28px rgba(25,118,210,0.4)'
              : '0 3px 16px rgba(0,0,0,0.16)',
            outline: isSelected ? '2px solid #1976d2' : 'none',
            outlineOffset: 2,
          }}
        >
          {/* ══════════════════════════════════════════
              FACE AVANT — Informations personnelles
          ══════════════════════════════════════════ */}
          <Face>
            <CardHeader
              title="PERMIS DE CONDUIRE"
              subtitle="RÉPUBLIQUE GABONAISE"
            />

            {/* Corps */}
            <Box sx={{
              background: 'linear-gradient(160deg,#fafcff 0%,#f0f4ff 100%)',
              flexGrow: 1, px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              {/* Identité */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Avatar sx={{
                  width: 80, height: 96, borderRadius: 0,
                  bgcolor: '#e3eaf6', border: '2px solid #b0c4de', flexShrink: 0,
                }}>
                  <Person sx={{ color: '#5c7ba0', fontSize: 44 }} />
                </Avatar>

                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{
                    fontWeight: 800, fontSize: '1rem', color: '#0d2a5a',
                    letterSpacing: 0.5, lineHeight: 1.3, mb: 1.5, wordBreak: 'break-word',
                  }}>
                    {fullName}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2 }}>
                    <InfoField icon={<Badge sx={{ fontSize: 14 }} />} label="N° Candidat" value={candidat?.numero_candidat} />
                    <InfoField icon={<Badge sx={{ fontSize: 14 }} />} label="NIP" value={candidat?.nip} />
                    <InfoField
                      icon={<CalendarToday sx={{ fontSize: 14 }} />}
                      label="Date de naissance"
                      value={candidat?.date_naissance ? formatDate(candidat.date_naissance) : undefined}
                    />
                    <InfoField icon={<LocationOn sx={{ fontSize: 14 }} />} label="Lieu de naissance" value={candidat?.lieu_naissance} />
                    <InfoField icon={<Badge sx={{ fontSize: 14 }} />} label="Nationalité" value={candidat?.nationalite} />
                    <InfoField icon={<Badge sx={{ fontSize: 14 }} />} label="Type" value={typeDemande} />
                    {personne?.email && (
                      <InfoField icon={<Badge sx={{ fontSize: 14 }} />} label="Email" value={personne.email} />
                    )}
                    {((personne as any)?.telephone || personne?.contact) && (
                      <InfoField
                        icon={<Badge sx={{ fontSize: 14 }} />}
                        label="Téléphone"
                        value={(personne as any)?.telephone || personne?.contact}
                      />
                    )}
                  </Box>
                </Box>
              </Box>

            </Box>

            <CardFooter
              left={`Délivré le ${formatDate(dossier.date_creation || dossier.created_at)}`}
              right={dossier.id?.slice(0, 8).toUpperCase() ?? ''}
              hint="Voir les catégories"
              hintIcon={<ArrowForward sx={{ fontSize: 12 }} />}
            />
          </Face>

          {/* ══════════════════════════════════════════
              FACE ARRIÈRE — Catégories & permis
          ══════════════════════════════════════════ */}
          <Face isBack>
            {/* En-tête enrichi */}
            <Box sx={{
              background: 'linear-gradient(135deg,#0a2d6b 0%,#0d47a1 55%,#1565c0 100%)',
              px: 2.5, py: 1.4, flexShrink: 0,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CreditCard sx={{ color: '#fff', fontSize: 22, opacity: 0.85, mt: 0.3 }} />
                <Box>
                  {/* Numéro de permis */}
                  <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2, lineHeight: 1 }}>
                    {(dossier as any).numero_permis ? `N° PERMIS — ${(dossier as any).numero_permis}` : 'INFORMATIONS PERMIS'}
                  </Typography>
       
                  {/* Catégorie & type de demande sous le titre */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    
                    <Box sx={{ width: '1px', height: 12, bgcolor: 'rgba(255,255,255,0.3)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        Demande :
                      </Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>
                        {typeDemande}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
              <Tooltip title="Flip la carte">
                <Flip sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 20, flexShrink: 0 }} />
              </Tooltip>
            </Box>

            {/* Corps — tableau */}
            <Box sx={{
              background: 'linear-gradient(160deg,#f5f8ff 0%,#eaf0fb 100%)',
              flexGrow: 1, overflow: 'auto',
            }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                {/* En-tête du tableau */}
                <Box component="thead">
                  <Box component="tr" sx={{ bgcolor: '#1565c0' }}>
                    {['N° Permis', 'Catégorie', 'Lieu d\'obtention', 'Date de création'].map((col) => (
                      <Box
                        key={col}
                        component="th"
                        sx={{
                          px: 1.5, py: 1,
                          textAlign: 'left',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          letterSpacing: 0.8,
                          color: '#fff',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid rgba(255,255,255,0.15)',
                          '&:last-child': { borderRight: 'none' },
                        }}
                      >
                        {col}
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Lignes */}
                <Box component="tbody">
                  {categories.length > 0 ? (
                    categories.map((cat, idx) => {
                      const isPermanent = ['A', 'B'].includes((cat.classe ?? '').trim().toUpperCase());
                      const expired = !isPermanent && isExpired(cat.jusqu_au);
                      return (
                        <Box
                          key={idx}
                          component="tr"
                          sx={{
                            bgcolor: idx % 2 === 0 ? 'rgba(25,118,210,0.04)' : '#fff',
                            borderBottom: '1px solid rgba(176,196,222,0.5)',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          {/* N° Permis */}
                          <Box component="td" sx={{ px: 1.5, py: 1, borderRight: '1px solid rgba(176,196,222,0.4)', verticalAlign: 'middle' }}>
                            <Typography sx={{ fontSize: '0.72rem', color: '#0d2a5a', fontWeight: 700, fontFamily: 'monospace' }}>
                              {(dossier as any).numero_permis || '—'}
                            </Typography>
                          </Box>

                          {/* Catégorie */}
                          <Box component="td" sx={{ px: 1.5, py: 1, borderRight: '1px solid rgba(176,196,222,0.4)', verticalAlign: 'middle' }}>
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28,
                              bgcolor: expired ? '#c62828' : '#1565c0',
                            }}>
                              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '0.78rem' }}>
                                {cat.classe || '?'}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Lieu d'obtention */}
                          <Box component="td" sx={{ px: 1.5, py: 1, borderRight: '1px solid rgba(176,196,222,0.4)', verticalAlign: 'middle' }}>
                            <Typography sx={{ fontSize: '0.72rem', color: '#1a2e4a', fontWeight: 600, wordBreak: 'break-word' }}>
                              {cat.ville || '—'}
                            </Typography>
                            {cat.codification_code && (
                              <Typography sx={{ fontSize: '0.62rem', color: '#7a95b5' }}>
                                {cat.codification_code}
                              </Typography>
                            )}
                            {expired && (
                              <Chip label="EXPIRÉ" size="small" color="error" sx={{ height: 14, fontSize: '0.55rem', fontWeight: 700, mt: 0.3 }} />
                            )}
                          </Box>

                          {/* Date de création */}
                          <Box component="td" sx={{ px: 1.5, py: 1, verticalAlign: 'middle' }}>
                            <Typography sx={{ fontSize: '0.72rem', color: '#1a2e4a', fontWeight: 600 }}>
                              {formatDate(dossier.date_creation || dossier.created_at)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })
                  ) : (
                    <Box component="tr">
                      <Box component="td" colSpan={4} sx={{ px: 2, py: 3, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#7a95b5', fontStyle: 'italic' }}>
                          Aucune catégorie enregistrée
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            <CardFooter
              left={`Délivré le ${formatDate(dossier.date_creation || dossier.created_at)}`}
              right={dossier.id?.slice(0, 8).toUpperCase() ?? ''}
              hint="Voir les infos personnelles"
              hintIcon={<ArrowBackIcon sx={{ fontSize: 12 }} />}
            />
          </Face>
        </Box>
      </Box>
    </Grid>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.dossier.id === nextProps.dossier.id &&
    prevProps.isSelected === nextProps.isSelected
  );
});

const InfoField: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
      <Box sx={{ color: '#7a95b5', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: '0.6rem', color: '#7a95b5', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: '#1a2e4a', fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

DossierCard.displayName = 'DossierCard';

export default DossierCard;
