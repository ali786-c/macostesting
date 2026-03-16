import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  title?: string;
}

const variantClasses = {
  primary: 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  outline: 'border border-orange-600 text-orange-600 hover:bg-orange-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
};

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-[36px] md:min-h-0',
  md: 'px-4 py-2.5 text-sm min-h-[44px] md:min-h-0', // Mobile: 44px touch target
  lg: 'px-6 py-3 text-base min-h-[48px] md:min-h-0'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  title
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      onClick={(e) => onClick?.(e)}
      disabled={disabled || loading}
      className={classes}
      title={title}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 mr-2" />
      ) : null}
      
      {children}
      
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className="w-4 h-4 ml-2" />
      )}
    </button>
  );
}
