import { LucideIcon } from 'lucide-react';

interface IconProps {
  name: 'star' | 'heart' | 'check' | 'cross' | 'warning' | 'info' | 'success' | 'error' | 'loading' | 'crown' | 'diamond' | 'fire' | 'sparkles';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray';
  className?: string;
}

const iconMap = {
  star: '⭐',
  heart: '❤️',
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  success: '🎉',
  error: '🚫',
  loading: '⏳',
  crown: '👑',
  diamond: '💎',
  fire: '🔥',
  sparkles: '✨'
};

const sizeClasses = {
  xs: 'w-3 h-3 text-xs',
  sm: 'w-4 h-4 text-sm',
  md: 'w-5 h-5 text-base',
  lg: 'w-6 h-6 text-lg',
  xl: 'w-8 h-8 text-xl'
};

const colorClasses = {
  primary: 'text-orange-500',
  secondary: 'text-gray-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  gray: 'text-gray-400'
};

export default function Icon({ 
  name, 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: IconProps) {
  return (
    <span className={`
      inline-flex items-center justify-center
      ${sizeClasses[size]}
      ${colorClasses[color]}
      ${className}
    `}>
      {iconMap[name]}
    </span>
  );
}
