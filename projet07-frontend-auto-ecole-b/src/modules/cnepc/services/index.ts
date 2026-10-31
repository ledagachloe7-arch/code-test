// Services pour CNEPC
export { default as cnepcService } from './cnepcService';
export { default as batchService } from './batchService';

// Exemple d'utilisation
export { default as CNEPCServiceExample } from './CNEPCServiceExample';

// Service pour la gestion des auto-écoles
export { autoEcoleService, AutoEcoleService } from './auto-ecole.service';
export { userService, UserService } from './user.service';
export { referentielService, ReferentielService } from './referentiel.service';
export { typeDemandeService, TypeDemandeService } from './type-demande.service';
export { gestionDossierService, GestionDossierService } from './gestion-dossier.service';
export { dgdiService, DgdiService, isDgdiServiceUnavailableMessage } from './dgdi.service';
export type { DgdiVerificationResult, DgdiVerificationData, DgdiVerificationPayload } from './dgdi.service';

// Types
export * from '../types';
