'use client';

import Image from 'next/image';

interface LoadingLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function LoadingLogo({ className = '', size = 'md' }: LoadingLogoProps) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    xl: 'w-52 h-52'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} mx-auto`}>
      <div className="w-full h-full animate-pulse">
        <Image
          src="/logoren.png"
          alt="Loading"
          width={size === 'sm' ? 80 : size === 'md' ? 128 : size === 'lg' ? 160 : 208}
          height={size === 'sm' ? 80 : size === 'md' ? 128 : size === 'lg' ? 160 : 208}
          className="w-full h-full object-contain animate-bounce"
          priority
        />
      </div>
    </div>
  );
}
