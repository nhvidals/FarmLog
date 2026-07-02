import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { createApi } from "./src/api";
import {
  AnimalSort,
  AnimalSubTab,
  AppProvider,
  ConfirmOptions,
  TabKey,
  ToastType,
} from "./src/context";
import { fmt, Lang, T, translations } from "./src/i18n";
import { LoginScreen } from "./src/LoginScreen";
import { ApiClient, makeQueryClient, useFarms } from "./src/queries";
import { AnimalsScreen } from "./src/screens/Animals";
import { CalendarScreen } from "./src/screens/Calendar";
import { DashboardScreen } from "./src/screens/Dashboard";
import { DataScreen } from "./src/screens/Data";
import { GenealogyScreen } from "./src/screens/Genealogy";
import { IncubationScreen } from "./src/screens/Incubation";
import { MedicationScreen } from "./src/screens/Medication";
import { MembersModal } from "./src/screens/Members";
import { OnboardingScreen } from "./src/screens/Onboarding";
import { clearSession, loadSession, saveSession } from "./src/storage";
import { styles } from "./src/styles";
import { C } from "./src/theme";
import { AnimalStatus, Farm, Sex } from "./src/types";

const TAB_KEYS: TabKey[] = ["inicio", "animais", "genealogia", "incubacao", "medicacao", "calendario", "dados"];
const TAB_LABEL_KEYS: Record<TabKey, keyof T> = {
  inicio: "tabHome",
  animais: "tabAnimals",
  genealogia: "tabGenealogy",
  incubacao: "tabIncubation",
  medicacao: "tabMedication",
  calendario: "tabCalendar",
  dados: "tabData",
};
const TAB_ICONS: Record<TabKey, string> = {
  inicio: "🏠",
  animais: "🐾",
  genealogia: "🌳",
  incubacao: "🥚",
  medicacao: "💊",
  calendario: "📅",
  dados: "📦",
};

