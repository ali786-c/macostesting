import { LucideIcon, CheckCircle, Clock, XCircle, AlertCircle, Star } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'premium' | 'urgent';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'En attente',
    icon: Clock,
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  accepted: {
    label: 'Accepté',
    icon: CheckCircle,
    classes: 'bg-green-100 text-green-800 border-green-200'
  },
  rejected: {
    label: 'Refusé',
    icon: XCircle,
    classes: 'bg-red-100 text-red-800 border-red-200'
  },
  completed: {
    label: 'Terminé',
    icon: CheckCircle,
    classes: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    classes: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  premium: {
    label: 'Premium',
    icon: Star,
    classes: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border-orange-200'
  },
  urgent: {
    label: 'Urgent',
    icon: AlertCircle,
    classes: 'bg-red-100 text-red-800 border-red-200 animate-pulse'
  }
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = ''
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full border
      ${config.classes}
      ${sizeClasses[size]}
      ${className}
    `}>
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  );
}
