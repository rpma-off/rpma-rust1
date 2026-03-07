'use client';

import { useState } from 'react';
import { useAuth } from '@/domains/auth';
import { useTranslation } from '@/shared/hooks/useTranslation';

export function useMessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inbox');

  return {
    t,
    user,
    activeTab,
    setActiveTab,
  };
}
