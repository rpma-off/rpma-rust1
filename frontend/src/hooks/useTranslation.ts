import { useCallback } from 'react';
import { fr } from '@/lib/i18n/fr';

// Simple nested key access
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (typeof acc === 'string') return acc;
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return path;
  }, obj) as string;
}

export function useTranslation() {
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(fr, key);
    
    // Replace parameters like {count}, {min}, {max}
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    
    return value;
  }, []);

  return { t, locale: 'fr' };
}

export default useTranslation;
