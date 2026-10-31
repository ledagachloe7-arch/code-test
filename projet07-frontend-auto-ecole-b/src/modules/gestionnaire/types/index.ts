// Types pour le module gestionnaire CNEPC
export interface CNEPCStats {
  totalAutoEcoles: number;
  totalCandidats: number;
  totalSessions: number;
  totalExamensReussis: number;
}

export interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: {
    label: string;
    color: 'primary' | '#009F5D' | 'info' | 'warning' | 'error' | 'default';
  };
  chips: Array<{
    icon?: React.ReactNode;
    label: string;
  }>;
  primaryAction: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };
  avatarColor: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary';
}

