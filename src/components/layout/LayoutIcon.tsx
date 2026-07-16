import { Menu, Tag, UserRound } from "lucide-react";
import { NotificationsIcon } from "../base";
import { PAGE_ICONS, type PageIconName } from "./page-identity";

interface LayoutIconProps {
  className?: string;
  iconName?: string;
}

export function LayoutIcon({ className, iconName }: LayoutIconProps) {
  const Icon = iconName ? PAGE_ICONS[iconName as PageIconName] : undefined;
  if (Icon) return <Icon className={className} aria-hidden="true" />;

  switch (iconName) {
    case "menu":
      return <Menu className={className} aria-hidden="true" />;
    case "notifications":
      return <NotificationsIcon className={className} aria-hidden="true" />;
    case "user-tag":
      return <Tag className={className} aria-hidden="true" />;
    default:
      return <UserRound className={className} aria-hidden="true" />;
  }
}
