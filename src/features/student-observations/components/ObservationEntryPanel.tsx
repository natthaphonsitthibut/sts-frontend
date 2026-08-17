import {
  useCreateManagedStudentObservation,
  useManagedObservationCatalog,
  useManagedStudentObservations,
} from "../hooks/useStudentObservations";
import { ObservationWorkspace } from "./ObservationWorkspace";

/** Records a teacher observation only; home-visit requests are retired. */
export function ManagedObservationEntryPanel({
  studentTermId,
  studentName,
  timetableSlotId,
}: {
  studentTermId: string;
  studentName: string;
  timetableSlotId?: number;
}) {
  const catalog = useManagedObservationCatalog();
  const observations = useManagedStudentObservations(studentTermId);
  const create = useCreateManagedStudentObservation(studentTermId);
  const rows = observations.data?.data ?? [];

  return (
    <ObservationWorkspace
      catalog={catalog.data}
      context={{ timetableSlotId }}
      error={create.error}
      isError={catalog.isError || observations.isError}
      isLoading={catalog.isLoading || observations.isLoading}
      isSaving={create.isPending}
      loadError={catalog.error ?? observations.error}
      observations={rows}
      onCreate={(input) =>
        create.mutateAsync({
          timetableSlotId: input.timetableSlotId,
          dimensionCode: input.dimensionCode,
          concernLevel: input.concernLevel,
          tagCodes: input.tagCodes,
          comment: input.comment,
        })
      }
      onRetry={() => {
        void catalog.refetch();
        void observations.refetch();
      }}
      studentName={studentName}
    />
  );
}
