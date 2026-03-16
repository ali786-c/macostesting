interface PriceRangeBadgeProps {
  priceRange: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const priceRangeColors: Record<string, string> = {
  '€': 'text-green-600 bg-green-100',
  '€€': 'text-yellow-600 bg-yellow-100',
  '€€€': 'text-orange-600 bg-orange-100',
  '€€€€': 'text-red-600 bg-red-100'
};

const sizeClasses = {
  xs: 'px-1 py-0.5 text-[9px]',
  sm: 'px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs',
  md: 'px-2 py-1 text-xs sm:text-sm'
};

export default function PriceRangeBadge({
  priceRange,
  size = 'sm',
  className = ''
}: PriceRangeBadgeProps) {
  const colorClass = priceRangeColors[priceRange] || 'text-gray-600 bg-gray-100';
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={`${sizeClass} rounded-full font-semibold flex-shrink-0 ${colorClass} ${className}`}
    >
      {priceRange}
    </div>
  );
}
