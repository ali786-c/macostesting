interface SectionProps {
  children: React.ReactNode;
  variant?: 'default' | 'gray' | 'gradient' | 'dark';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  id?: string;
}

const variantClasses = {
  default: 'bg-white',
  gray: 'bg-gray-50',
  gradient: 'bg-gradient-to-br from-orange-50 via-white to-orange-50',
  dark: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white'
};

const paddingClasses = {
  none: '',
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16',
  xl: 'py-24'
};

export default function Section({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  id
}: SectionProps) {
  const classes = `
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${className}
  `.trim();

  return (
    <section id={id} className={classes}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}
