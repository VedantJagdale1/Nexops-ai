export function BrandMark(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="bg-ink text-canvas relative grid size-9 place-items-center overflow-hidden rounded-xl shadow-sm dark:bg-white dark:text-slate-950"
    >
      <span className="bg-brand-400 absolute left-2 top-2 h-4 w-1.5 rotate-[-32deg] rounded-full" />
      <span className="absolute right-2 top-2 h-4 w-1.5 rotate-[32deg] rounded-full bg-current" />
      <span className="absolute bottom-2 h-1.5 w-4 rounded-full bg-current" />
    </span>
  );
}
