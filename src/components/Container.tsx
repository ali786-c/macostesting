import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
};

/**
 * Container component with responsive padding and max-width
 * Prevents horizontal overflow on mobile devices
 */
export default function Container({ 
  children, 
  className = '',
  maxWidth = '7xl'
}: ContainerProps) {
  return (
    <div 
      className={`
        w-full
        ${maxWidthClasses[maxWidth]}
        mx-auto
        px-3 sm:px-4 md:px-6 lg:px-8
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
