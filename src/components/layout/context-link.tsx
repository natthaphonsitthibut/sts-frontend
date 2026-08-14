import { Link, type LinkProps } from "react-router-dom";
import { useContextualNavigationState } from "./navigation-context";

/**
 * Internal link to a shared detail route. It records the current page as the
 * breadcrumb/back/sidebar owner while retaining normal anchor semantics.
 */
export function ContextLink({ state, ...props }: LinkProps) {
  const contextualState = useContextualNavigationState(state);
  return <Link {...props} state={contextualState} />;
}
