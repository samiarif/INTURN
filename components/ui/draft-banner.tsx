// Sprint 3 wireframe: yellow strip telling the user the artefact stays
// private until publish. Pure amber regardless of theme — same warning
// affordance in both light & dark mode, intentionally hard-coded.
export function DraftBanner({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] text-[12.5px] text-[#78350F] mb-6 rounded-md">
      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] flex-shrink-0" aria-hidden />
      <span>
        {title ? <b className="text-[#92400E] font-semibold">{title}</b> : null}
        {title ? ' — ' : null}
        {message}
      </span>
    </div>
  );
}
