import { ClipboardList } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <ClipboardList className="size-6 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">
        Fill out the patient form above and run a prediction to see risk results here.
      </p>
    </div>
  );
}
