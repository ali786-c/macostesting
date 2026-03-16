'use client';

import { useEffect, useState } from 'react';

interface SkeletonLoadingProps {
  children: React.ReactNode;
  isLoading: boolean;
  className?: string;
}

export default function SkeletonLoading({ children, isLoading, className = '' }: SkeletonLoadingProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-300/70 backdrop-blur-sm z-50 animate-pulse rounded-lg" />
      )}
      <div className={isLoading ? 'opacity-40 pointer-events-none transition-opacity duration-300' : 'transition-opacity duration-300'}>
        {children}
      </div>
    </div>
  );
}
