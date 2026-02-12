import type { Metadata } from "next";
import RootClientLayout from './RootClientLayout';

// This is a Server Component. Client Components will be imported into it.

export const metadata: Metadata = {
  title: "RPMA V2 - Gestion Professionnelle de Film de Protection",
  description: "Système de gestion complet pour les entreprises d'installation de PPF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RootClientLayout>
          {children}
        </RootClientLayout>
      </body>
    </html>
  );
}
