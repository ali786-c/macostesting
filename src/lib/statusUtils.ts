import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export type StatusType = 
  | 'pending' 
  | 'accepted' 
  | 'rejected' 
  | 'completed' 
  | 'cancelled' 
  | 'open' 
  | 'closed' 
  | 'in_progress'
  | 'confirmed';

export interface StatusConfig {
  label: string;
  icon: typeof Clock;
  colorClasses: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  accepted: {
    label: 'Accepté',
    icon: CheckCircle,
    colorClasses: 'bg-green-100 text-green-800 border-green-200'
  },
  rejected: {
    label: 'Refusé',
    icon: XCircle,
    colorClasses: 'bg-red-100 text-red-800 border-red-200'
  },
  completed: {
    label: 'Terminé',
    icon: CheckCircle,
    colorClasses: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    colorClasses: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  open: {
    label: 'Ouvert',
    icon: CheckCircle,
    colorClasses: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  closed: {
    label: 'Fermé',
    icon: XCircle,
    colorClasses: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  in_progress: {
    label: 'En cours',
    icon: Clock,
    colorClasses: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle,
    colorClasses: 'bg-green-100 text-green-800 border-green-200'
  }
};

export function getStatusConfig(status: string): StatusConfig {
  return statusConfigs[status as StatusType] || {
    label: status,
    icon: AlertCircle,
    colorClasses: 'bg-gray-100 text-gray-800 border-gray-200'
  };
}

export function getStatusColor(status: string): string {
  return getStatusConfig(status).colorClasses;
}

export function getStatusLabel(status: string): string {
  return getStatusConfig(status).label;
}

export function getStatusIcon(status: string) {
  return getStatusConfig(status).icon;
}
