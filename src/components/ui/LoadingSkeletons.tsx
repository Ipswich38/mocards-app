import React from 'react';

export const SkeletonBase: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className = '', children }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200
    bg-[length:200%_100%] animate-[shimmer_2s_infinite] rounded ${className}`}
  >
    {children}
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
    <div className="flex items-center justify-between">
      <SkeletonBase className="h-6 w-32" />
      <SkeletonBase className="h-5 w-20" />
    </div>
    <SkeletonBase className="h-4 w-48" />
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-20" />
        <SkeletonBase className="h-5 w-24" />
      </div>
      <div className="space-y-2">
        <SkeletonBase className="h-3 w-20" />
        <SkeletonBase className="h-5 w-24" />
      </div>
    </div>
    <div className="space-y-2">
      <SkeletonBase className="h-4 w-16" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBase key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <SkeletonBase className="h-8 w-64" />
      <SkeletonBase className="h-4 w-48" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <SkeletonBase className="h-5 w-24" />
          <SkeletonBase className="h-8 w-16" />
          <SkeletonBase className="h-3 w-32" />
        </div>
      ))}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <SkeletonBase className="h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="space-y-2 flex-1">
                <SkeletonBase className="h-4 w-32" />
                <SkeletonBase className="h-3 w-24" />
              </div>
              <SkeletonBase className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <SkeletonBase className="h-6 w-36" />
        <SkeletonBase className="h-64 w-full" />
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    {/* Header */}
    <div className="border-b border-gray-200 bg-gray-50 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBase key={i} className="h-4 w-20" />
        ))}
      </div>
    </div>

    {/* Rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBase key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FormSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
    <SkeletonBase className="h-6 w-48" />

    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBase className="h-4 w-24" />
          <SkeletonBase className="h-10 w-full" />
        </div>
      ))}
    </div>

    <div className="flex justify-end space-x-3">
      <SkeletonBase className="h-10 w-20" />
      <SkeletonBase className="h-10 w-24" />
    </div>
  </div>
);

export const ButtonSkeleton: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32'
  };

  return <SkeletonBase className={sizeClasses[size]} />;
};