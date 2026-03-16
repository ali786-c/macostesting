import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'light' | 'dark' | 'gradient';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  background?: 'none' | 'decoration';
}

export default function Section({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'lg',
  background = 'none'
}: SectionProps) {
  const baseClasses = 'w-full relative overflow-hidden';
  
  const variantClasses = {
    default: 'bg-white text-gray-900',
    light: 'bg-gray-50 text-gray-900',
    dark: 'bg-gray-900 text-white',
    gradient: 'bg-gradient-to-br from-gray-50 via-white to-orange-50/30 text-gray-900',
  };
  
  const paddingClasses = {
    sm: 'py-12',
    md: 'py-16',
    lg: 'py-20',
    xl: 'py-24',
  };

  const backgroundDecoration = background === 'decoration' ? (
    <div className="absolute inset-0">
      <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
    </div>
  ) : null;

  return (
    <section className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {backgroundDecoration}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
