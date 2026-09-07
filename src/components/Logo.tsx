export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-start leading-none ${className}`}>
      <span className="text-xl font-extrabold tracking-tight text-primary">
        ISP<span className="text-foreground">360</span>
      </span>
      <span className="mt-0.5 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground">
        BILLING SYSTEM
      </span>
    </div>
  );
}
