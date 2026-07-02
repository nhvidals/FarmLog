import { useApp } from "./context";

interface ConfirmDeleteOptions {
  /** Endpoint to DELETE (already farm-scoped via the shared api client). */
  url: string;
  /** Runs after a successful delete — typically a cache invalidation. */
  onDeleted?: () => void;
  /** Confirmation dialog copy; defaults to the generic "delete record" strings. */
  title?: string;
  message?: string;
  /** Toast copy; defaults to the generic deleted/failed strings. */
  successMsg?: string;
  errorMsg?: string;
}

/**
 * Returns a function that runs the standard delete flow: show the confirmation
 * dialog, DELETE on confirm, then invalidate + toast. Centralizes the block that
 * was duplicated across the record screens (medication, incubation, log, events).
 */
export function useConfirmDelete() {
  const { t, api, confirm, showToast } = useApp();
  return (opts: ConfirmDeleteOptions) => {
    confirm({
      title: opts.title ?? t.confirmDeleteRecordTitle,
      message: opts.message ?? t.confirmDeleteRecordMsg,
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await api.delete(opts.url);
          opts.onDeleted?.();
          showToast("success", opts.successMsg ?? t.successDeleted);
        } catch {
          showToast("error", opts.errorMsg ?? t.errDelete);
        }
      },
    });
  };
}
