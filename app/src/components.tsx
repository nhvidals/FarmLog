import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AnimalCategory, Sex } from "./types";
import { T } from "./i18n";
import { C } from "./theme";

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

export function SectionHeader({
  title,
  count,
  onAdd,
  open,
}: {
  title: string;
  count?: number;
  onAdd?: () => void;
  open?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{count}</Text>
          </View>
        )}
      </View>
      {onAdd && (
        <Pressable style={[styles.addBtn, open && styles.addBtnOpen]} onPress={onAdd}>
          <Text style={[styles.addBtnText, open && styles.addBtnTextOpen]}>
            {open ? "✕ Close" : "+ Add"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>{icon}</Text>
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

export function TreeNode({
  node,
  t,
  role,
  categoryOf,
}: {
  node: any;
  t: T;
  role?: "father" | "mother";
  categoryOf: (designation?: string) => AnimalCategory | undefined;
}) {
  if (!node) return null;
  const isMale = node.sex === "male";
  const accent = isMale ? C.male : C.female;
  const accentBg = isMale ? C.maleBg : C.femaleBg;
  const category = categoryOf(node.designation);
  const hasParents = node.father || node.mother;

  return (
    <View style={styles.treeNodeWrap}>
      {role && (
        <View style={[styles.treeRoleTag, { backgroundColor: accentBg }]}>
          <Text style={[styles.treeRoleTagText, { color: accent }]}>
            {role === "father" ? `♂ ${t.father}` : `♀ ${t.mother}`}
          </Text>
        </View>
      )}

      <View style={[styles.treeCard, { borderLeftColor: accent }]}>
        <View style={styles.treeCardRow}>
          <View style={[styles.treeAvatar, { backgroundColor: accentBg, borderColor: accent }]}>
            {node.photoUrl ? (
              <Image source={{ uri: node.photoUrl }} style={styles.treeAvatarImg} />
            ) : (
              <Text style={[styles.treeAvatarGlyph, { color: accent }]}>{isMale ? "♂" : "♀"}</Text>
            )}
          </View>
          <View style={styles.treeCardInfo}>
            <View style={styles.treeCardTitleRow}>
              <Text style={styles.treeCardName} numberOfLines={1}>{node.name}</Text>
              <Text style={styles.treeCardRing}>#{node.ringNumber}</Text>
            </View>
            <Text style={styles.treeCardDesignation} numberOfLines={1}>{node.designation}</Text>
            <View style={styles.treeBadges}>
              <Badge label={t.sexLabels[node.sex as Sex]} color={accent} bg={accentBg} />
              {category && (
                <Badge
                  label={t.categoryLabels[category]}
                  color={category === "oviparous" ? C.ovi : C.vivi}
                  bg={category === "oviparous" ? C.oviBg : C.viviBg}
                />
              )}
            </View>
          </View>
        </View>
      </View>

      {hasParents && (
        <View style={styles.treeParents}>
          {node.father && <TreeNode node={node.father} t={t} role="father" categoryOf={categoryOf} />}
          {node.mother && <TreeNode node={node.mother} t={t} role="mother" categoryOf={categoryOf} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Field label
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSub,
    marginBottom: 4,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    letterSpacing: 0.2,
  },
  countPill: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.border,
  },
  addBtnOpen: {
    backgroundColor: C.dangerBg,
    borderColor: C.danger,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.primary,
  },
  addBtnTextOpen: {
    color: C.danger,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyStateIcon: {
    fontSize: 40,
    opacity: 0.4,
  },
  emptyStateText: {
    fontSize: 14,
    color: C.textMuted,
    fontStyle: "italic",
  },

  // Tree node
  treeNodeWrap: {
    // wraps a node card together with its parent branch
  },
  treeRoleTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 6,
  },
  treeRoleTagText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  treeCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    padding: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    elevation: 1,
  },
  treeCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  treeAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  treeAvatarImg: {
    width: "100%",
    height: "100%",
  },
  treeAvatarGlyph: {
    fontSize: 22,
    fontWeight: "800",
  },
  treeCardInfo: {
    flex: 1,
    gap: 3,
  },
  treeCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  treeCardName: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    flexShrink: 1,
  },
  treeCardRing: {
    fontSize: 11,
    color: C.textMuted,
    backgroundColor: C.bg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: "700",
  },
  treeCardDesignation: {
    fontSize: 12,
    color: C.textSub,
  },
  treeBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  treeParents: {
    marginTop: 12,
    marginLeft: 22,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
    gap: 12,
  },
});
