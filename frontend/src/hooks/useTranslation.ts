import { fr, TranslationKeys } from '@/lib/i18n/fr';

type TranslationKey = string;
type TranslationValue = string | Record<string, any>;

// Simple nested key access
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc: any, key: string) => {
    if (typeof acc === 'string') return acc;
    if (acc && typeof acc === 'object' && key in acc) {
      return acc[key];
    }
    return path;
  }, obj) as string;
}

export function useTranslation() {
  const t = (key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(fr, key);
    
    // Replace parameters like {count}, {min}, {max}
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    
    return value;
  };

  return { t, locale: 'fr' };
}

export default useTranslation;
