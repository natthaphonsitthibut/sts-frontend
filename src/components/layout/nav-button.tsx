import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, type ButtonProps } from "../base";

interface NavButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Destination route. */
  to: string;
}

/**
 * A button that navigates to another route and shows the shared spin motion while
 * the page transitions/lazy-loads — so changing pages always gives the same
 * "it's loading" feedback as the login/refresh buttons. The spin clears naturally
 * when this button unmounts on navigation.
 */
export function NavButton({ isLoading, to, ...props }: NavButtonProps) {
  const navigate = useNavigate();
  const [navigating, setNavigating] = useState(false);
  return (
    <Button
      {...props}
      isLoading={navigating || isLoading}
      onClick={() => {
        setNavigating(true);
        void navigate(to);
      }}
    />
  );
}
