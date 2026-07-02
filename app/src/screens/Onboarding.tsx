import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Lang, T } from "../i18n";
import { styles } from "../styles";
import { C } from "../theme";

/**
 * First-run experience shown to a signed-in user who has no farms yet. Offers
 * two paths: create a first farm from scratch, or spin up a demo farm seeded
 * with sample data to explore the app immediately.
 */
export function OnboardingScreen({
  t,
  lang,
  setLang,
  onLogout,
  onCreateFarm,
  onSeedSample,
}: {
  t: T;
  lang: Lang;
  setLang: (lang: Lang) => void;
  onLogout: () => void;
  onCreateFarm: (name: string, location: string) => Promise<void>;
  onSeedSample: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState<null | "create" | "sample">(null);
  const [error, setError] = useState("");

  const run = async (kind: "create" | "sample", action: () => Promise<void>) => {
    setError("");
    setBusy(kind);
    try {
      await action();
      // On success the parent swaps in the main UI, so this component unmounts.
    } catch {
      setError(kind === "sample" ? t.errOnboarding : t.errCreateFarm);
      setBusy(null);
    }
  };

  const features = [
    { icon: "🐾", text: t.onboardingFeature1 },
    { icon: "🥚", text: t.onboardingFeature2 },
    { icon: "💊", text: t.onboardingFeature3 },
  ];

  return (
    <View style={styles.onbRoot}>
      {/* Top bar: language + logout */}
      <View style={styles.onbTopBar}>
        <View style={styles.headerActions}>
          <Pressable style={[styles.langPill, lang === "pt" && styles.langPillActive]} onPress={() => setLang("pt")}>
            <Text style={[styles.langPillText, lang === "pt" && styles.langPillTextActive]}>PT</Text>
          </Pressable>
          <Pressable style={[styles.langPill, lang === "en" && styles.langPillActive]} onPress={() => setLang("en")}>
            <Text style={[styles.langPillText, lang === "en" && styles.langPillTextActive]}>EN</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={onLogout} accessibilityLabel={t.logout}>
            <Text style={styles.iconBtnText}>⎋</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.onbScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.onbEmoji}>🌿</Text>
        <Text style={styles.onbTitle}>{t.onboardingWelcome}</Text>
        <Text style={styles.onbSubtitle}>{t.onboardingSubtitle}</Text>

        <View style={styles.onbFeatures}>
          {features.map((f) => (
            <View key={f.text} style={styles.onbFeatureRow}>
              <Text style={styles.onbFeatureIcon}>{f.icon}</Text>
              <Text style={styles.onbFeatureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {!!error && (
          <View style={styles.roleBanner}>
            <Text style={styles.roleBannerText}>{error}</Text>
          </View>
        )}

        {/* Create first farm */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>{t.onboardingCreateTitle}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t.newFarm}
            placeholderTextColor={C.textMuted}
          />
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder={t.locationPlaceholder}
            placeholderTextColor={C.textMuted}
          />
          <Pressable
            style={[styles.primaryBtn, (busy !== null || !name.trim()) && { opacity: 0.6 }]}
            disabled={busy !== null || !name.trim()}
            onPress={() => run("create", () => onCreateFarm(name.trim(), location.trim()))}
          >
            {busy === "create" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{t.createFarm}</Text>
            )}
          </Pressable>
        </View>

        {/* Sample data */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>{t.onboardingSampleTitle}</Text>
          <Text style={styles.dataCardDesc}>{t.onboardingSampleDesc}</Text>
          <Pressable
            style={[styles.outlineBtn, busy !== null && { opacity: 0.6 }]}
            disabled={busy !== null}
            onPress={() => run("sample", onSeedSample)}
          >
            {busy === "sample" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color={C.primary} />
                <Text style={styles.outlineBtnText}>{t.onboardingSeeding}</Text>
              </View>
            ) : (
              <Text style={styles.outlineBtnText}>✨ {t.onboardingSampleBtn}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
