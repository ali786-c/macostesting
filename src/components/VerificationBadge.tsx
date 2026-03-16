'use client';

import { CheckCircle, Shield, Star } from 'lucide-react';

interface VerificationBadgeProps {
  verified?: boolean;
  type?: 'influencer' | 'establishment';
  className?: string;
}

export default function VerificationBadge({ 
  verified = false, 
  type = 'influencer',
  className = '' 
}: VerificationBadgeProps) {
  if (!verified) return null;

  const getBadgeContent = () => {
    switch (type) {
      case 'influencer':
        return {
          icon: <Star className="w-4 h-4" />,
          text: 'Influenceur vérifié',
          bgColor: 'bg-gradient-to-r from-orange-500 to-orange-600',
          textColor: 'text-white'
        };
      case 'establishment':
        return {
          icon: <Shield className="w-4 h-4" />,
          text: 'Établissement vérifié',
          bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
          textColor: 'text-white'
        };
      default:
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Vérifié',
          bgColor: 'bg-gradient-to-r from-green-500 to-green-600',
          textColor: 'text-white'
        };
    }
  };

  const badge = getBadgeContent();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${badge.bgColor} ${badge.textColor} ${className}`}>
      {badge.icon}
      <span>{badge.text}</span>
    </div>
  );
}
