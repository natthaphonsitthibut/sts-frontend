// Presentation shortcut — temporary. Lets a presenter sign in as each role with
// one click on both local and production. The data is mock, so the owner
// accepted shipping these passwords in the bundle. Remove the whole
// `features/presentation` folder once the presentation is over, then change
// these passwords.

export interface PresentationAccount {
  label: string;
  username: string;
  password: string;
}

const PRESENTATION_PASSWORD = "11111111";

export const presentationAccounts: PresentationAccount[] = [
  { label: "ผู้ดูแลระบบสภา", username: "council.admin" },
  { label: "ผู้บริหารสภา", username: "council.executive" },
  { label: "ผู้ดูแลระบบโรงเรียน", username: "burapha.admin" },
  { label: "ผู้อำนวยการ", username: "burapha.director" },
].map((account) => ({ ...account, password: PRESENTATION_PASSWORD }));
