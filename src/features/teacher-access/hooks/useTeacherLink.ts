import { useOutletContext } from "react-router-dom";
import type { TeacherLinkCredential } from "../store/teacher-link-session.store";
import type { TeacherAccessContext } from "../types/teacher-access.types";

export interface TeacherLinkOutletContext {
  credential: TeacherLinkCredential;
  context: TeacherAccessContext;
}

/** Verified link credential + teacher context, provided by `TeacherLinkLayout`. */
export function useTeacherLink(): TeacherLinkOutletContext {
  return useOutletContext<TeacherLinkOutletContext>();
}
