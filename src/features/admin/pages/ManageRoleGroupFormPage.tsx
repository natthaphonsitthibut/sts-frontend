import { Navigate } from "react-router-dom";

/** Legacy deep links now return to the school-scoped list, which owns create/edit dialogs. */
export function ManageRoleGroupFormPage() {
  return <Navigate replace to="/manage-role-groups" />;
}
