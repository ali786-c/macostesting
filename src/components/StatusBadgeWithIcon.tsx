'use client';

import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ReactNode } from 'react';

export type StatusType = 'pending' | 'accepted' | 'rejected' | 'completed' | 'open' | 'closed' | 'paid' | 'overdue' | 'upcoming' | 'past' | 'in_progress' | 'validated';

interface StatusBadgeWithIconProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  customText?: string;
  className?: string;
}

const statusConfig: Record<StatusType, {
  bg: string;
  text: string;
  icon: typeof CheckCircle;
  label: string;
}> = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: Clock,
    label: 'En attente'
  },
  accepted: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: CheckCircle,
    label: 'Accepté'
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: XCircle,
    label: 'Refusé'
  },
  completed: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: CheckCircle,
    label: 'Terminé'
  },
  open: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: CheckCircle,
    label: 'Ouverte'
  },
  closed: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: XCircle,
    label: 'Fermée'
  },
  paid: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: CheckCircle,
    label: 'Payée'
  },
  overdue: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: AlertCircle,
    label: 'En retard'
  },
  upcoming: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: Clock,
    label: 'À venir'
  },
  past: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: CheckCircle,
    label: 'Terminée'
  },
  in_progress: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: Clock,
    label: 'En cours'
  },
  validated: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: CheckCircle,
    label: 'Validé'
  }
};

const sizeClasses = {
  sm: {
    container: 'px-1.5 py-0.5 text-[8px]',
    icon: 'w-2 h-2'
  },
  md: {
    container: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3'
  },
  lg: {
    container: 'px-4 py-2 text-base md:text-lg',
    icon: 'w-5 h-5 md:w-6 md:h-6'
  }
};

export default function StatusBadgeWithIcon({
  status,
  size = 'md',
  showIcon = true,
  customText,
  className = ''
}: StatusBadgeWithIconProps) {
  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;
  const sizes = sizeClasses[size];

  return (
    <span className={`${config.bg} ${config.text} ${sizes.container} rounded-full font-bold flex items-center space-x-0.5 md:space-x-1 ${className}`}>
      {showIcon && <Icon className={sizes.icon} />}
      <span>{customText || config.label}</span>
    </span>
  );
}

