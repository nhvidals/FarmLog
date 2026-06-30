import { StyleSheet } from "react-native";
import { C } from "./theme";

/** Screen-level styles for App. Component-local styles live in components.tsx. */
export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.tabBg,
  },

  // ── Header ──
  header: {
    backgroundColor: C.primaryDark,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#a0c8a0",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4a7a4a",
    backgroundColor: "transparent",
  },
  langPillActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a0c8a0",
  },
  langPillTextActive: {
    color: "#1b2e1b",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2d5a2d",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    backgroundColor: C.accent,
  },
  iconBtnText: {
    fontSize: 16,
    color: "#ffffff",
  },
  serverDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#1b4332",
  },
  serverDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  serverDotOnline: {
    backgroundColor: "#4ade80",
  },
  serverDotOffline: {
    backgroundColor: C.danger,
  },
  serverDotChecking: {
    backgroundColor: C.accent,
  },
  serverStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  serverStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7ab07a",
  },

  // Farm bar
  farmBar: {
    marginTop: 2,
  },
  farmBarInner: {
    gap: 6,
    paddingVertical: 2,
  },
  farmPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#2d5a2d",
    borderWidth: 1,
    borderColor: "#3d7a3d",
  },
  farmPillActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  farmPillName: {
    flexShrink: 1,
  },
  farmPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#a0c8a0",
  },
  farmPillTextActive: {
    color: "#1b2e1b",
    fontWeight: "700",
  },
  farmPillDelete: {
    marginLeft: 4,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  farmPillDeleteText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4a7a4a",
    lineHeight: 18,
  },
  farmPillDeleteTextActive: {
    color: "#1b2e1b",
  },
  farmPillNew: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4a7a4a",
    borderStyle: "dashed",
  },
  farmPillNewOpen: {
    borderColor: C.danger,
  },
  farmPillNewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7ab07a",
  },

  // Panels
  panel: {
    backgroundColor: "#1e3d1e",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#2d5a2d",
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7ab07a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  panelRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtnText: {
    fontSize: 20,
    color: "#fff",
  },

  // Confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
  },
  modalMessage: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textSub,
  },
  modalBtnDanger: {
    backgroundColor: C.danger,
  },
  modalBtnDangerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Toast banner
  toast: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.danger,
  },
  toastError: {
    backgroundColor: C.dangerBg,
    borderColor: C.danger,
  },
  toastSuccess: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  toastWarning: {
    backgroundColor: C.warningBg,
    borderColor: C.warning,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  toastDismiss: {
    fontSize: 16,
    color: C.textMuted,
    fontWeight: "700",
  },

  // ── Scroll content ──
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 24,
  },

  // Form card
  formCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
    elevation: 2,
    gap: 2,
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textSub,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Input
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    fontSize: 14,
    color: C.text,
  },

  // Segment control
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSub,
  },
  segmentTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Chips
  chipRow: {
    gap: 6,
    paddingBottom: 4,
    paddingTop: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSub,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Buttons
  primaryBtn: {
    backgroundColor: C.primary,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  outlineBtn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: "transparent",
  },
  outlineBtnText: {
    color: C.primary,
    fontWeight: "700",
    fontSize: 15,
  },

  // Preview image
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
  },

  // Cards
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    borderWidth: 1,
    borderColor: C.border,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTopLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
  },
  cardSub: {
    fontSize: 13,
    color: C.textSub,
    marginTop: 2,
  },
  cardBadges: {
    gap: 4,
    alignItems: "flex-end",
  },
  cardMeta: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  cardMetaText: {
    fontSize: 12,
    color: C.textMuted,
  },

  // Tree
  treeContainer: {
    marginTop: 4,
  },
  treeHint: {
    fontSize: 13,
    color: C.textMuted,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  linkHint: {
    fontSize: 14,
    color: C.primary,
    fontWeight: "700",
    paddingVertical: 8,
  },

  // Sub-tabs (inside Animais)
  subTabRow: {
    flexDirection: "row",
    backgroundColor: C.divider,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  subTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  subTabActive: {
    backgroundColor: C.surface,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    elevation: 1,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textSub,
  },
  subTabTextActive: {
    color: C.primary,
  },
  typeDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.danger,
  },
  typeDeleteBtnText: {
    fontSize: 14,
  },

  // Incubation result form (inside batch card)
  resultForm: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  resultRow: {
    flexDirection: "row",
    gap: 10,
  },
  resultField: {
    flex: 1,
  },

  // Card actions
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    paddingTop: 8,
  },
  cardActionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardActionBtnDanger: {
    backgroundColor: C.dangerBg,
    borderColor: C.danger,
  },
  cardActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSub,
  },
  cardActionBtnTextDanger: {
    color: C.danger,
  },

  // Data cards
  dataCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    gap: 14,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    elevation: 1,
  },
  dataCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dataCardIconText: {
    fontSize: 26,
  },
  dataCardBody: {
    flex: 1,
    gap: 4,
  },
  dataCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  dataCardDesc: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 18,
  },

  // Bottom tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.tabBg,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a3d2a",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    position: "relative",
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.45,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.tabText,
  },
  tabLabelActive: {
    color: C.tabActive,
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.tabActive,
  },
});
