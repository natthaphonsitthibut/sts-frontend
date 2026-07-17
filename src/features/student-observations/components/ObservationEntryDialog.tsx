import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/base";

export function ObservationEntryDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto" onClose={onClose}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
