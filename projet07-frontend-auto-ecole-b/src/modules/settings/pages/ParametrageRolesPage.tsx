import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
  Drawer,
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as RestoreIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Close as CloseIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  MENU_ITEMS_CONFIG,
  DEFAULT_ROLE_VISIBLE_MENU_KEYS,
} from '../../../shared/config/rolesPermissionsConfig';
import { resetParametrage } from '../../../shared/store/parametrageStore';
import { toCanonicalRole } from '../../../shared/config/rolesPermissionsConfig';
import { useRolePermissions } from '../context/RolePermissionsContext';

const SIDEBAR_WIDTH = 280;

/** Affiche le message et les détails de validation (ex. 422) renvoyés par l'API */
function formatRolePermissionsError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message?: string }).message);
    const details = (err as { details?: unknown }).details;
    if (details != null && typeof details === 'object') {
      const d = details as Record<string, unknown>;
      if (Array.isArray(d.detail)) {
        const parts = (d.detail as Array<{ loc?: unknown[]; msg?: string }>).map(
          (e) => (e.loc && e.msg ? `${(e.loc as string[]).join('.')}: ${e.msg}` : e.msg)
        );
        if (parts.length) return `${msg} (${parts.join('; ')})`;
      }
      if (d.errors && typeof d.errors === 'object') return `${msg} ${JSON.stringify(d.errors)}`;
      if (d.message && typeof d.message === 'string') return d.message;
    }
    return msg;
  }
  if (err instanceof Error) return err.message;
  return "Erreur lors de l'enregistrement des permissions";
}

