import {
  VisitMapPreview,
  type VisitMapPreviewProps,
} from "../../features/tasks/components/VisitMapPreview";

export type LocationMapPickerProps = VisitMapPreviewProps;

/**
 * Shared editable map surface for persisted coordinates.
 *
 * Feature pages own address lookup and persistence; this component owns only
 * map rendering, click/drag selection, coordinate display, and key fallback UI.
 */
export function LocationMapPicker(props: LocationMapPickerProps) {
  return <VisitMapPreview {...props} />;
}
