const Bone = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
);

const ResultSkeleton = () => (
  <div className="min-h-screen bg-background pb-32">
    {/* Header */}
    <div className="flex items-center justify-between px-5 pt-5">
      <Bone className="h-10 w-10 rounded-full" />
      <Bone className="h-10 w-10 rounded-full" />
    </div>

    {/* Product Info */}
    <div className="mt-6 flex flex-col items-center px-6">
      <Bone className="h-3 w-20" />
      <Bone className="mt-2 h-5 w-48" />

      {/* Score ring placeholder */}
      <div className="mt-6 flex flex-col items-center">
        <Bone className="h-36 w-36 rounded-full" />
        <Bone className="mt-3 h-5 w-16 rounded-full" />
      </div>
    </div>

    {/* Score breakdown */}
    <div className="mt-10 px-6">
      <Bone className="h-3 w-32 mb-3" />
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-3/4" />
      </div>

      <Bone className="mt-6 h-3 w-28 mb-4" />
      <div className="space-y-3">
        <Bone className="h-28 w-full rounded-2xl" />
        <Bone className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  </div>
);

export default ResultSkeleton;
