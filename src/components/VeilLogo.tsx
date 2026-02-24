export function VeilLogo() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-veil-accent opacity-10 blur-xl scale-150" />
        <span className="relative font-display text-4xl text-veil-accent tracking-widest">veil</span>
      </div>
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-veil-accentDim to-transparent" />
    </div>
  );
}