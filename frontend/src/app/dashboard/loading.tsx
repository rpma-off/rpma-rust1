import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <div className="fixed left-0 top-0 z-50 h-full w-64 bg-card shadow-lg lg:translate-x-0">
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          
          {/* Sidebar Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center px-3 py-3">
                <Skeleton className="h-5 w-5 rounded mr-3" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        {/* Desktop Header Skeleton */}
        <div className="hidden lg:block bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-64 mb-1" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>

        {/* Mobile Header Skeleton */}
        <div className="lg:hidden sticky top-0 z-30 flex h-16 items-center justify-between bg-card px-4 shadow-sm">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-24" />
          <div className="w-10" />
        </div>

        {/* Main Content Area */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-6">
            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow-sm border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-12" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Features Skeleton */}
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <div className="px-4 py-3 border-b border-border">
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="p-4">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-3 w-80" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-card rounded-lg shadow-sm border border-border p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics and Quick Actions Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Tasks Skeleton */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-4">
              <Skeleton className="h-6 w-28 mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-border rounded">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
