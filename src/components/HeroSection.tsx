import { LucideIcon } from 'lucide-react';
import Button from './Button';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  background?: 'white' | 'gray' | 'gradient' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  actions?: {
    primary: {
      label: string;
      href: string;
      icon?: LucideIcon;
    };
    secondary?: {
      label: string;
      href: string;
      icon?: LucideIcon;
    };
  };
  className?: string;
}

const backgroundClasses = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  gradient: 'bg-gradient-to-br from-orange-50 via-white to-orange-50',
  dark: 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white'
};

const sizeClasses = {
  sm: 'py-12',
  md: 'py-16',
  lg: 'py-24'
};

export default function HeroSection({
  title,
  subtitle,
  description,
  icon: Icon,
  background = 'white',
  size = 'md',
  actions,
  className = ''
}: HeroSectionProps) {
  return (
    <section className={`
      ${backgroundClasses[background]}
      ${sizeClasses[size]}
      ${className}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {Icon && (
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-orange-100 rounded-2xl">
                <Icon className="w-12 h-12 text-orange-600" />
              </div>
            </div>
          )}
          
          {subtitle && (
            <p className="text-lg text-orange-600 font-semibold mb-4">
              {subtitle}
            </p>
          )}
          
          <h1 className={`
            font-bold mb-6
            ${background === 'dark' ? 'text-white' : 'text-gray-900'}
            ${size === 'sm' ? 'text-3xl md:text-4xl' : size === 'md' ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl'}
          `}>
            {title}
          </h1>
          
          {description && (
            <p className={`
              text-xl mb-8 max-w-2xl mx-auto
              ${background === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}>
              {description}
            </p>
          )}
          
          {actions && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                icon={actions.primary.icon}
                onClick={() => window.location.href = actions.primary.href}
              >
                {actions.primary.label}
              </Button>
              
              {actions.secondary && (
                <Button
                  variant="outline"
                  size="lg"
                  icon={actions.secondary.icon}
                  onClick={() => window.location.href = actions.secondary!.href}
                >
                  {actions.secondary.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
