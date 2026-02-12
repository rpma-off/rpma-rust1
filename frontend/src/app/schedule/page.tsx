"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export default function SchedulePage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Redirect to dashboard calendar page
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('schedule.redirecting')}</p>
      </div>
    </div>
  );
}
