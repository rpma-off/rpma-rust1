import type { Metadata } from "next";
import RootClientLayout from './RootClientLayout';

// This is a Server Component. Client Components will be imported into it.

export const metadata: Metadata = {
  title: "RPMA V2 - Professional Paint Protection Film Management",
  description: "Comprehensive management system for PPF installation businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RootClientLayout>
          {children}
        </RootClientLayout>
      </body>
    </html>
  );
}
