import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 active:scale-95',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-95',
    outline: 'border border-gray-200 bg-transparent hover:bg-gray-50 text-gray-700 active:scale-95',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-6 py-2.5 text-base rounded-xl font-medium',
    lg: 'px-8 py-3.5 text-lg rounded-2xl font-semibold',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50',
      className,
    )}
  >
    {children}
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  className?: string;
  variant?: 'success' | 'blue' | 'gray';
}> = ({ children, className, variant = 'blue' }) => {
  const variants = {
    success: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    gray: 'bg-gray-50 text-gray-500 border-gray-100',
  };

  return (
    <span className={cn('px-2.5 py-0.5 text-xs font-semibold rounded-full border', variants[variant], className)}>
      {children}
    </span>
  );
};
