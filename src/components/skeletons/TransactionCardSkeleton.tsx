import { Skeleton } from "@/components/ui/skeleton";

export function TransactionCardSkeleton() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-muted/20">
      <Skeleton className="h-3.5 w-3.5 rounded-full" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-10" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}
