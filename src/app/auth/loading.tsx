export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Form fields skeleton */}
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Button skeleton */}
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>

          {/* Link skeleton */}
          <div className="text-center">
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>
        </div>

        {/* Bottom button skeleton */}
        <div className="mt-4 h-10 w-full bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
}
