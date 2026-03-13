'use client';

import dynamic from 'next/dynamic';

const CalendarDashboard = dynamic(
  () => import('@/domains/calendar').then((module) => module.CalendarDashboard)
);

export default function Home() {
  return (
    <div className="min-h-screen bg-[hsl(var(--rpma-surface))]">
      <CalendarDashboard />
    </div>
  );
}