// Each App instance gets its own QueryClient (and cache); the provider wraps the
// whole tree so every screen can read the shared server state.
export default function App() {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

function AppInner() {
  const queryClient = useQueryClient();

  const [lang, setLang] = useState<Lang>("pt");
  const t = translations[lang];

  const defaultApiBaseUrl = Platform.select({
    android: "http://10.0.2.2:4000",
    ios: "http://localhost:4000",
    default: "http://localhost:4000",
  });
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [showFarmForm, setShowFarmForm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const [tab, setTab] = useState<TabKey>("inicio");
  const [animalSubTab, setAnimalSubTab] = useState<AnimalSubTab>("animais");

  // Animals-tab view state (kept here so the Dashboard can deep-link into it).
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AnimalStatus | "all">("all");
  const [filterSex, setFilterSex] = useState<Sex | "all">("all");
  const [sortBy, setSortBy] = useState<AnimalSort>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [serverStatus, setServerStatus] = useState<"online" | "offline" | "checking">("checking");
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Drop the dead session and return to the login screen; also clears the query
  // cache so the next user never sees the previous user's data.
  const handleLogout = useCallback(() => {
    clearSession();
    setToken("");
    setUserEmail("");
    setSelectedFarmId("");
    setShowSettings(false);
    queryClient.clear();
  }, [queryClient]);

  const api = useMemo(
    () => createApi(apiBaseUrl, selectedFarmId, token, handleLogout) as unknown as ApiClient,
    [apiBaseUrl, selectedFarmId, token, handleLogout]
  );
  const farmsApi = useMemo(
    () => createApi(apiBaseUrl, "", token, handleLogout) as unknown as ApiClient,
    [apiBaseUrl, token, handleLogout]
  );

  const farmsQuery = useFarms(farmsApi, token);
  const farms = useMemo<Farm[]>(() => farmsQuery.data ?? [], [farmsQuery.data]);

  const handleAuthenticated = (newToken: string, email: string) => {
    setUserEmail(email);
    setToken(newToken);
    saveSession(newToken, email);
  };

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  // Poll the API health endpoint so the header dot reflects connectivity.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!cancelled) setServerStatus("checking");
      try {
        await farmsApi.get("/health", { timeout: 3000 });
        if (!cancelled) setServerStatus("online");
      } catch {
        if (!cancelled) setServerStatus("offline");
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [farmsApi]);

  // Keep the selected farm valid: pick the first farm when the current one is
  // gone (or none is chosen), and clear the selection when there are no farms.
  useEffect(() => {
    if (!farms.length) {
      setSelectedFarmId("");
      return;
    }
    setSelectedFarmId((cur) => (cur && farms.some((f) => f._id === cur) ? cur : farms[0]._id));
  }, [farms]);

  // Restore a persisted session on cold start before deciding what to render.
  useEffect(() => {
    loadSession().then(({ token: savedToken, email }) => {
      if (savedToken) {
        setUserEmail(email);
        setToken(savedToken);
      }
      setSessionLoaded(true);
    });
  }, []);

  const focusAnimals = useCallback((opts?: { status?: AnimalStatus | "all"; sex?: Sex | "all" }) => {
    setTab("animais");
    setAnimalSubTab("animais");
    if (opts?.status !== undefined) setFilterStatus(opts.status);
    if (opts?.sex !== undefined) setFilterSex(opts.sex);
    if (opts?.status || opts?.sex) setShowFilters(true);
  }, []);

  const createFarm = async () => {
    if (!farmName.trim()) {
      showToast("warning", t.valFarmName);
      return;
    }
    try {
      const res = await farmsApi.post<Farm>("/farms", {
        name: farmName.trim(),
        location: farmLocation.trim() || undefined,
      });
      setFarmName("");
      setFarmLocation("");
      setShowFarmForm(false);
      await farmsQuery.refetch();
      setSelectedFarmId(res.data._id);
      showToast("success", t.successFarmCreated);
    } catch (error) {
      const details = error instanceof Error ? error.message : "";
      showToast("error", details ? `${t.errCreateFarm}: ${details}` : t.errCreateFarm);
    }
  };

  // First-run: create the user's first farm, then select it.
  const onboardCreateFarm = async (name: string, location: string) => {
    const res = await farmsApi.post<Farm>("/farms", { name, location: location || undefined });
    await farmsQuery.refetch();
    setSelectedFarmId(res.data._id);
  };

  // First-run: create a demo farm seeded with sample types, animals (including a
  // genealogy link), an incubation batch and a medication, then select it.
  const onboardSeedSample = async () => {
    const res = await farmsApi.post<Farm>("/farms", { name: t.sampleFarmName, location: t.sampleFarmLocation });
    const farm = res.data;
    const seedApi = createApi(apiBaseUrl, farm._id, token, handleLogout) as unknown as ApiClient;

    await seedApi.post("/animal-types", { name: t.sampleTypeChicken, category: "oviparous" });
    await seedApi.post("/animal-types", { name: t.sampleTypeGoat, category: "viviparous" });

    await seedApi.post("/animals", { name: "Rex", designation: t.sampleTypeChicken, birthDate: "2025-03-10", sex: "male", ringNumber: "GAL-001" });
    const hen = await seedApi.post<{ _id: string }>("/animals", { name: "Bella", designation: t.sampleTypeChicken, birthDate: "2025-03-12", sex: "female", ringNumber: "GAL-002" });
    await seedApi.post("/animals", { name: "Pip", designation: t.sampleTypeChicken, birthDate: "2026-05-01", sex: "female", ringNumber: "GAL-003", fatherId: "GAL-001", motherId: "GAL-002" });
    await seedApi.post("/animals", { name: "Nanny", designation: t.sampleTypeGoat, birthDate: "2024-11-20", sex: "female", ringNumber: "CAB-001" });

    await seedApi.post("/incubation", { species: t.sampleTypeChicken, eggCount: 12, incubatorName: "Incubadora A", startDate: "2026-06-20", expectedHatchDate: "2026-07-11" });
    await seedApi.post("/medication", { animalId: hen.data._id, medicineName: "Multivitamin", dose: "1 ml", date: "2026-07-05" });

    await farmsQuery.refetch();
    setSelectedFarmId(farm._id);
  };

  const deleteFarm = (farmId: string, name: string) => {
    setConfirm({
      title: t.confirmDeleteFarmTitle,
      message: fmt(t.confirmDeleteFarmMsg, { name }),
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await farmsApi.delete(`/farms/${farmId}`);
          if (selectedFarmId === farmId) setSelectedFarmId("");
          await farmsQuery.refetch();
        } catch {
          showToast("error", t.errDeleteFarm);
        }
      },
    });
  };

  // Pull-to-refresh: refetch farms + whatever the active screen has mounted.
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries();
    } finally {
      setRefreshing(false);
    }
  };

  const selectedFarm = farms.find((f) => f._id === selectedFarmId);
  const role = selectedFarm?.role ?? "owner";
  const canWrite = role === "owner" || role === "worker";
  const canManage = role === "owner";

  const ctx = useMemo(
    () => ({
      t, lang, api, farmsApi, farmId: selectedFarmId, token,
      role, canWrite, canManage,
      showToast, confirm: setConfirm, setTab, setAnimalSubTab, focusAnimals,
    }),
    [t, lang, api, farmsApi, selectedFarmId, token, role, canWrite, canManage, showToast, focusAnimals]
  );

  // While restoring a persisted session, show a splash to avoid flashing the
  // login screen before we know whether the user is already signed in.
  if (!sessionLoaded) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: "center", justifyContent: "center" }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  // Auth gate: until we have a token, only the login screen is shown.
  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LoginScreen
          t={t}
          lang={lang}
          setLang={setLang}
          apiBaseUrl={apiBaseUrl}
          setApiBaseUrl={setApiBaseUrl}
          onAuthenticated={handleAuthenticated}
        />
      </SafeAreaView>
    );
  }

  // While the initial farm list loads, show a splash so we don't flash the
  // onboarding or main UI before we know whether the user has any farms.
  if (farmsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: "center", justifyContent: "center" }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  // First-run gate: a signed-in user with no farms gets the onboarding flow.
  if (farmsQuery.isSuccess && farms.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <OnboardingScreen
          t={t}
          lang={lang}
          setLang={setLang}
          onLogout={handleLogout}
          onCreateFarm={onboardCreateFarm}
          onSeedSample={onboardSeedSample}
        />
      </SafeAreaView>
    );
  }

  return (
    <AppProvider value={ctx}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />

        {/* ── Members management (owner only) ── */}
        <MembersModal visible={showMembers} onClose={() => setShowMembers(false)} />

        {/* ── Confirmation dialog ── */}
        <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setConfirm(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{confirm?.title}</Text>
              <Text style={styles.modalMessage}>{confirm?.message}</Text>
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setConfirm(null)}>
                  <Text style={styles.modalBtnCancelText}>{t.cancel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnDanger]}
                  onPress={async () => {
                    const action = confirm?.onConfirm;
                    setConfirm(null);
                    if (action) await action();
                  }}
                >
                  <Text style={styles.modalBtnDangerText}>{confirm?.confirmLabel}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>🌿 {t.appTitle}</Text>
              {selectedFarm && <Text style={styles.headerSubtitle}>{selectedFarm.name}</Text>}
            </View>
            <View style={styles.headerActions}>
              <Pressable style={[styles.langPill, lang === "pt" && styles.langPillActive]} onPress={() => setLang("pt")}>
                <Text style={[styles.langPillText, lang === "pt" && styles.langPillTextActive]}>PT</Text>
              </Pressable>
              <Pressable style={[styles.langPill, lang === "en" && styles.langPillActive]} onPress={() => setLang("en")}>
                <Text style={[styles.langPillText, lang === "en" && styles.langPillTextActive]}>EN</Text>
              </Pressable>
              <Pressable style={[styles.iconBtn, showSettings && styles.iconBtnActive]} onPress={() => setShowSettings(!showSettings)}>
                <Text style={styles.iconBtnText}>⚙</Text>
                <View style={[
                  styles.serverDot,
                  serverStatus === "online" && styles.serverDotOnline,
                  serverStatus === "offline" && styles.serverDotOffline,
                  serverStatus === "checking" && styles.serverDotChecking,
                ]} />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={handleLogout} accessibilityLabel={t.logout}>
                <Text style={styles.iconBtnText}>⎋</Text>
              </Pressable>
            </View>
          </View>

          {/* Farm selector */}
          <View style={styles.farmBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.farmBarInner}>
              {farms.map((farm) => (
                <View key={farm._id} style={[styles.farmPill, selectedFarmId === farm._id && styles.farmPillActive]}>
                  <Pressable onPress={() => setSelectedFarmId(farm._id)} style={styles.farmPillName}>
                    <Text style={[styles.farmPillText, selectedFarmId === farm._id && styles.farmPillTextActive]}>
                      {farm.name}
                    </Text>
                  </Pressable>
                  <Pressable testID={`farm-delete-${farm._id}`} onPress={() => deleteFarm(farm._id, farm.name)} style={styles.farmPillDelete}>
                    <Text style={[styles.farmPillDeleteText, selectedFarmId === farm._id && styles.farmPillDeleteTextActive]}>×</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable style={[styles.farmPillNew, showFarmForm && styles.farmPillNewOpen]} onPress={() => setShowFarmForm(!showFarmForm)}>
                <Text style={styles.farmPillNewText}>{showFarmForm ? "✕" : "+ New"}</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* Settings panel */}
          {showSettings && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>API Base URL</Text>
              <View style={styles.panelRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={apiBaseUrl}
                  onChangeText={setApiBaseUrl}
                  placeholder="http://localhost:4000"
                  autoCapitalize="none"
                  placeholderTextColor={C.textMuted}
                />
                <Pressable style={styles.refreshBtn} onPress={onRefresh}>
                  <Text style={styles.refreshBtnText}>↺</Text>
                </Pressable>
              </View>
              <View style={styles.serverStatusRow}>
                <View style={[
                  styles.serverDotLarge,
                  serverStatus === "online" && styles.serverDotOnline,
                  serverStatus === "offline" && styles.serverDotOffline,
                  serverStatus === "checking" && styles.serverDotChecking,
                ]} />
                <Text style={styles.serverStatusText}>
                  {serverStatus === "online" ? t.serverOnline : serverStatus === "offline" ? t.serverOffline : t.serverChecking}
                </Text>
              </View>
              {!!userEmail && (
                <View style={styles.serverStatusRow}>
                  <Text style={styles.serverStatusText}>{userEmail}</Text>
                </View>
              )}
              {canManage && !!selectedFarmId && (
                <Pressable style={styles.outlineBtn} onPress={() => { setShowSettings(false); setShowMembers(true); }}>
                  <Text style={styles.outlineBtnText}>👥 {t.manageMembers}</Text>
                </Pressable>
              )}
              <Pressable style={styles.outlineBtn} onPress={handleLogout}>
                <Text style={styles.outlineBtnText}>{t.logout}</Text>
              </Pressable>
            </View>
          )}

          {/* New farm panel */}
          {showFarmForm && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>{t.newFarm}</Text>
              <TextInput style={styles.input} value={farmName} onChangeText={setFarmName}
                placeholder={t.newFarm} placeholderTextColor={C.textMuted} />
              <TextInput style={styles.input} value={farmLocation} onChangeText={setFarmLocation}
                placeholder={t.locationPlaceholder} placeholderTextColor={C.textMuted} />
              <Pressable style={styles.primaryBtn} onPress={createFarm}>
                <Text style={styles.primaryBtnText}>{t.createFarm}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Toast ── */}
        {toast && (
          <Pressable
            style={[styles.toast, toast.type === "error" && styles.toastError, toast.type === "success" && styles.toastSuccess, toast.type === "warning" && styles.toastWarning]}
            onPress={() => setToast(null)}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
            <Text style={styles.toastDismiss}>✕</Text>
          </Pressable>
        )}

        {/* ── Content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInner}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
        >
          {tab === "inicio" && (
            <DashboardScreen key={selectedFarmId || "none"} userEmail={userEmail} farmName={selectedFarm?.name} />
          )}
          {tab === "animais" && (
            <AnimalsScreen
              key={selectedFarmId || "none"}
              animalSubTab={animalSubTab} setAnimalSubTab={setAnimalSubTab}
              search={search} setSearch={setSearch}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              filterSex={filterSex} setFilterSex={setFilterSex}
              sortBy={sortBy} setSortBy={setSortBy}
              showFilters={showFilters} setShowFilters={setShowFilters}
            />
          )}
          {tab === "genealogia" && <GenealogyScreen key={selectedFarmId || "none"} />}
          {tab === "incubacao" && <IncubationScreen key={selectedFarmId || "none"} />}
          {tab === "medicacao" && <MedicationScreen key={selectedFarmId || "none"} />}
          {tab === "calendario" && <CalendarScreen key={selectedFarmId || "none"} />}
          {tab === "dados" && <DataScreen key={selectedFarmId || "none"} />}
        </ScrollView>

        {/* ── Bottom Tabs ── */}
        <View style={styles.tabBar}>
          {TAB_KEYS.map((key) => {
            const active = tab === key;
            return (
              <Pressable key={key} style={styles.tabItem} onPress={() => setTab(key)}>
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{TAB_ICONS[key]}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {t[TAB_LABEL_KEYS[key]] as string}
                </Text>
                {active && <View style={styles.tabIndicator} />}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </AppProvider>
  );
}
