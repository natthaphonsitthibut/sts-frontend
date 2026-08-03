export interface PhotoPickerValue {
  /** Newly chosen file, pending upload. */
  file: File | null;
  /** True once the user clears an already-stored photo. */
  removed: boolean;
}

/** Starting state for a form that has not touched its photo field yet. */
export const EMPTY_PHOTO_PICKER_VALUE: PhotoPickerValue = {
  file: null,
  removed: false,
};
