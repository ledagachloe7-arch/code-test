import React from 'react';
import { Box, IconButton, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import {
  Bars3BottomLeftIcon,
  ChatBubbleLeftRightIcon,
  ChevronDoubleLeftIcon,
  DocumentPlusIcon,
  FolderOpenIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants';

interface DemandeSidebarProps {
  open: boolean;
  onToggle: () => void;
}

const BUBBLE_EASE_OPEN = 'cubic-bezier(0.34, 1.52, 0.56, 1)';
const BUBBLE_EASE_CLOSE = 'cubic-bezier(0.55, 0, 1, 0.45)';
const DURATION_MS = 480;

const ENTER_DURATION_MS = 720;
const ENTER_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Sous-chemins du module demande (évite dépendance stricte sur des clés `ROUTES` étendues côté typage IDE). */
const DEMANDE_ELEVES = {
  nouvelleDemande: `${ROUTES.ELEVES}/nouvelle-demande`,
  mesDossiers: `${ROUTES.ELEVES}/mes-dossiers`,
  mesReclamations: `${ROUTES.ELEVES}/mes-reclamations`,
} as const;

/**
 * Dock circulaire retractable : petite bulle repliée, expansion animée (« bubble »),
 * ancrée au bord gauche avec entrée depuis la gauche.
 */
const DemandeSidebar: React.FC<DemandeSidebarProps> = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const palette = theme.palette;

  const itemSx = {
    width: 52,
    height: 52,
    borderRadius: '50%',
    color: 'white',
    border: `1px solid rgba(255,255,255,0.35)`,
    bgcolor: 'rgba(255,255,255,0.12)',
    transition: theme.transitions.create(['background-color', 'transform']),
    '&:hover': {
      bgcolor: 'rgba(255,255,255,0.22)',
      transform: 'scale(1.06)',
    },
  };

  const isMenuPrincipalActive = location.pathname === ROUTES.DASHBOARD || location.pathname === '/';
  const isNouvelleDemandeActive =
    location.pathname === DEMANDE_ELEVES.nouvelleDemande ||
    location.pathname.startsWith(`${DEMANDE_ELEVES.nouvelleDemande}/`);
  const isMesDossiersActive = location.pathname.startsWith(DEMANDE_ELEVES.mesDossiers);
  const isMesReclamationsActive = location.pathname.startsWith(DEMANDE_ELEVES.mesReclamations);

  const circlePx = isXs ? 256 : 278;
  const collapsedPx = isXs ? 56 : 60;

  return (
    <>
      {/* Conteneur extérieur : collé au bord gauche, entrée glissée depuis la gauche */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          top: '50%',
          zIndex: 1100,
          '@keyframes demandeSidebarDockEnter': {
            from: {
              opacity: 0.65,
              transform: 'translateY(-50%) translateX(calc(-100% - 12px))',
            },
            to: {
              opacity: 1,
              transform: 'translateY(-50%) translateX(0)',
            },
          },
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            opacity: 1,
            transform: 'translateY(-50%) translateX(0)',
          },
          animation: `demandeSidebarDockEnter ${ENTER_DURATION_MS}ms ${ENTER_EASE} both`,
        }}
      >
        {/* Bulle animée */}
        <Box
          component="aside"
          role="navigation"
          aria-label={open ? 'Navigation module demande' : 'Ouvrir le menu module demande'}
          aria-expanded={open}
          sx={{
            '@keyframes demandeSidebarBubbleGlow': {
              '0%, 100%': { boxShadow: '0 10px 28px rgba(25, 118, 210, 0.38)' },
              '50%': { boxShadow: '0 14px 40px rgba(25, 118, 210, 0.55)' },
            },
            position: 'relative',
            width: collapsedPx,
            height: collapsedPx,
            ...(open && {
              width: circlePx,
              height: circlePx,
            }),
            borderRadius: open
              ? `0 ${circlePx}px ${circlePx}px 0`
              : `0 ${collapsedPx}px ${collapsedPx}px 0`,
            overflow: open ? 'visible' : 'hidden',
            background: `linear-gradient(160deg, ${palette.primary.dark} 0%, ${palette.primary.main} 55%, #0d4a7a 100%)`,
            border: '1px solid rgba(255,255,255,0.22)',
            boxSizing: 'border-box',
            transition: `
              width ${DURATION_MS}ms ${open ? BUBBLE_EASE_OPEN : BUBBLE_EASE_CLOSE},
              height ${DURATION_MS}ms ${open ? BUBBLE_EASE_OPEN : BUBBLE_EASE_CLOSE},
              box-shadow 0.35s ease
            `,
            boxShadow: open
              ? '0 14px 44px rgba(25, 118, 210, 0.32), 0 4px 16px rgba(0, 0, 0, 0.14)'
              : '0 10px 28px rgba(25, 118, 210, 0.4)',
            ...(!open && {
              animation: 'demandeSidebarBubbleGlow 2.8s ease-in-out infinite',
            }),
            /** Grandit vers la droite en restant contre le bord gauche du viewport */
            transformOrigin: 'left center',
            willChange: 'width, height',
          }}
        >
          {/* États replié / ouvert avec fondu */}
          {/* Replié */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: open ? 0 : 1,
              transform: open ? 'scale(0.65)' : 'scale(1)',
              transition: `opacity ${DURATION_MS * 0.85}ms ${open ? BUBBLE_EASE_CLOSE : BUBBLE_EASE_OPEN},
                transform ${DURATION_MS}ms ${open ? BUBBLE_EASE_CLOSE : BUBBLE_EASE_OPEN}`,
              pointerEvents: open ? 'none' : 'auto',
            }}
          >
            <Tooltip title="Étendre le menu" placement="right">
              <IconButton
                onClick={() => onToggle()}
                aria-label="Étendre le menu de navigation Demande"
                sx={{
                  color: 'white',
                  width: Math.max(42, collapsedPx - 10),
                  height: Math.max(42, collapsedPx - 10),
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.14)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.26)' },
                }}
              >
                <Bars3BottomLeftIcon width={24} height={24} strokeWidth={2} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Ouvert */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isXs ? 1 : 1.25,
              pt: 1.75,
              opacity: open ? 1 : 0,
              transform: open ? 'scale(1)' : 'scale(0.5)',
              transition: `opacity ${DURATION_MS * 0.9}ms ${open ? BUBBLE_EASE_OPEN : BUBBLE_EASE_CLOSE},
                transform ${DURATION_MS}ms ${open ? BUBBLE_EASE_OPEN : BUBBLE_EASE_CLOSE}`,
              pointerEvents: open ? 'auto' : 'none',
              '@keyframes demandeSidebarItemPop': {
                from: { opacity: 0, transform: 'scale(0.25)' },
                to: { opacity: 1, transform: 'scale(1)' },
              },
            }}
          >
            <Tooltip title="Réduire le menu" placement="right">
              <IconButton
                size="small"
                onClick={() => onToggle()}
                aria-label="Réduire le menu"
                sx={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  color: palette.primary.dark,
                  bgcolor: 'rgba(255,255,255,0.95)',
                  border: '2px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  zIndex: 2,
                  '&:hover': { bgcolor: '#fff', transform: 'translateX(-50%) scale(1.05)' },
                }}
              >
                <ChevronDoubleLeftIcon width={18} height={18} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Retour au menu principal" placement="right">
              <IconButton
                size="small"
                onClick={() => navigate(ROUTES.DASHBOARD)}
                aria-label="Retour au menu principal"
                sx={{
                  ...itemSx,
                  animation: open ? 'demandeSidebarItemPop 0.42s cubic-bezier(0.34, 1.52, 0.64, 1) 0ms both' : undefined,
                  ...(isMenuPrincipalActive ? { bgcolor: 'rgba(255,255,255,0.28)', boxShadow: '0 0 0 2px rgba(255,255,255,0.45)' } : {}),
                }}
              >
                <HomeModernIcon width={22} height={22} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Nouvelle demande — Formulaire d'enregistrement" placement="right">
              <IconButton
                size="small"
                onClick={() => navigate(DEMANDE_ELEVES.nouvelleDemande)}
                aria-label="Nouvelle demande, formulaire d'enregistrement"
                sx={{
                  ...itemSx,
                  animation: open ? 'demandeSidebarItemPop 0.42s cubic-bezier(0.34, 1.52, 0.64, 1) 60ms both' : undefined,
                  ...(isNouvelleDemandeActive ? { bgcolor: 'rgba(255,255,255,0.28)', boxShadow: '0 0 0 2px rgba(255,255,255,0.45)' } : {}),
                }}
              >
                <DocumentPlusIcon width={22} height={22} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Mes dossiers" placement="right">
              <IconButton
                size="small"
                onClick={() => navigate(DEMANDE_ELEVES.mesDossiers)}
                aria-label="Mes dossiers"
                sx={{
                  ...itemSx,
                  animation: open ? 'demandeSidebarItemPop 0.42s cubic-bezier(0.34, 1.52, 0.64, 1) 120ms both' : undefined,
                  ...(isMesDossiersActive ? { bgcolor: 'rgba(255,255,255,0.28)', boxShadow: '0 0 0 2px rgba(255,255,255,0.45)' } : {}),
                }}
              >
                <FolderOpenIcon width={22} height={22} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Mes réclamations" placement="right">
              <IconButton
                size="small"
                onClick={() => navigate(DEMANDE_ELEVES.mesReclamations)}
                aria-label="Mes réclamations"
                sx={{
                  ...itemSx,
                  animation: open ? 'demandeSidebarItemPop 0.42s cubic-bezier(0.34, 1.52, 0.64, 1) 180ms both' : undefined,
                  ...(isMesReclamationsActive ? { bgcolor: 'rgba(255,255,255,0.28)', boxShadow: '0 0 0 2px rgba(255,255,255,0.45)' } : {}),
                }}
              >
                <ChatBubbleLeftRightIcon width={22} height={22} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default DemandeSidebar;
