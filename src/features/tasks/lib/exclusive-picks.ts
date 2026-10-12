/**
 * An exclusive option (`ปกติ / ไม่มีปัจจัยเสี่ยง`, `ไม่มีผู้ปกครอง`) cannot sit
 * beside any other: ticking it clears the rest, and ticking anything else
 * clears it — so the last tick always wins and the form never holds a
 * combination the server would reject.
 */
export function resolveExclusivePicks(
  previous: string[],
  next: string[],
  options: Array<{ code: string; isExclusive: boolean }>,
): string[] {
  const exclusiveCodes = new Set(
    options.filter((option) => option.isExclusive).map((option) => option.code),
  );
  const added = next.find((code) => !previous.includes(code));
  return added && exclusiveCodes.has(added)
    ? [added]
    : next.filter((code) => !exclusiveCodes.has(code));
}
