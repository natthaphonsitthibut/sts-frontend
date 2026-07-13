import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  CalendarCheck,
  ChartNoAxesColumn,
  ClipboardCheck,
  Edit3,
  FileInput,
  FolderHeart,
  GraduationCap,
  HeartHandshake,
  Home,
  Link,
  MapPin,
  Menu,
  Settings,
  Tag,
  UserCheck,
  UserCircle,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";

interface LayoutIconProps {
  className?: string;
  iconName?: string;
}

export function LayoutIcon({ className, iconName }: LayoutIconProps) {
  switch (iconName) {
    case "activity":
      return <Activity className={className} aria-hidden="true" />;
    case "calendar":
      return <Calendar className={className} aria-hidden="true" />;
    case "calendar-check":
      return <CalendarCheck className={className} aria-hidden="true" />;
    case "chart-bar":
      return <BarChart3 className={className} aria-hidden="true" />;
    case "chart-line":
      return <ChartNoAxesColumn className={className} aria-hidden="true" />;
    case "clipboard-check":
      return <ClipboardCheck className={className} aria-hidden="true" />;
    case "edit":
      return <Edit3 className={className} aria-hidden="true" />;
    case "file-import":
      return <FileInput className={className} aria-hidden="true" />;
    case "folder-heart":
      return <FolderHeart className={className} aria-hidden="true" />;
    case "graduation":
      return <GraduationCap className={className} aria-hidden="true" />;
    case "heart-handshake":
      return <HeartHandshake className={className} aria-hidden="true" />;
    case "home":
      return <Home className={className} aria-hidden="true" />;
    case "link":
      return <Link className={className} aria-hidden="true" />;
    case "map-pin":
      return <MapPin className={className} aria-hidden="true" />;
    case "menu":
      return <Menu className={className} aria-hidden="true" />;
    case "notifications":
      return <Bell className={className} aria-hidden="true" />;
    case "settings":
      return <Settings className={className} aria-hidden="true" />;
    case "user-check":
      return <UserCheck className={className} aria-hidden="true" />;
    case "user-circle":
      return <UserCircle className={className} aria-hidden="true" />;
    case "user-graduate":
      return <UserRound className={className} aria-hidden="true" />;
    case "user-plus":
      return <UserPlus className={className} aria-hidden="true" />;
    case "user-tag":
      return <Tag className={className} aria-hidden="true" />;
    case "users-cog":
      return <UserCog className={className} aria-hidden="true" />;
    case "users":
      return <Users className={className} aria-hidden="true" />;
    case "users-round":
      return <UsersRound className={className} aria-hidden="true" />;
    default:
      return <UserRound className={className} aria-hidden="true" />;
  }
}
