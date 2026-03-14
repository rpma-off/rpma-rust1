// VIOLATION: This page uses `useEffect` + `router.replace` for a redirect.
// It should be a Server Component that calls `redirect('/dashboard')` from
// 'next/navigation' directly — no 'use client' required, no loading flash.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { LoadingState } from "@/shared/ui/layout/LoadingState";

export default function SchedulePage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Redirect to dashboard calendar page
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingState message={t('schedule.redirecting')} />
    </div>
  );
}

