export function contactChannelRequiresDetail(
  options: ReadonlyArray<{ code: string; requiresDetail: boolean }>,
  code: string,
): boolean {
  return options.some(
    (option) => option.code === code && option.requiresDetail,
  );
}
