import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { createApi } from "./src/api";
import { LoginScreen } from "./src/LoginScreen";
import { clearSession, loadSession, saveSession } from "./src/storage";
import {
  Animal,
  AnimalCategory,
  ANIMAL_CATEGORIES,
  AnimalType,
  Farm,
  IncubationBatch,
  MedicationSchedule,
  SEXES,
  Sex,
} from "./src/types";
import { fmt, Lang, T, translations } from "./src/i18n";
import { C } from "./src/theme";
import { styles } from "./src/styles";
import { Badge, EmptyState, FieldLabel, SectionHeader, TreeNode } from "./src/components";
import { CalEvent, CalendarView } from "./src/calendar";

type TabKey = "animais" | "genealogia" | "incubacao" | "medicacao" | "calendario" | "dados";

const TAB_KEYS: TabKey[] = ["animais", "genealogia", "incubacao", "medicacao", "calendario", "dados"];
const TAB_LABEL_KEYS: Record<TabKey, keyof T> = {
  animais: "tabAnimals",
  genealogia: "tabGenealogy",
  incubacao: "tabIncubation",
  medicacao: "tabMedication",
  calendario: "tabCalendar",
  dados: "tabData",
};
const TAB_ICONS: Record<TabKey, string> = {
  animais: "🐾",
  genealogia: "🌳",
  incubacao: "🥚",
  medicacao: "💊",
  calendario: "📅",
  dados: "📦",
};

