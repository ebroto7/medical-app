export default function DiaryLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 p-4 hidden md:block">
        <div className="space-y-4">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-2 mt-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:ml-64 p-6 md:p-8">
        {/* Header skeleton */}
        <div className="mb-8 space-y-2">
          <div className="h-10 w-80 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-full max-w-2xl bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Form skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse ml-auto"></div>
          </div>
        </div>

        {/* Entries list skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
