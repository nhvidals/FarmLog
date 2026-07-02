import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Badge } from "../components";
import { useApp } from "../context";
import { fmt } from "../i18n";
import { qk, useFarmMembers } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";
import { ASSIGNABLE_FARM_ROLES, AssignableFarmRole, FarmMember } from "../types";

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  owner: { color: C.primary, bg: C.primaryLight },
  worker: { color: C.male, bg: C.maleBg },
  vet: { color: C.ovi, bg: C.oviBg },
};

export function MembersModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, farmsApi, farmId, showToast, confirm } = useApp();
  const queryClient = useQueryClient();
  const membersQuery = useFarmMembers(farmsApi, farmId, visible);
  const members = membersQuery.data ?? [];

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableFarmRole>("worker");
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.members(farmId) });

  const addMember = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await farmsApi.post(`/farms/${farmId}/members`, { email: email.trim(), role });
      setEmail("");
      refresh();
      showToast("success", t.successMemberAdded);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      showToast("error", status === 404 ? t.errMemberNotFound : t.errAddMember);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (member: FarmMember, next: AssignableFarmRole) => {
    if (member.role === next) return;
    try {
      await farmsApi.put(`/farms/${farmId}/members/${member.userId}`, { role: next });
      refresh();
      showToast("success", t.successRoleChanged);
    } catch {
      showToast("error", t.errChangeRole);
    }
  };

  const removeMember = (member: FarmMember) => {
    confirm({
      title: t.confirmRemoveMemberTitle,
      message: fmt(t.confirmRemoveMemberMsg, { name: member.email }),
      confirmLabel: t.remove,
      onConfirm: async () => {
        try {
          await farmsApi.delete(`/farms/${farmId}/members/${member.userId}`);
          refresh();
          showToast("success", t.successMemberRemoved);
        } catch {
          showToast("error", t.errRemoveMember);
        }
      },
    });
  };

  const others = members.filter((m) => m.role !== "owner");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { maxHeight: "85%" }]} onPress={() => {}}>
          <View style={styles.membersHeader}>
            <Text style={styles.modalTitle}>{t.membersTitle}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={t.a11yClose}>
              <Text style={styles.membersClose}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {membersQuery.isLoading ? (
              <ActivityIndicator color={C.primary} style={{ paddingVertical: 20 }} />
            ) : (
              members.map((member) => (
                <View key={member.userId} style={styles.memberRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
                    <View style={{ marginTop: 4 }}>
                      <Badge
                        label={t.roleLabels[member.role]}
                        color={ROLE_COLORS[member.role].color}
                        bg={ROLE_COLORS[member.role].bg}
                      />
                    </View>
                  </View>
                  {member.role !== "owner" && (
                    <View style={styles.memberActions}>
                      {ASSIGNABLE_FARM_ROLES.map((r) => (
                        <Pressable
                          key={r}
                          style={[styles.chip, member.role === r && styles.chipActive]}
                          onPress={() => changeRole(member, r)}
                        >
                          <Text style={[styles.chipText, member.role === r && styles.chipTextActive]}>
                            {t.roleLabels[r]}
                          </Text>
                        </Pressable>
                      ))}
                      <Pressable style={styles.memberRemoveBtn} onPress={() => removeMember(member)} accessibilityLabel={`${t.delete} ${member.email}`}>
                        <Text style={styles.memberRemoveText}>🗑</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
            {!membersQuery.isLoading && others.length === 0 && (
              <Text style={styles.treeHint}>{t.noOtherMembers}</Text>
            )}
          </ScrollView>

          {/* Add member */}
          <View style={styles.memberAddForm}>
            <Text style={styles.formCardTitle}>{t.addMember}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t.memberEmailPlaceholder}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.segmentRow}>
              {ASSIGNABLE_FARM_ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.segment, role === r && styles.segmentActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.segmentText, role === r && styles.segmentTextActive]}>{t.roleLabels[r]}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={addMember} disabled={busy}>
              <Text style={styles.primaryBtnText}>{t.addMember}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