const toIsoDateOnly = (value: unknown) => {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function App() {
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
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [showFarmForm, setShowFarmForm] = useState(false);
  const [tab, setTab] = useState<TabKey>("animais");

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([]);
  const [incubationList, setIncubationList] = useState<IncubationBatch[]>([]);
  const [medicationList, setMedicationList] = useState<MedicationSchedule[]>([]);

  const [animalSubTab, setAnimalSubTab] = useState<"animais" | "tipos">("animais");
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeCategory, setTypeCategory] = useState<AnimalCategory>("oviparous");

  const [showAnimalForm, setShowAnimalForm] = useState(false);
  const [showIncubationForm, setShowIncubationForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  const [animalName, setAnimalName] = useState("");
  const [animalDesignation, setAnimalDesignation] = useState("");
  const [animalBirthDate, setAnimalBirthDate] = useState("2026-01-01");
  const [animalSex, setAnimalSex] = useState<Sex>("female");
  const [animalRingNumber, setAnimalRingNumber] = useState("");
  const [animalFatherId, setAnimalFatherId] = useState("");
  const [animalMotherId, setAnimalMotherId] = useState("");
  const [animalPhotoUrl, setAnimalPhotoUrl] = useState("");

  const [selectedTreeAnimalId, setSelectedTreeAnimalId] = useState("");
  const [treeData, setTreeData] = useState<Record<string, unknown> | null>(null);

  const [incSpecies, setIncSpecies] = useState("");
  const [incEggCount, setIncEggCount] = useState("12");
  const [incubatorName, setIncubatorName] = useState("Incubadora A");
  const [incStartDate, setIncStartDate] = useState("2026-06-23");
  const [incExpectedDate, setIncExpectedDate] = useState("2026-07-14");
  const [resultBatchId, setResultBatchId] = useState<string | null>(null);
  const [resultOk, setResultOk] = useState("");
  const [resultNok, setResultNok] = useState("");

  const [medAnimalId, setMedAnimalId] = useState("");
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medDate, setMedDate] = useState("2026-06-24");

  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);
  const [serverStatus, setServerStatus] = useState<"online" | "offline" | "checking">("checking");
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const showToast = (type: "error" | "success" | "warning", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Best-effort local notification. Date-triggered notifications are not
  // supported on web, and scheduling can fail for permission reasons, so this
  // must never throw — it should not block the action that triggered it.
  const scheduleLocalNotification = async (title: string, body: string, date: Date) => {
    if (Platform.OS === "web") return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    } catch {
      // ignore — notifications are a non-critical enhancement
    }
  };

  // Stable so it can be passed into the memoized API clients without churning them.
  const handleLogout = useCallback(() => {
    clearSession();
    setToken("");
    setUserEmail("");
    setFarms([]);
    setSelectedFarmId("");
    setAnimals([]);
    setAnimalTypes([]);
    setIncubationList([]);
    setMedicationList([]);
    setShowSettings(false);
  }, []);

  const api = useMemo(
    () => createApi(apiBaseUrl, selectedFarmId, token, handleLogout),
    [apiBaseUrl, selectedFarmId, token, handleLogout]
  );
  const farmsApi = useMemo(
    () => createApi(apiBaseUrl, "", token, handleLogout),
    [apiBaseUrl, token, handleLogout]
  );

  const handleAuthenticated = (newToken: string, email: string) => {
    setUserEmail(email);
    setToken(newToken);
    saveSession(newToken, email);
  };

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

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

  const loadFarms = async (preferredFarmId?: string) => {
    if (!token) return;
    try {
      const farmsRes = await farmsApi.get<Farm[]>("/farms");
      const loaded = farmsRes.data;
      setFarms(loaded);
      if (!loaded.length) {
        setSelectedFarmId("");
        return;
      }

      const desiredFarmId = preferredFarmId ?? selectedFarmId;
      const hasDesiredFarm = desiredFarmId ? loaded.some((farm) => farm._id === desiredFarmId) : false;
      setSelectedFarmId(hasDesiredFarm ? desiredFarmId : loaded[0]._id);
    } catch {
      showToast("error", t.errLoadFarms);
    }
  };

  const loadAll = async () => {
    if (!token) return;
    if (!selectedFarmId) {
      setAnimals([]);
      setAnimalTypes([]);
      setIncubationList([]);
      setMedicationList([]);
      return;
    }
    try {
      const [animalsRes, typesRes, incubationRes, medicationRes] = await Promise.all([
        api.get<Animal[]>("/animals"),
        api.get<AnimalType[]>("/animal-types"),
        api.get<IncubationBatch[]>("/incubation"),
        api.get<MedicationSchedule[]>("/medication"),
      ]);
      setAnimals(animalsRes.data);
      setAnimalTypes(typesRes.data);
      setIncubationList(incubationRes.data);
      setMedicationList(medicationRes.data);
    } catch {
      showToast("error", t.errLoadData);
    }
  };

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

  useEffect(() => { loadFarms(); }, [farmsApi, token]);
  useEffect(() => { loadAll(); }, [api, selectedFarmId, token]);

  useEffect(() => {
    resetAnimalForm();
    setShowAnimalForm(false);
    setShowIncubationForm(false);
    setShowMedicationForm(false);
    setTreeData(null);
    setSelectedTreeAnimalId("");
    setMedAnimalId("");
    setShowTypeForm(false);
    setTypeName("");
    setTypeCategory("oviparous");
    setResultBatchId(null);
  }, [selectedFarmId]);

  const deleteFarm = (farmId: string, farmName: string) => {
    setConfirm({
      title: t.confirmDeleteFarmTitle,
      message: fmt(t.confirmDeleteFarmMsg, { name: farmName }),
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await farmsApi.delete(`/farms/${farmId}`);
          await loadFarms(selectedFarmId === farmId ? "" : selectedFarmId);
        } catch {
          showToast("error", t.errDeleteFarm);
        }
      },
    });
  };

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
      await loadFarms();
      setSelectedFarmId(res.data._id);
      showToast("success", t.successFarmCreated);
    } catch (error) {
      const details = error instanceof Error ? error.message : "";
      showToast("error", details ? `${t.errCreateFarm}: ${details}` : t.errCreateFarm);
    }
  };

  const resetAnimalForm = () => {
    setEditingAnimal(null);
    setAnimalName("");
    setAnimalDesignation("");
    setAnimalBirthDate("2026-01-01");
    setAnimalSex("female");
    setAnimalRingNumber("");
    setAnimalFatherId("");
    setAnimalMotherId("");
    setAnimalPhotoUrl("");
  };

  // Category lives on the animal type; resolve it from the animal's designation.
  const categoryOf = (designation?: string): AnimalCategory | undefined =>
    animalTypes.find((ty) => ty.name === designation)?.category;

  // Parents are stored internally as object ids; the UI works in ring numbers
  // (anilhas), so map an id back to the animal's ring number for display.
  const ringOf = (animalId?: string) =>
    animals.find((a) => a._id === animalId)?.ringNumber ?? "";

  const startEditAnimal = (animal: Animal) => {
    setEditingAnimal(animal);
    setAnimalName(animal.name);
    setAnimalDesignation(animal.designation);
    setAnimalBirthDate(toIsoDateOnly(animal.birthDate));
    setAnimalSex(animal.sex);
    setAnimalRingNumber(animal.ringNumber);
    setAnimalFatherId(ringOf(animal.fatherId ?? undefined));
    setAnimalMotherId(ringOf(animal.motherId ?? undefined));
    setAnimalPhotoUrl(animal.photoUrl ?? "");
    setShowAnimalForm(true);
  };

  const deleteAnimal = (animalId: string, animalName: string) => {
    setConfirm({
      title: t.confirmDeleteAnimalTitle,
      message: fmt(t.confirmDeleteAnimalMsg, { name: animalName }),
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await api.delete(`/animals/${animalId}`);
          await loadAll();
        } catch {
          showToast("error", t.errDeleteAnimal);
        }
      },
    });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAnimalPhotoUrl(result.assets[0].uri);
    }
  };

  const saveAnimal = async () => {
    if (!selectedFarmId) { showToast("warning", t.valSelectFarm); return; }
    if (!animalName.trim() || !animalDesignation.trim() || !animalRingNumber.trim()) {
      showToast("warning", t.valAnimalFields);
      return;
    }
    if (!isDate(animalBirthDate)) { showToast("warning", t.valBirthDate); return; }
    const payload = {
      name: animalName.trim(),
      designation: animalDesignation.trim(),
      birthDate: animalBirthDate,
      sex: animalSex,
      ringNumber: animalRingNumber.trim(),
      fatherId: animalFatherId || undefined,
      motherId: animalMotherId || undefined,
      photoUrl: animalPhotoUrl || undefined,
    };
    try {
      if (editingAnimal) {
        await api.put(`/animals/${editingAnimal._id}`, payload);
      } else {
        await api.post("/animals", payload);
      }
      resetAnimalForm();
      setShowAnimalForm(false);
      await loadAll();
      showToast("success", t.successAnimalCreated);
    } catch {
      showToast("error", t.errCreateAnimal);
    }
  };

  const createType = async () => {
    if (!selectedFarmId) { showToast("warning", t.valSelectFarm); return; }
    if (!typeName.trim()) { showToast("warning", t.valTypeName); return; }
    try {
      await api.post("/animal-types", { name: typeName.trim(), category: typeCategory });
      setTypeName("");
      setTypeCategory("oviparous");
      setShowTypeForm(false);
      await loadAll();
      showToast("success", t.successTypeCreated);
    } catch {
      showToast("error", t.errCreateType);
    }
  };

  const deleteType = (typeId: string, name: string) => {
    setConfirm({
      title: t.confirmDeleteTypeTitle,
      message: fmt(t.confirmDeleteTypeMsg, { name }),
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await api.delete(`/animal-types/${typeId}`);
          await loadAll();
        } catch {
          showToast("error", t.errDeleteType);
        }
      },
    });
  };

  const loadTree = async (ringNumber: string) => {
    if (!ringNumber) { showToast("warning", t.valSelectAnimal); return; }
    setSelectedTreeAnimalId(ringNumber);
    try {
      const res = await api.get(`/animals/${encodeURIComponent(ringNumber)}/tree`);
      setTreeData(res.data);
    } catch {
      showToast("error", t.errLoadTree);
    }
  };

  const createIncubation = async () => {
    if (!selectedFarmId) { showToast("warning", t.valSelectFarm); return; }
    if (!isDate(incStartDate) || !isDate(incExpectedDate)) {
      showToast("warning", t.valDates);
      return;
    }
    if (!incSpecies.trim() || !incubatorName.trim() || Number(incEggCount) < 1 || Number.isNaN(Number(incEggCount))) {
      showToast("warning", t.valIncubationFields);
      return;
    }
    try {
      await api.post("/incubation", {
        species: incSpecies,
        eggCount: Number(incEggCount),
        incubatorName: incubatorName.trim(),
        startDate: incStartDate,
        expectedHatchDate: incExpectedDate,
      });
      const notifBody = fmt(t.notifIncubationBody, { name: incubatorName });
      await scheduleLocalNotification(t.notifIncubationTitle, notifBody, new Date(incExpectedDate + "T09:00:00"));
      setShowIncubationForm(false);
      await loadAll();
      showToast("success", t.successIncubationCreated);
    } catch {
      showToast("error", t.errCreateIncubation);
    }
  };

  const openResultForm = (batch: IncubationBatch) => {
    setResultBatchId(batch._id);
    setResultOk(batch.hatchedOk !== undefined ? String(batch.hatchedOk) : "");
    setResultNok(batch.hatchedNok !== undefined ? String(batch.hatchedNok) : "");
  };

  const saveIncubationResult = async (batchId: string) => {
    const ok = Number(resultOk);
    const nok = Number(resultNok);
    if ((resultOk !== "" && (Number.isNaN(ok) || ok < 0)) || (resultNok !== "" && (Number.isNaN(nok) || nok < 0))) {
      showToast("warning", t.errSaveResult);
      return;
    }
    try {
      await api.put(`/incubation/${batchId}`, {
        hatchedOk: resultOk === "" ? undefined : ok,
        hatchedNok: resultNok === "" ? undefined : nok,
      });
      setResultBatchId(null);
      await loadAll();
      showToast("success", t.successResult);
    } catch {
      showToast("error", t.errSaveResult);
    }
  };

  const createMedication = async () => {
    if (!selectedFarmId) { showToast("warning", t.valSelectFarm); return; }
    if (!medAnimalId || !medName.trim() || !medDose.trim()) {
      showToast("warning", t.valMedicationFields);
      return;
    }
    if (!isDate(medDate)) { showToast("warning", t.valDate); return; }
    try {
      await api.post("/medication", {
        animalId: medAnimalId,
        medicineName: medName.trim(),
        dose: medDose.trim(),
        date: medDate,
      });
      const notifBody = fmt(t.notifMedicationBody, { name: medName, dose: medDose });
      await scheduleLocalNotification(t.notifMedicationTitle, notifBody, new Date(medDate + "T09:00:00"));
      setMedName("");
      setMedDose("");
      setShowMedicationForm(false);
      await loadAll();
      showToast("success", t.successMedicationCreated);
    } catch {
      showToast("error", t.errCreateMedication);
    }
  };

  const exportData = async () => {
    if (!selectedFarmId) {
      showToast("warning", t.valSelectFarm);
      return;
    }
    try {
      const res = await api.get("/data/export");
      const json = JSON.stringify(res.data, null, 2);
      const fileName = `farm-export-${Date.now()}.json`;

      if (Platform.OS === "web") {
        // expo-file-system / sharing are unavailable on web — trigger a browser download.
        const doc = (globalThis as any).document;
        const blob = new (globalThis as any).Blob([json], { type: "application/json" });
        const url = (globalThis as any).URL.createObjectURL(blob);
        const anchor = doc.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        (globalThis as any).URL.revokeObjectURL(url);
        showToast("success", t.successExport);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, json);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast("error", t.errExport);
        return;
      }

      await Sharing.shareAsync(fileUri);
      showToast("success", t.successExport);
    } catch {
      showToast("error", t.errExport);
    }
  };

  const importData = async () => {
    if (!selectedFarmId) {
      showToast("warning", t.valSelectFarm);
      return;
    }
    try {
      const file = await DocumentPicker.getDocumentAsync({ multiple: false, type: "application/json" });
      if (file.canceled || !file.assets[0]) return;
      const asset = file.assets[0];
      // On web the picked asset is a blob URI that legacy FileSystem cannot read;
      // fetch reads it directly. On native, read from the file system.
      const content = Platform.OS === "web"
        ? await fetch(asset.uri).then((r) => r.text())
        : await FileSystem.readAsStringAsync(asset.uri);
      const payload = JSON.parse(content);
      await api.post("/data/import", payload);
      await loadAll();
      showToast("success", t.successImport);
    } catch {
      showToast("error", t.errImport);
    }
  };

  const selectedFarm = farms.find((f) => f._id === selectedFarmId);

  // Aggregate all milestones for the calendar from the loaded data.
  const calendarEvents = useMemo<CalEvent[]>(() => {
    const evts: CalEvent[] = [];
    for (const a of animals) {
      const d = toIsoDateOnly(a.birthDate);
      if (d) evts.push({ date: d, kind: "birth", title: a.name, subtitle: a.designation });
    }
    for (const b of incubationList) {
      const s = toIsoDateOnly(b.startDate);
      if (s) evts.push({ date: s, kind: "incubationStart", title: b.incubatorName, subtitle: b.species });
      const h = toIsoDateOnly(b.expectedHatchDate);
      if (h) evts.push({ date: h, kind: "hatch", title: b.incubatorName, subtitle: b.species });
    }
    for (const m of medicationList) {
      const d = toIsoDateOnly(m.date);
      const who = typeof m.animalId === "string" ? m.animalId : m.animalId?.name ?? "";
      if (d) evts.push({ date: d, kind: "medication", title: m.medicineName, subtitle: who });
    }
    return evts;
  }, [animals, incubationList, medicationList]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

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
            {selectedFarm && (
              <Text style={styles.headerSubtitle}>{selectedFarm.name}</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.langPill, lang === "pt" && styles.langPillActive]}
              onPress={() => setLang("pt")}
            >
              <Text style={[styles.langPillText, lang === "pt" && styles.langPillTextActive]}>PT</Text>
            </Pressable>
            <Pressable
              style={[styles.langPill, lang === "en" && styles.langPillActive]}
              onPress={() => setLang("en")}
            >
              <Text style={[styles.langPillText, lang === "en" && styles.langPillTextActive]}>EN</Text>
            </Pressable>
            <Pressable
              style={[styles.iconBtn, showSettings && styles.iconBtnActive]}
              onPress={() => setShowSettings(!showSettings)}
            >
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
                  <Text style={[styles.farmPillDeleteText, selectedFarmId === farm._id && styles.farmPillDeleteTextActive]}>
                    ×
                  </Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.farmPillNew, showFarmForm && styles.farmPillNewOpen]}
              onPress={() => setShowFarmForm(!showFarmForm)}
            >
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
              <Pressable style={styles.refreshBtn} onPress={loadAll}>
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
                {serverStatus === "online"
                  ? t.serverOnline
                  : serverStatus === "offline"
                  ? t.serverOffline
                  : t.serverChecking}
              </Text>
            </View>
            {!!userEmail && (
              <View style={styles.serverStatusRow}>
                <Text style={styles.serverStatusText}>{userEmail}</Text>
              </View>
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
            <TextInput
              style={styles.input}
              value={farmName}
              onChangeText={setFarmName}
              placeholder={t.newFarm}
              placeholderTextColor={C.textMuted}
            />
            <TextInput
              style={styles.input}
              value={farmLocation}
              onChangeText={setFarmLocation}
              placeholder={t.locationPlaceholder}
              placeholderTextColor={C.textMuted}
            />
            <Pressable style={styles.primaryBtn} onPress={createFarm}>
              <Text style={styles.primaryBtnText}>{t.createFarm}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {toast && (
        <Pressable
          style={[styles.toast, toast.type === "error" && styles.toastError, toast.type === "success" && styles.toastSuccess, toast.type === "warning" && styles.toastWarning]}
          onPress={() => setToast(null)}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
          <Text style={styles.toastDismiss}>✕</Text>
        </Pressable>
      )}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>

        {/* Animals */}
        {tab === "animais" && (
          <View>
            {/* Sub-tabs: Animais / Tipos */}
            <View style={styles.subTabRow}>
              <Pressable
                style={[styles.subTab, animalSubTab === "animais" && styles.subTabActive]}
                onPress={() => setAnimalSubTab("animais")}
              >
                <Text style={[styles.subTabText, animalSubTab === "animais" && styles.subTabTextActive]}>🐾 {t.subTabAnimals}</Text>
              </Pressable>
              <Pressable
                style={[styles.subTab, animalSubTab === "tipos" && styles.subTabActive]}
                onPress={() => setAnimalSubTab("tipos")}
              >
                <Text style={[styles.subTabText, animalSubTab === "tipos" && styles.subTabTextActive]}>🏷️ {t.subTabTypes}</Text>
              </Pressable>
            </View>

            {animalSubTab === "tipos" && (
              <View>
                <SectionHeader
                  title={t.typeList}
                  count={animalTypes.length}
                  onAdd={selectedFarmId ? () => setShowTypeForm(!showTypeForm) : undefined}
                  open={showTypeForm}
                />

                {showTypeForm && (
                  <View style={styles.formCard}>
                    <Text style={styles.formCardTitle}>{t.newType}</Text>
                    <FieldLabel text={t.animalTypeLabel} />
                    <TextInput style={styles.input} value={typeName} onChangeText={setTypeName}
                      placeholder={t.typeNamePlaceholder} placeholderTextColor={C.textMuted} />

                    <FieldLabel text={t.categoryPlaceholder} />
                    <View style={styles.segmentRow}>
                      {ANIMAL_CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[styles.segment, typeCategory === cat && styles.segmentActive]}
                          onPress={() => setTypeCategory(cat)}
                        >
                          <Text style={[styles.segmentText, typeCategory === cat && styles.segmentTextActive]}>
                            {t.categoryLabels[cat]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Pressable style={styles.primaryBtn} onPress={createType}>
                      <Text style={styles.primaryBtnText}>{t.saveType}</Text>
                    </Pressable>
                  </View>
                )}

                {!selectedFarmId ? (
                  <EmptyState icon="🏡" text={t.createFarmFirst} />
                ) : animalTypes.length === 0 ? (
                  <EmptyState icon="🏷️" text={t.noTypes} />
                ) : (
                  animalTypes.map((type) => (
                    <View key={type._id} style={[styles.card, { borderLeftColor: C.accent, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Text style={styles.cardName}>{type.name}</Text>
                        <Badge
                          label={t.categoryLabels[type.category]}
                          color={type.category === "oviparous" ? C.ovi : C.vivi}
                          bg={type.category === "oviparous" ? C.oviBg : C.viviBg}
                        />
                      </View>
                      <Pressable style={styles.typeDeleteBtn} onPress={() => deleteType(type._id, type.name)}>
                        <Text style={styles.typeDeleteBtnText}>🗑</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            )}

            {animalSubTab === "animais" && (
              <View>
            <SectionHeader
              title={t.animalList}
              count={animals.length}
              onAdd={selectedFarmId ? () => setShowAnimalForm(!showAnimalForm) : undefined}
              open={showAnimalForm}
            />

            {showAnimalForm && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>
                  {editingAnimal ? t.editAnimalTitle : t.newAnimal}
                </Text>

                <FieldLabel text={t.namePlaceholder} />
                <TextInput style={styles.input} value={animalName} onChangeText={setAnimalName}
                  placeholder={t.namePlaceholder} placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.animalTypeLabel} />
                {animalTypes.length === 0 ? (
                  <Pressable onPress={() => setAnimalSubTab("tipos")}>
                    <Text style={styles.linkHint}>➕ {t.createTypeFirst}</Text>
                  </Pressable>
                ) : (
                  <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                    {animalTypes.map((type) => (
                      <Pressable key={type._id}
                        style={[styles.chip, animalDesignation === type.name && styles.chipActive]}
                        onPress={() => {
                          if (animalDesignation !== type.name) {
                            // Switching type invalidates any chosen parents (must be same type).
                            setAnimalFatherId("");
                            setAnimalMotherId("");
                          }
                          setAnimalDesignation(type.name);
                        }}
                      >
                        <Text style={[styles.chipText, animalDesignation === type.name && styles.chipTextActive]}>{type.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                <FieldLabel text={t.sexPlaceholder} />
                <View style={styles.segmentRow}>
                  {SEXES.map((sex) => (
                    <Pressable
                      key={sex}
                      style={[styles.segment, animalSex === sex && styles.segmentActive]}
                      onPress={() => setAnimalSex(sex)}
                    >
                      <Text style={[styles.segmentText, animalSex === sex && styles.segmentTextActive]}>
                        {t.sexLabels[sex]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <FieldLabel text={t.birthDatePlaceholder} />
                <TextInput style={styles.input} value={animalBirthDate} onChangeText={setAnimalBirthDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.ringNumberPlaceholder} />
                <TextInput style={styles.input} value={animalRingNumber} onChangeText={setAnimalRingNumber}
                  placeholder={t.ringNumberPlaceholder} placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.fatherIdPlaceholder} />
                {animals.filter((a) => a.sex === "male" && a.designation === animalDesignation && a._id !== editingAnimal?._id).length > 0 && (
                  <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                    {animals.filter((a) => a.sex === "male" && a.designation === animalDesignation && a._id !== editingAnimal?._id).map((a) => (
                      <Pressable key={a._id}
                        style={[styles.chip, animalFatherId === a.ringNumber && styles.chipActive]}
                        onPress={() => setAnimalFatherId(animalFatherId === a.ringNumber ? "" : a.ringNumber)}
                      >
                        <Text style={[styles.chipText, animalFatherId === a.ringNumber && styles.chipTextActive]}>{a.ringNumber} · {a.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                <TextInput style={styles.input} value={animalFatherId} onChangeText={setAnimalFatherId}
                  placeholder={t.fatherIdPlaceholder} placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.motherIdPlaceholder} />
                {animals.filter((a) => a.sex === "female" && a.designation === animalDesignation && a._id !== editingAnimal?._id).length > 0 && (
                  <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                    {animals.filter((a) => a.sex === "female" && a.designation === animalDesignation && a._id !== editingAnimal?._id).map((a) => (
                      <Pressable key={a._id}
                        style={[styles.chip, animalMotherId === a.ringNumber && styles.chipActive]}
                        onPress={() => setAnimalMotherId(animalMotherId === a.ringNumber ? "" : a.ringNumber)}
                      >
                        <Text style={[styles.chipText, animalMotherId === a.ringNumber && styles.chipTextActive]}>{a.ringNumber} · {a.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                <TextInput style={styles.input} value={animalMotherId} onChangeText={setAnimalMotherId}
                  placeholder={t.motherIdPlaceholder} placeholderTextColor={C.textMuted} />

                <Pressable style={styles.outlineBtn} onPress={pickPhoto}>
                  <Text style={styles.outlineBtnText}>📷 {t.selectPhoto}</Text>
                </Pressable>
                {animalPhotoUrl ? <Image source={{ uri: animalPhotoUrl }} style={styles.previewImage} /> : null}

                <Pressable style={styles.primaryBtn} onPress={saveAnimal}>
                  <Text style={styles.primaryBtnText}>
                    {editingAnimal ? t.saveChanges : t.saveAnimal}
                  </Text>
                </Pressable>
                {editingAnimal && (
                  <Pressable style={styles.outlineBtn} onPress={() => { resetAnimalForm(); setShowAnimalForm(false); }}>
                    <Text style={styles.outlineBtnText}>{t.cancelEdit}</Text>
                  </Pressable>
                )}
              </View>
            )}

            {!selectedFarmId ? (
              <EmptyState icon="🏡" text={t.createFarmFirstAnimals} />
            ) : animals.length === 0 ? (
              <EmptyState icon="🐾" text={t.noAnimals} />
            ) : (
              animals.map((animal) => (
                <View
                  key={animal._id}
                  style={[styles.card, { borderLeftColor: animal.sex === "male" ? C.male : C.female }]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.cardName}>{animal.name}</Text>
                      <Text style={styles.cardSub}>{animal.designation}</Text>
                    </View>
                    <View style={styles.cardBadges}>
                      <Badge
                        label={t.sexLabels[animal.sex]}
                        color={animal.sex === "male" ? C.male : C.female}
                        bg={animal.sex === "male" ? C.maleBg : C.femaleBg}
                      />
                      {categoryOf(animal.designation) && (
                        <Badge
                          label={t.categoryLabels[categoryOf(animal.designation)!]}
                          color={categoryOf(animal.designation) === "oviparous" ? C.ovi : C.vivi}
                          bg={categoryOf(animal.designation) === "oviparous" ? C.oviBg : C.viviBg}
                        />
                      )}
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>🔖 {animal.ringNumber}</Text>
                    <Text style={styles.cardMetaText}>📅 {toIsoDateOnly(animal.birthDate)}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable style={styles.cardActionBtn} onPress={() => startEditAnimal(animal)}>
                      <Text style={styles.cardActionBtnText}>✏️ {t.edit}</Text>
                    </Pressable>
                    <Pressable style={[styles.cardActionBtn, styles.cardActionBtnDanger]} onPress={() => deleteAnimal(animal._id, animal.name)}>
                      <Text style={[styles.cardActionBtnText, styles.cardActionBtnTextDanger]}>🗑 {t.delete}</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
              </View>
            )}
          </View>
        )}

        {/* Genealogy */}
        {tab === "genealogia" && (
          <View>
            <SectionHeader title={t.familyTree} />

            <View style={styles.formCard}>
              <FieldLabel text={t.selectAnimal} />
              {animals.length === 0 ? (
                <Text style={styles.treeHint}>{t.noAnimalsToShow}</Text>
              ) : (
                <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                  {animals.map((animal) => (
                    <Pressable
                      key={animal._id}
                      style={[styles.chip, selectedTreeAnimalId === animal.ringNumber && styles.chipActive]}
                      onPress={() => loadTree(animal.ringNumber)}
                    >
                      <Text style={[styles.chipText, selectedTreeAnimalId === animal.ringNumber && styles.chipTextActive]}>
                        {animal.ringNumber} · {animal.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            {treeData ? (
              <View style={styles.treeContainer}>
                <TreeNode node={treeData} t={t} categoryOf={categoryOf} />
              </View>
            ) : (
              <EmptyState icon="🌳" text={t.noTree} />
            )}
          </View>
        )}

        {/* Incubation */}
        {tab === "incubacao" && (
          <View>
            <SectionHeader
              title={t.batches}
              count={incubationList.length}
              onAdd={selectedFarmId ? () => setShowIncubationForm(!showIncubationForm) : undefined}
              open={showIncubationForm}
            />

            {showIncubationForm && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>{t.registerIncubation}</Text>

                <FieldLabel text={t.animalTypeLabel} />
                {animalTypes.length === 0 ? (
                  <Pressable onPress={() => { setTab("animais"); setAnimalSubTab("tipos"); }}>
                    <Text style={styles.linkHint}>➕ {t.createTypeFirst}</Text>
                  </Pressable>
                ) : (
                  <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                    {animalTypes.map((type) => (
                      <Pressable key={type._id}
                        style={[styles.chip, incSpecies === type.name && styles.chipActive]}
                        onPress={() => setIncSpecies(type.name)}
                      >
                        <Text style={[styles.chipText, incSpecies === type.name && styles.chipTextActive]}>{type.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                <FieldLabel text={t.eggCountPlaceholder} />
                <TextInput style={styles.input} value={incEggCount} onChangeText={setIncEggCount}
                  placeholder={t.eggCountPlaceholder} keyboardType="numeric" placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.incubatorPlaceholder} />
                <TextInput style={styles.input} value={incubatorName} onChangeText={setIncubatorName}
                  placeholder={t.incubatorPlaceholder} placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.startDatePlaceholder} />
                <TextInput style={styles.input} value={incStartDate} onChangeText={setIncStartDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.hatchDatePlaceholder} />
                <TextInput style={styles.input} value={incExpectedDate} onChangeText={setIncExpectedDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} />

                <Pressable style={styles.primaryBtn} onPress={createIncubation}>
                  <Text style={styles.primaryBtnText}>{t.saveIncubation}</Text>
                </Pressable>
              </View>
            )}

            {incubationList.length === 0 ? (
              <EmptyState icon="🥚" text={t.noBatches} />
            ) : (
              incubationList.map((batch) => (
                <View key={batch._id} style={[styles.card, { borderLeftColor: C.accent }]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.cardName}>{batch.incubatorName}</Text>
                      <Text style={styles.cardSub}>{t.speciesLabel} {batch.species}</Text>
                    </View>
                    <Badge label={`${batch.eggCount} 🥚`} color={C.ovi} bg={C.oviBg} />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>📅 {t.startLabel} {toIsoDateOnly(batch.startDate)}</Text>
                    <Text style={styles.cardMetaText}>🐣 {t.hatchLabel} {toIsoDateOnly(batch.expectedHatchDate)}</Text>
                  </View>

                  {(batch.hatchedOk !== undefined || batch.hatchedNok !== undefined) && (
                    <View style={styles.cardMeta}>
                      <Text style={[styles.cardMetaText, { color: C.vivi, fontWeight: "700" }]}>✅ {batch.hatchedOk ?? 0} OK</Text>
                      <Text style={[styles.cardMetaText, { color: C.danger, fontWeight: "700" }]}>❌ {batch.hatchedNok ?? 0} NOK</Text>
                    </View>
                  )}

                  {resultBatchId === batch._id ? (
                    <View style={styles.resultForm}>
                      <Text style={styles.formCardTitle}>{t.incResultTitle}</Text>
                      <View style={styles.resultRow}>
                        <View style={styles.resultField}>
                          <FieldLabel text={t.incOkPlaceholder} />
                          <TextInput style={styles.input} value={resultOk} onChangeText={setResultOk}
                            keyboardType="numeric" placeholder="0" placeholderTextColor={C.textMuted} />
                        </View>
                        <View style={styles.resultField}>
                          <FieldLabel text={t.incNokPlaceholder} />
                          <TextInput style={styles.input} value={resultNok} onChangeText={setResultNok}
                            keyboardType="numeric" placeholder="0" placeholderTextColor={C.textMuted} />
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <Pressable style={styles.cardActionBtn} onPress={() => setResultBatchId(null)}>
                          <Text style={styles.cardActionBtnText}>{t.cancel}</Text>
                        </Pressable>
                        <Pressable style={[styles.cardActionBtn, { backgroundColor: C.primary, borderColor: C.primary }]} onPress={() => saveIncubationResult(batch._id)}>
                          <Text style={[styles.cardActionBtnText, { color: "#fff" }]}>{t.saveResult}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.cardActions}>
                      <Pressable style={styles.cardActionBtn} onPress={() => openResultForm(batch)}>
                        <Text style={styles.cardActionBtnText}>
                          {(batch.hatchedOk !== undefined || batch.hatchedNok !== undefined) ? `✏️ ${t.editResult}` : `🐣 ${t.registerResult}`}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Medication */}
        {tab === "medicacao" && (
          <View>
            <SectionHeader
              title={t.records}
              count={medicationList.length}
              onAdd={selectedFarmId ? () => setShowMedicationForm(!showMedicationForm) : undefined}
              open={showMedicationForm}
            />

            {showMedicationForm && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>{t.medicationPlan}</Text>

                <FieldLabel text={t.animalLabel} />
                <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                  {animals.map((animal) => (
                    <Pressable
                      key={animal._id}
                      style={[styles.chip, medAnimalId === animal._id && styles.chipActive]}
                      onPress={() => setMedAnimalId(animal._id)}
                    >
                      <Text style={[styles.chipText, medAnimalId === animal._id && styles.chipTextActive]}>
                        {animal.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <FieldLabel text={t.medicinePlaceholder} />
                <TextInput style={styles.input} value={medName} onChangeText={setMedName}
                  placeholder={t.medicinePlaceholder} placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.dosePlaceholder} />
                <TextInput style={styles.input} value={medDose} onChangeText={setMedDose}
                  placeholder={t.dosePlaceholder} placeholderTextColor={C.textMuted} />

                <FieldLabel text={t.datePlaceholder} />
                <TextInput style={styles.input} value={medDate} onChangeText={setMedDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} />

                <Pressable style={styles.primaryBtn} onPress={createMedication}>
                  <Text style={styles.primaryBtnText}>{t.saveMedication}</Text>
                </Pressable>
              </View>
            )}

            {medicationList.length === 0 ? (
              <EmptyState icon="💊" text={t.noMedication} />
            ) : (
              medicationList.map((entry) => (
                <View key={entry._id} style={[styles.card, { borderLeftColor: C.danger }]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.cardName}>{entry.medicineName}</Text>
                      <Text style={styles.cardSub}>
                        🐾 {typeof entry.animalId === "string" ? entry.animalId : entry.animalId.name ?? entry.animalId._id}
                      </Text>
                    </View>
                    <Badge label={entry.dose} color={C.danger} bg={C.dangerBg} />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>📅 {toIsoDateOnly(entry.date)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Calendar */}
        {tab === "calendario" && (
          <View>
            <SectionHeader title={t.tabCalendar} />
            <CalendarView events={calendarEvents} t={t} />
          </View>
        )}

        {/* Data */}
        {tab === "dados" && (
          <View>
            <SectionHeader title={t.importExport} />

            <View style={styles.dataCard}>
              <View style={styles.dataCardIcon}><Text style={styles.dataCardIconText}>📤</Text></View>
              <View style={styles.dataCardBody}>
                <Text style={styles.dataCardTitle}>{t.exportJson}</Text>
                <Text style={styles.dataCardDesc}>{t.exportDesc}</Text>
                <Pressable style={styles.primaryBtn} onPress={exportData}>
                  <Text style={styles.primaryBtnText}>{t.exportJson}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.dataCard}>
              <View style={[styles.dataCardIcon, { backgroundColor: C.primaryLight }]}>
                <Text style={styles.dataCardIconText}>📥</Text>
              </View>
              <View style={styles.dataCardBody}>
                <Text style={styles.dataCardTitle}>{t.importJson}</Text>
                <Text style={styles.dataCardDesc}>{t.importDesc}</Text>
                <Pressable style={styles.outlineBtn} onPress={importData}>
                  <Text style={styles.outlineBtnText}>{t.importJson}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
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
  );
}

// Styles live in ./src/styles.ts
