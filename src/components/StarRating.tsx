import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showReviews?: boolean;
  reviewsCount?: number;
  className?: string;
}

const sizeClasses = {
  xs: 'w-2 h-2',
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

const textSizeClasses = {
  xs: 'text-[9px]',
  sm: 'text-xs sm:text-sm',
  md: 'text-xs sm:text-sm md:text-base',
  lg: 'text-sm md:text-base'
};

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = true,
  showReviews = false,
  reviewsCount,
  className = ''
}: StarRatingProps) {
  const starSize = sizeClasses[size];
  const textSize = textSizeClasses[size];

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center space-x-0.5 sm:space-x-1">
        {[...Array(maxRating)].map((_, i) => (
          <Star
            key={i}
            className={`${starSize} ${
              i < Math.floor(rating)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {showValue && (
        <span className={`${textSize} font-semibold text-gray-900 ml-1 sm:ml-2`}>
          {rating.toFixed(1)}
        </span>
      )}
      {showReviews && reviewsCount !== undefined && (
        <span className={`${textSize} text-gray-600 ml-1`}>
          ({reviewsCount})
        </span>
      )}
    </div>
  );
}
