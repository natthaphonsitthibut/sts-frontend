import { Alert, AlertDescription, Button } from "../../../components/base";
import {
  getLoginMutationErrorMessage,
  useAdminLogin,
} from "../../auth/hooks/useAdminLogin";
import { LoginDivider } from "../../auth/components/LoginDivider";
import { presentationAccounts } from "../lib/presentation-accounts";

// Presentation shortcut — temporary; see presentation-accounts.ts.
export function PresentationLoginButtons() {
  const loginMutation = useAdminLogin();

  if (presentationAccounts.length === 0) return null;

  const pendingUsername = loginMutation.isPending
    ? loginMutation.variables?.username
    : undefined;

  return (
    <div data-presentation-login>
      <LoginDivider />
      {loginMutation.isError ? (
        <Alert className="mb-3" variant="destructive">
          <AlertDescription>
            {getLoginMutationErrorMessage(loginMutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {presentationAccounts.map((account) => (
          <Button
            disabled={loginMutation.isPending}
            isLoading={pendingUsername === account.username}
            key={account.username}
            loadingText="กำลังเข้าสู่ระบบ"
            size="sm"
            onClick={() =>
              loginMutation.mutate({
                username: account.username,
                password: account.password,
              })
            }
            type="button"
            variant="outline"
          >
            {account.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
