// Module Settings - Gestion des paramètres système
export { default as SettingsPage } from './pages/SettingsPage';
export { default as UserManagementPage } from './pages/UserManagementPage';
export { default as CreatePermisPage } from './pages/CreatePermisPage';

// Services
export * from './services/userManagementService';
export * from './services/rolePermissionsService';
export * from './services/permisManagementService';

// Context
export {
  RolePermissionsProvider,
  useRolePermissions,
  useVisibleMenuKeysForRole,
  type RolePermissionsMap,
} from './context/RolePermissionsContext';

// Types
export * from './types';

// Components
export * from './components';
