/**
 * หมายเหตุ cell shared by the authenticated and teacher-link rosters. Plain body
 * text like every other data column — the note is free text of any length, so it
 * is truncated to keep the column from stretching the table, with the full text
 * on hover.
 */
export function StudentCommentCell({ comment }: { comment?: string | null }) {
  const text = comment?.trim();
  if (!text) return <span className="text-slate-400">-</span>;
  return (
    <span className="block truncate text-slate-900" title={text}>
      {text}
    </span>
  );
}
