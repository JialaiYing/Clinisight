export function ExplanationList({ factors }: { factors: string[] }) {
  if (factors.length === 0) {
    return <p className="text-sm text-muted-foreground">No notable contributing factors.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {factors.map((factor) => (
        <li key={factor} className="flex gap-2 text-sm text-muted-foreground">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-current" />
          <span>{factor}</span>
        </li>
      ))}
    </ul>
  );
}
