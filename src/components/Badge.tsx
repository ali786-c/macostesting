import { LucideIcon } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  onClick?: () => void;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-800 border-gray-200',
  primary: 'bg-orange-100 text-orange-800 border-orange-200',
  secondary: 'bg-gray-100 text-gray-800 border-gray-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  outline: 'bg-transparent text-gray-700 border-gray-300',
  gradient: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-transparent'
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 font-medium rounded-full border transition-all duration-200';
  const hoverClasses = onClick ? 'hover:scale-105 cursor-pointer' : '';
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${hoverClasses}
    ${className}
  `.trim();

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={classes}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-3 h-3" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className="w-3 h-3" />}
    </Component>
  );
}
