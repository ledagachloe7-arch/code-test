// Types pour le module Settings
export interface Operator {
  id: string;
  email: string;
  name: string;
  role: 'operator';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  permissions: string[];
}

export interface OperatorFormData {
  email: string;
  name: string;
  password: string;
  permissions: string[];
}

export interface SettingsStats {
  totalOperators: number;
  activeOperators: number;
  totalAutoEcoles: number;
  activeAutoEcoles: number;
}
