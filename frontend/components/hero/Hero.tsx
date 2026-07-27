export function Hero() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Predict adverse drug events before they happen
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Estimate the risk of six medication-related complications from a patient&apos;s
          vitals, labs, and medications.
        </p>
      </div>
    </section>
  );
}
