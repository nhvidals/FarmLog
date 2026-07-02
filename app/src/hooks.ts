import { useQueryClient } from "@tanstack/react-query";
import { UNDO_WINDOW_MS, useApp } from "./context";

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

interface UndoableDeleteOptions<T> {
  /** react-query key of the list the item lives in (must hold an array of T). */
  queryKey: readonly unknown[];
  /** The item being removed; matched by `_id` for optimistic removal + restore. */
  item: T;
  /** Endpoint to DELETE once the undo window elapses. */
  url: string;
  /** Runs after the delete is actually committed on the server (e.g. invalidate). */
  onCommitted?: () => void;
  successMsg?: string;
  errorMsg?: string;
}

/**
 * Returns a function that deletes a list item with an "Undo" grace period:
 * removes it from the cached list immediately, shows an Undo toast, and only
 * commits the server DELETE after UNDO_WINDOW_MS. Pressing Undo restores the
 * cached list and cancels the pending delete. The farm-scoped `api` and the
 * previous list are captured in the closure, so a farm switch during the window
 * still targets the right farm and restores the right cache.
 */
export function useUndoableDelete() {
  const { t, api, showToast } = useApp();
  const queryClient = useQueryClient();
  return <T extends { _id: string }>(opts: UndoableDeleteOptions<T>) => {
    const { queryKey, item, url } = opts;
    const previous = queryClient.getQueryData<T[]>(queryKey);
    queryClient.setQueryData<T[]>(queryKey, (list) =>
      (list ?? []).filter((it) => it._id !== item._id)
    );

    let undone = false;
    const timer = setTimeout(async () => {
      if (undone) return;
      try {
        await api.delete(url);
        opts.onCommitted?.();
      } catch {
        queryClient.setQueryData<T[]>(queryKey, previous);
        showToast("error", opts.errorMsg ?? t.errDelete);
      }
    }, UNDO_WINDOW_MS);

    showToast("success", opts.successMsg ?? t.successDeleted, {
      label: t.undo,
      onPress: () => {
        undone = true;
        clearTimeout(timer);
        queryClient.setQueryData<T[]>(queryKey, previous);
      },
    });
  };
}
