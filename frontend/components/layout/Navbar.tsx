export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="text-base font-semibold tracking-tight">Clinisight</span>
        <nav className="flex items-center gap-5">
          <a
            href="#model-card"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Model card
          </a>
          <a
            href="#about"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
