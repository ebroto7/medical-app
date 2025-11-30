export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 p-4 hidden md:block">
        <div className="space-y-4">
          {/* Logo skeleton */}
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>

          {/* Menu items skeleton */}
          <div className="space-y-2 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>

          {/* Logout button skeleton */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64 p-6 md:p-8">
        {/* Header skeleton */}
        <div className="mb-8 space-y-2">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Content cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse mt-4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
