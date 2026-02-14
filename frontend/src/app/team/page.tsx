"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from '@/hooks/useTranslation';
import { LoadingState } from '@/components/layout/LoadingState';

export default function TeamPage() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    // Redirect to users page since team management is handled there
    router.replace("/users");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingState message={t('common.loading')} />
    </div>
  );
}