const ParametrageRolesPage: React.FC = () => {
  const theme = useTheme();
  const { roles, rolePermissions, loading: rolesLoading, error: rolesError, load, updateRolePermissions } = useRolePermissions();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [permissionsForRole, setPermissionsForRole] = useState<string[]>([]);
  const [savedRole, setSavedRole] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Lire les permissions depuis le contexte quand on sélectionne un rôle (pas d'appel API)
  useEffect(() => {
    if (!selectedRole) {
      setPermissionsForRole([]);
      return;
    }
    const canonical = toCanonicalRole(selectedRole);
    const list = rolePermissions[selectedRole] ?? rolePermissions[canonical]
      ?? (() => {
          const foundKey = Object.keys(rolePermissions).find((k) => toCanonicalRole(k) === canonical);
          return foundKey ? rolePermissions[foundKey] : (DEFAULT_ROLE_VISIBLE_MENU_KEYS[selectedRole] ?? DEFAULT_ROLE_VISIBLE_MENU_KEYS[canonical] ?? []);
        })();
    setPermissionsForRole(Array.isArray(list) ? list : []);
  }, [selectedRole, rolePermissions]);

  const handleTogglePermission = (menuKey: string) => {
    if (!selectedRole) return;
    setPermissionsForRole((prev) =>
      prev.includes(menuKey) ? prev.filter((k) => k !== menuKey) : [...prev, menuKey]
    );
  };

  const handleSelectAll = () => {
    setPermissionsForRole(MENU_ITEMS_CONFIG.map((m) => m.key));
  };

  const handleDeselectAll = () => {
    setPermissionsForRole([]);
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    setSavingRole(selectedRole);
    setSaveError(null);
    try {
      await updateRolePermissions(selectedRole, permissionsForRole);
      setSavedRole(selectedRole);
      setTimeout(() => setSavedRole(null), 3000);
    } catch (err: unknown) {
      setSaveError(formatRolePermissionsError(err));
    } finally {
      setSavingRole(null);
    }
  };

  const handleReset = () => {
    resetParametrage();
    load();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  const totalCount = MENU_ITEMS_CONFIG.length;
  const visibleCount = permissionsForRole.length;

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* Sidebar gauche : liste des rôles */}
      <Drawer
        variant="permanent"
        open
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            mt: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
            position: 'relative',
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            Rôles
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cliquez sur un rôle pour afficher ses permissions
          </Typography>
        </Box>
        {rolesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : roles.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Aucun rôle disponible
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ py: 1 }}>
            {roles.map((role) => (
              <ListItemButton
                key={role}
                selected={selectedRole === role}
                onClick={() => setSelectedRole(role)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <SecurityIcon
                    fontSize="small"
                    color={selectedRole === role ? 'primary' : 'action'}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={role}
                  primaryTypographyProps={{
                    fontWeight: selectedRole === role ? 600 : 500,
                    fontSize: '0.9rem',
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Drawer>

      {/* Contenu principal : permissions du rôle sélectionné */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          px: { xs: 2, sm: 3 },
          py: 3,
          overflow: 'auto',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            pb: 2,
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.main,
            }}
          >
            <SecurityIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              Paramétrage des rôles
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              Sélectionnez un rôle à gauche pour gérer ses permissions (entrées de la sidebar).
            </Typography>
          </Box>
        </Box>

        {savedRole && (
          <Alert
            severity="success"
            sx={{ mb: 2, borderRadius: 2, boxShadow: theme.shadows[1] }}
            action={
              <IconButton size="small" aria-label="Fermer" onClick={() => setSavedRole(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            Permissions enregistrées pour le rôle « {savedRole} ».
          </Alert>
        )}
        {resetDone && (
          <Alert
            severity="info"
            sx={{ mb: 2, borderRadius: 2, boxShadow: theme.shadows[1] }}
            action={
              <IconButton size="small" aria-label="Fermer" onClick={() => setResetDone(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            Paramétrage réinitialisé et rafraîchi.
          </Alert>
        )}
        {rolesError && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            {rolesError} Les rôles ne s&apos;affichent pas.
          </Alert>
        )}
        {saveError && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              <IconButton size="small" aria-label="Fermer" onClick={() => setSaveError(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {typeof saveError === 'string' ? saveError : String(saveError)}
          </Alert>
        )}

        {!selectedRole ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 2,
              border: `1px dashed ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.action.hover, 0.02),
            }}
          >
            <PersonIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Sélectionnez un rôle
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choisissez un rôle dans la liste à gauche pour afficher et modifier ses permissions.
            </Typography>
          </Paper>
        ) : rolesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                  {selectedRole}
                </Typography>
                <Chip
                  size="small"
                  icon={visibleCount === totalCount ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                  label={`${visibleCount} / ${totalCount} permissions`}
                  color={visibleCount === 0 ? 'default' : 'primary'}
                  variant={visibleCount === totalCount ? 'filled' : 'outlined'}
                />
              </Box>
              <Button
                size="small"
                variant="contained"
                startIcon={savingRole ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSaveRole}
                disabled={savingRole !== null}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                {savingRole ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </Box>
            <Box sx={{ px: 1, py: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, p: 1.5, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSelectAll}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Tout sélectionner
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleDeselectAll}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Tout désélectionner
                </Button>
              </Box>
              <List
                dense
                disablePadding
                sx={{
                  '& .MuiListItem-root': {
                    borderRadius: 1.5,
                    mx: 0.5,
                    mb: 0.5,
                    py: 0.75,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                  },
                }}
              >
                {MENU_ITEMS_CONFIG.map((menu, index) => {
                  const isChecked = permissionsForRole.includes(menu.key);
                  const subtitle =
                    'subtitle' in menu && typeof (menu as { subtitle?: string }).subtitle === 'string'
                      ? (menu as { subtitle?: string }).subtitle
                      : undefined;
                  return (
                    <ListItemButton
                      key={menu.key}
                      onClick={() => handleTogglePermission(menu.key)}
                      sx={{
                        borderRadius: 1.5,
                        mx: 0.5,
                        mb: 0.5,
                        py: 0.75,
                        bgcolor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.action.hover, 0.02),
                      }}
                    >
                      <ListItemText
                        primary={menu.title}
                        secondary={subtitle}
                        primaryTypographyProps={{
                          fontWeight: isChecked ? 600 : 500,
                          color: isChecked ? 'text.primary' : 'text.secondary',
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          sx: { display: 'block', mt: 0.25, lineHeight: 1.35 },
                        }}
                      />
                      <Checkbox
                        edge="end"
                        checked={isChecked}
                        onChange={() => handleTogglePermission(menu.key)}
                        color="primary"
                        sx={{ mr: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          </Paper>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 3,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.action.hover, 0.03),
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={rolesLoading ? <CircularProgress size={18} /> : <RefreshIcon />}
              onClick={() => load()}
              disabled={rolesLoading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Rafraîchir depuis l&apos;API
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Réinitialiser et rafraîchir
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ParametrageRolesPage;
