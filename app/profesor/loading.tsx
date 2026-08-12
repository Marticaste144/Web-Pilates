import { CardListSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-neutral-200" />
      </div>
      <CardListSkeleton rows={4} />
    </div>
  );
}
