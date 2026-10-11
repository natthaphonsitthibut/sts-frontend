/** Controlled pickers/radios need their visible trigger focused after RHF validation. */
export function focusReferralFormError(
  root: HTMLElement | null,
  errors: Record<string, unknown>,
): void {
  const firstField = Object.keys(errors)[0];
  if (!root || !firstField) return;
  const wrapper = [
    ...root.querySelectorAll<HTMLElement>("[data-referral-field]"),
  ].find((field) => field.dataset.referralField === firstField);
  const control = wrapper?.querySelector<HTMLElement>(
    "input, button, textarea",
  );
  control?.scrollIntoView({ behavior: "smooth", block: "center" });
  control?.focus({ preventScroll: true });
}
