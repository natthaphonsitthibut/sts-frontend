import { Navigate, useLocation, useParams } from "react-router-dom";

export function LegacyRouteRedirect({ to }: { to: string }) {
  const location = useLocation();

  return <Navigate replace to={`${to}${location.search}${location.hash}`} />;
}

export function LegacyTaskDetailRedirect() {
  const location = useLocation();
  const { taskId } = useParams<{ taskId: string }>();

  return (
    <Navigate
      replace
      to={
        taskId
          ? `/tasks/${encodeURIComponent(taskId)}${location.search}${location.hash}`
          : "/"
      }
    />
  );
}
