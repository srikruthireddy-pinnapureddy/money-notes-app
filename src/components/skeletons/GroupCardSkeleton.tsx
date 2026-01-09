import { Skeleton } from "@/components/ui/skeleton";

export function GroupCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      {/* Member Avatars */}
      <div className="flex items-center gap-1 mb-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton
            key={i}
            className="w-8 h-8 rounded-full"
            style={{ marginLeft: i > 0 ? "-6px" : "0" }}
          />
        ))}
      </div>

      {/* Total Spent */}
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Balance Status */}
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
