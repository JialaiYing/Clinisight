export function Hero() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Inpatient medication safety
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Catch high-risk med combinations before they reach the bedside
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Estimate six adverse drug event risks from labs and medications, then simulate a
          safer regimen before you prescribe.
        </p>
      </div>
    </section>
  );
}
