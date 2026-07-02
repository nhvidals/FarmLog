import { createContext, useContext } from "react";
import { Lang, T } from "./i18n";
import { ApiClient } from "./queries";
import { AnimalStatus, FarmRole, Sex } from "./types";

export type TabKey = "inicio" | "animais" | "genealogia" | "incubacao" | "medicacao" | "calendario" | "dados";
export type AnimalSubTab = "animais" | "tipos";
export type AnimalSort = "newest" | "name" | "ring";

export type ToastType = "error" | "success" | "warning";
/** Optional inline action rendered inside a toast (e.g. "Undo"). */
export type ToastAction = { label: string; onPress: () => void };
export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
};

/** How long an undoable delete waits before committing (and the toast stays up). */
export const UNDO_WINDOW_MS = 5000;

/** Cross-cutting dependencies shared by every screen (stable for a given session/farm). */
export interface AppContextValue {
  t: T;
  lang: Lang;
  api: ApiClient; // farm-scoped client (sends x-farm-id)
  farmsApi: ApiClient; // farms client (no farm scope)
  farmId: string;
  token: string;
  /** Caller's role on the active farm; drives write/manage gating. */
  role: FarmRole;
  /** Owner or worker: may create/edit/delete farm data. */
  canWrite: boolean;
  /** Owner only: may manage members and delete the farm. */
  canManage: boolean;
  showToast: (type: ToastType, message: string, action?: ToastAction) => void;
  confirm: (opts: ConfirmOptions) => void;

  // Navigation helpers, so one screen can deep-link into another.
  setTab: (tab: TabKey) => void;
  setAnimalSubTab: (sub: AnimalSubTab) => void;
  focusAnimals: (opts?: { status?: AnimalStatus | "all"; sex?: Sex | "all" }) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = AppContext.Provider;

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
