'use client';

import { cn } from '@/lib/utils';

interface AnimatedLoadingTextProps {
  label?: string;
  className?: string;
}

export default function AnimatedLoadingText({
  label = 'Chargement...',
  className = '',
}: AnimatedLoadingTextProps) {
  return (
    <p
      className={cn(
        'inline-flex items-center justify-center gap-2 text-sm md:text-base font-medium text-[#90B781]',
        className,
      )}
    >
      <span className="animate-pulse">{label}</span>
      <span className="inline-flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-[#90B781] animate-bounce [animation-duration:1.2s] [animation-delay:0s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#90B781] animate-bounce [animation-duration:1.2s] [animation-delay:0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#90B781] animate-bounce [animation-duration:1.2s] [animation-delay:0.3s]" />
      </span>
    </p>
  );
}

