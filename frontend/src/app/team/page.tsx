"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeamPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to users page since team management is handled there
    router.replace("/users");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[hsl(var(--rpma-surface))]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--rpma-teal))] mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirection vers la gestion d&apos;équipe...</p>
      </div>
    </div>
  );
}
