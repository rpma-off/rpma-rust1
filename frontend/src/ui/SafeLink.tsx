'use client';

import Link, { LinkProps } from 'next/link';
import { ReactNode } from 'react';

interface SafeLinkProps extends Omit<LinkProps, 'href'> {
  href?: string | null;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SafeLink({ 
  href, 
  children, 
  className = '',
  onClick,
  ...props 
}: SafeLinkProps) {
  // If href is not provided or is invalid, render a span instead
  if (!href) {
    return (
      <span 
        className={className} 
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        {children}
      </span>
    );
  }

  return (
    <Link 
      href={href} 
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}
