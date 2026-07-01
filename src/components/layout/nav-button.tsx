import { useEffect, useRef, useState } from "react";
import { useNavigate, type To } from "react-router-dom";
import { Button, type ButtonProps } from "../base";

interface NavButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Destination route. */
  to: To | number;
}

/**
 * Minimum spin before navigating. Client-side navigation to an already-loaded
 * route is instant, so without this the button would unmount before the spinner
 * paints and the user would see no feedback. Holding the spin briefly makes every
 * page-change button show the same "it's loading" motion as login/refresh.
 */
const SPIN_BEFORE_NAV_MS = 400;

/**
 * A button that navigates to another route and shows the shared spin motion while
 * the page transitions — so changing pages always gives the same loading feedback
 * as the login/refresh buttons.
 */
export function NavButton({ isLoading, to, ...props }: NavButtonProps) {
  const navigate = useNavigate();
  const [navigating, setNavigating] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  function handleClick(): void {
    setNavigating(true);
    timerRef.current = window.setTimeout(() => {
      if (typeof to === "number") {
        navigate(to);
      } else {
        navigate(to);
      }
    }, SPIN_BEFORE_NAV_MS);
  }

  return (
    <Button
      {...props}
      isLoading={navigating || isLoading}
      onClick={handleClick}
    />
  );
}
