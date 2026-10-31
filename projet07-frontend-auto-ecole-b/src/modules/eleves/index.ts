// Module de gestion des élèves
export * from './forms';
export * from './tables';
export * from './types';
export * from './components';

// Services (export explicite pour éviter les conflits)
export { default as studentService } from './services/studentService';
export { default as documentService } from './services/documentService';
export { default as StudentServiceExample } from './services/StudentServiceExample';
