interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const variantClasses = {
  default: 'bg-white border border-gray-200',
  glass: 'bg-white/80 backdrop-blur-sm border border-white/20',
  elevated: 'bg-white shadow-lg border border-gray-100',
  outlined: 'bg-transparent border-2 border-gray-200'
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick,
  hover = false
}: CardProps) {
  const baseClasses = 'rounded-xl transition-all duration-200';
  const hoverClasses = hover ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' : '';
  
  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${hoverClasses}
    ${className}
  `.trim();

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={classes}
    >
      {children}
    </Component>
  );
}
