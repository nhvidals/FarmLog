import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Badge, EmptyState, FieldLabel, SectionHeader } from "../components";
import { AnimalSort, AnimalSubTab, useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { categoryOf, isDate, ringOf, statusOf, toIsoDateOnly } from "../helpers";
import { fmt } from "../i18n";
import { useAnimals, useAnimalTypes, useInvalidateFarmData } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";
import {
  Animal,
  ANIMAL_CATEGORIES,
  ANIMAL_STATUSES,
  AnimalCategory,
  AnimalStatus,
  SEXES,
  Sex,
} from "../types";

// Lifecycle status → badge colors.
const STATUS_COLORS: Record<AnimalStatus, { color: string; bg: string }> = {
  active: { color: C.vivi, bg: C.viviBg },
  sold: { color: C.accent, bg: C.accentLight },
  deceased: { color: C.textMuted, bg: C.divider },
};

export interface AnimalsViewState {
  animalSubTab: AnimalSubTab;
  setAnimalSubTab: (s: AnimalSubTab) => void;
  search: string;
  setSearch: (s: string) => void;
  filterStatus: AnimalStatus | "all";
  setFilterStatus: (s: AnimalStatus | "all") => void;
  filterSex: Sex | "all";
  setFilterSex: (s: Sex | "all") => void;
  sortBy: AnimalSort;
  setSortBy: (s: AnimalSort) => void;
  showFilters: boolean;
  setShowFilters: (b: boolean) => void;
}

export function AnimalsScreen(view: AnimalsViewState) {
  const { t, api, farmId, token, showToast, confirm, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);

  const animalsQuery = useAnimals(api, farmId, token);
  const { data: animalTypes = [] } = useAnimalTypes(api, farmId, token);
  const animals = animalsQuery.data ?? [];

  const {
    animalSubTab, setAnimalSubTab,
    search, setSearch,
    filterStatus, setFilterStatus,
    filterSex, setFilterSex,
    sortBy, setSortBy,
    showFilters, setShowFilters,
  } = view;

  // ── Animal form state ──
  const [showAnimalForm, setShowAnimalForm] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [animalName, setAnimalName] = useState("");
  const [animalDesignation, setAnimalDesignation] = useState("");
  const [animalBirthDate, setAnimalBirthDate] = useState("2026-01-01");
  const [animalSex, setAnimalSex] = useState<Sex>("female");
  const [animalRingNumber, setAnimalRingNumber] = useState("");
  const [animalFatherId, setAnimalFatherId] = useState("");
  const [animalMotherId, setAnimalMotherId] = useState("");
  const [animalPhotoUrl, setAnimalPhotoUrl] = useState("");
  const [animalStatus, setAnimalStatus] = useState<AnimalStatus>("active");
  const [animalStatusDate, setAnimalStatusDate] = useState("");
  const [animalStatusReason, setAnimalStatusReason] = useState("");

  // ── Type form state ──
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeCategory, setTypeCategory] = useState<AnimalCategory>("oviparous");

  const catOf = (designation?: string) => categoryOf(animalTypes, designation);

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
    setAnimalStatus("active");
    setAnimalStatusDate("");
    setAnimalStatusReason("");
  };

  const startEditAnimal = (animal: Animal) => {
    setEditingAnimal(animal);
    setAnimalName(animal.name);
    setAnimalDesignation(animal.designation);
    setAnimalBirthDate(toIsoDateOnly(animal.birthDate));
    setAnimalSex(animal.sex);
    setAnimalRingNumber(animal.ringNumber);
    setAnimalFatherId(ringOf(animals, animal.fatherId ?? undefined));
    setAnimalMotherId(ringOf(animals, animal.motherId ?? undefined));
    setAnimalPhotoUrl(animal.photoUrl ?? "");
    setAnimalStatus(statusOf(animal));
    setAnimalStatusDate(toIsoDateOnly(animal.statusDate));
    setAnimalStatusReason(animal.statusReason ?? "");
    setShowAnimalForm(true);
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
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
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
      status: animalStatus,
      statusDate: animalStatus === "active" ? undefined : (animalStatusDate || undefined),
      statusReason: animalStatus === "active" ? undefined : (animalStatusReason.trim() || undefined),
    };
    try {
      if (editingAnimal) {
        await api.put(`/animals/${editingAnimal._id}`, payload);
      } else {
        await api.post("/animals", payload);
      }
      resetAnimalForm();
      setShowAnimalForm(false);
      invalidate();
      showToast("success", t.successAnimalCreated);
    } catch {
      showToast("error", t.errCreateAnimal);
    }
  };

  const deleteAnimal = (animalId: string, name: string) => {
    confirm({
      title: t.confirmDeleteAnimalTitle,
      message: fmt(t.confirmDeleteAnimalMsg, { name }),
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await api.delete(`/animals/${animalId}`);
          invalidate();
        } catch {
          showToast("error", t.errDeleteAnimal);
        }
      },
    });
  };

  const createType = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    if (!typeName.trim()) { showToast("warning", t.valTypeName); return; }
    try {
      await api.post("/animal-types", { name: typeName.trim(), category: typeCategory });
      setTypeName("");
      setTypeCategory("oviparous");
      setShowTypeForm(false);
      invalidate();
      showToast("success", t.successTypeCreated);
    } catch {
      showToast("error", t.errCreateType);
    }
  };

  const deleteType = (typeId: string, name: string) => {
    confirm({
      title: t.confirmDeleteTypeTitle,
      message: fmt(t.confirmDeleteTypeMsg, { name }),
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await api.delete(`/animal-types/${typeId}`);
          invalidate();
        } catch {
          showToast("error", t.errDeleteType);
        }
      },
    });
  };

  // Search + filters + sort.
  const visibleAnimals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = animals.filter((a) => {
      if (filterStatus !== "all" && statusOf(a) !== filterStatus) return false;
      if (filterSex !== "all" && a.sex !== filterSex) return false;
      if (q) {
        const hay = `${a.name} ${a.ringNumber} ${a.designation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "ring")
      sorted.sort((a, b) => a.ringNumber.localeCompare(b.ringNumber, undefined, { numeric: true }));
    return sorted;
  }, [animals, search, filterStatus, filterSex, sortBy]);

  const filtersActive = filterStatus !== "all" || filterSex !== "all" || sortBy !== "newest" || search.trim() !== "";

  return (
    <View>
      {!canWrite && (
        <View style={styles.roleBanner}>
          <Text style={styles.roleBannerText}>🔒 {t.readOnlyBanner}</Text>
        </View>
      )}

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
            onAdd={farmId && canWrite ? () => setShowTypeForm(!showTypeForm) : undefined}
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

          {!farmId ? (
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
                {canWrite && (
                  <Pressable style={styles.typeDeleteBtn} onPress={() => deleteType(type._id, type.name)}>
                    <Text style={styles.typeDeleteBtnText}>🗑</Text>
                  </Pressable>
                )}
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
            onAdd={farmId && canWrite ? () => setShowAnimalForm(!showAnimalForm) : undefined}
            open={showAnimalForm}
          />

          {farmId && animals.length > 0 && (
            <View style={styles.searchWrap}>
              <View style={styles.searchRow}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t.searchPlaceholder}
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                />
                {search !== "" && (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <Text style={styles.searchClear}>✕</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.filterToggle, (showFilters || filtersActive) && styles.filterToggleActive]}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <Text style={[styles.filterToggleText, (showFilters || filtersActive) && styles.filterToggleTextActive]}>⚙</Text>
                </Pressable>
              </View>

              {showFilters && (
                <View style={styles.filterPanel}>
                  <FieldLabel text={t.statusLabel} />
                  <View style={styles.chipWrapRow}>
                    {(["all", ...ANIMAL_STATUSES] as const).map((st) => (
                      <Pressable
                        key={st}
                        style={[styles.chip, filterStatus === st && styles.chipActive]}
                        onPress={() => setFilterStatus(st)}
                      >
                        <Text style={[styles.chipText, filterStatus === st && styles.chipTextActive]}>
                          {st === "all" ? t.filterAll : t.statusLabels[st]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <FieldLabel text={t.sexPlaceholder} />
                  <View style={styles.chipWrapRow}>
                    {(["all", ...SEXES] as const).map((sx) => (
                      <Pressable
                        key={sx}
                        style={[styles.chip, filterSex === sx && styles.chipActive]}
                        onPress={() => setFilterSex(sx)}
                      >
                        <Text style={[styles.chipText, filterSex === sx && styles.chipTextActive]}>
                          {sx === "all" ? t.filterAll : t.sexLabels[sx]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <FieldLabel text={t.sortLabel} />
                  <View style={styles.chipWrapRow}>
                    {([["newest", t.sortNewest], ["name", t.sortName], ["ring", t.sortRing]] as const).map(([key, label]) => (
                      <Pressable
                        key={key}
                        style={[styles.chip, sortBy === key && styles.chipActive]}
                        onPress={() => setSortBy(key)}
                      >
                        <Text style={[styles.chipText, sortBy === key && styles.chipTextActive]}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {filtersActive && (
                <Text style={styles.resultsCount}>
                  {fmt(t.resultsCount, { n: String(visibleAnimals.length), total: String(animals.length) })}
                </Text>
              )}
            </View>
          )}

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
              <DatePickerField value={animalBirthDate} onChange={setAnimalBirthDate} t={t} />

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

              <FieldLabel text={t.statusLabel} />
              <View style={styles.segmentRow}>
                {ANIMAL_STATUSES.map((st) => (
                  <Pressable
                    key={st}
                    style={[styles.segment, animalStatus === st && styles.segmentActive]}
                    onPress={() => setAnimalStatus(st)}
                  >
                    <Text style={[styles.segmentText, animalStatus === st && styles.segmentTextActive]}>
                      {t.statusLabels[st]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {animalStatus !== "active" && (
                <>
                  <FieldLabel text={t.statusDateLabel} />
                  <DatePickerField value={animalStatusDate} onChange={setAnimalStatusDate} t={t} optional />
                  <FieldLabel text={t.statusReasonPlaceholder} />
                  <TextInput style={styles.input} value={animalStatusReason} onChangeText={setAnimalStatusReason}
                    placeholder={t.statusReasonPlaceholder} placeholderTextColor={C.textMuted} />
                </>
              )}

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

          {!farmId ? (
            <EmptyState icon="🏡" text={t.createFarmFirstAnimals} />
          ) : animalsQuery.isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.loadingText}>{t.loading}</Text>
            </View>
          ) : animalsQuery.isError ? (
            <View style={styles.loadingBox}>
              <Text style={styles.emptyStateIcon}>⚠️</Text>
              <Text style={styles.loadingText}>{t.errLoadData}</Text>
              <Pressable style={styles.outlineBtn} onPress={() => animalsQuery.refetch()}>
                <Text style={styles.outlineBtnText}>{t.retry}</Text>
              </Pressable>
            </View>
          ) : animals.length === 0 ? (
            <EmptyState icon="🐾" text={t.noAnimals} />
          ) : visibleAnimals.length === 0 ? (
            <EmptyState icon="🔍" text={t.noResults} />
          ) : (
            visibleAnimals.map((animal) => {
              const st = statusOf(animal);
              return (
                <View
                  key={animal._id}
                  style={[
                    styles.card,
                    { borderLeftColor: animal.sex === "male" ? C.male : C.female },
                    st !== "active" && styles.cardInactive,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.cardName}>{animal.name}</Text>
                      <Text style={styles.cardSub}>{animal.designation}</Text>
                    </View>
                    <View style={styles.cardBadges}>
                      {st !== "active" && (
                        <Badge label={t.statusLabels[st]} color={STATUS_COLORS[st].color} bg={STATUS_COLORS[st].bg} />
                      )}
                      <Badge
                        label={t.sexLabels[animal.sex]}
                        color={animal.sex === "male" ? C.male : C.female}
                        bg={animal.sex === "male" ? C.maleBg : C.femaleBg}
                      />
                      {catOf(animal.designation) && (
                        <Badge
                          label={t.categoryLabels[catOf(animal.designation)!]}
                          color={catOf(animal.designation) === "oviparous" ? C.ovi : C.vivi}
                          bg={catOf(animal.designation) === "oviparous" ? C.oviBg : C.viviBg}
                        />
                      )}
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaText}>🔖 {animal.ringNumber}</Text>
                    <Text style={styles.cardMetaText}>📅 {toIsoDateOnly(animal.birthDate)}</Text>
                  </View>
                  {canWrite && (
                    <View style={styles.cardActions}>
                      <Pressable style={styles.cardActionBtn} onPress={() => startEditAnimal(animal)}>
                        <Text style={styles.cardActionBtnText}>✏️ {t.edit}</Text>
                      </Pressable>
                      <Pressable style={[styles.cardActionBtn, styles.cardActionBtnDanger]} onPress={() => deleteAnimal(animal._id, animal.name)}>
                        <Text style={[styles.cardActionBtnText, styles.cardActionBtnTextDanger]}>🗑 {t.delete}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}
