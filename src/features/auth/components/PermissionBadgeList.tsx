import { Badge } from "../../../components/base";
import { usePermissionCatalog } from "../hooks/usePermissionCatalog";

interface PermissionBadgeListProps {
  permissions: string[];
}

export function PermissionBadgeList({ permissions }: PermissionBadgeListProps) {
  const { labelOf } = usePermissionCatalog();

  if (permissions.length === 0) {
    return <span className="text-sm text-slate-500">-</span>;
  }

  return permissions.map((permission) => (
    <Badge key={permission} variant="secondary">
      {labelOf(permission)}
    </Badge>
  ));
}
