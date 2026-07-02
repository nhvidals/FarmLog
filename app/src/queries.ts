import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { Animal, AnimalType, Farm, FarmMember, HealthEvent, IncubationBatch, LogEntry, MedicationSchedule } from "./types";

/**
 * Minimal shape of the axios client returned by `createApi`. Declared
 * structurally so both the real axios instance and the test mock satisfy it.
 */
export interface ApiClient {
  get<T = unknown>(url: string, config?: unknown): Promise<{ data: T }>;
  post<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<{ data: T }>;
  put<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<{ data: T }>;
  delete<T = unknown>(url: string, config?: unknown): Promise<{ data: T }>;
}

/** Creates a QueryClient tuned for a mobile app (no window-focus refetch, no retries). */
export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });

// ── Query keys ──────────────────────────────────────────────────────────────
// Farm-scoped keys include the farmId so switching farms transparently swaps
// the cached data (and refetches when needed).
export const qk = {
  farms: (token: string) => ["farms", token] as const,
  animals: (farmId: string) => ["animals", farmId] as const,
  animalTypes: (farmId: string) => ["animal-types", farmId] as const,
  incubation: (farmId: string) => ["incubation", farmId] as const,
  medication: (farmId: string) => ["medication", farmId] as const,
  tree: (farmId: string, ring: string) => ["tree", farmId, ring] as const,
  members: (farmId: string) => ["members", farmId] as const,
  events: (farmId: string, animalId: string) => ["events", farmId, animalId] as const,
  log: (farmId: string) => ["log", farmId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────
export function useFarms(farmsApi: ApiClient, token: string) {
  return useQuery({
    queryKey: qk.farms(token),
    queryFn: async () => (await farmsApi.get<Farm[]>("/farms")).data,
    enabled: !!token,
  });
}

export function useAnimals(api: ApiClient, farmId: string, token: string) {
  return useQuery({
    queryKey: qk.animals(farmId),
    queryFn: async () => (await api.get<Animal[]>("/animals")).data,
    enabled: !!token && !!farmId,
  });
}

export function useAnimalTypes(api: ApiClient, farmId: string, token: string) {
  return useQuery({
    queryKey: qk.animalTypes(farmId),
    queryFn: async () => (await api.get<AnimalType[]>("/animal-types")).data,
    enabled: !!token && !!farmId,
  });
}

export function useIncubation(api: ApiClient, farmId: string, token: string) {
  return useQuery({
    queryKey: qk.incubation(farmId),
    queryFn: async () => (await api.get<IncubationBatch[]>("/incubation")).data,
    enabled: !!token && !!farmId,
  });
}

export function useMedication(api: ApiClient, farmId: string, token: string) {
  return useQuery({
    queryKey: qk.medication(farmId),
    queryFn: async () => (await api.get<MedicationSchedule[]>("/medication")).data,
    enabled: !!token && !!farmId,
  });
}

export function useLog(api: ApiClient, farmId: string, token: string) {
  return useQuery({
    queryKey: qk.log(farmId),
    queryFn: async () => (await api.get<LogEntry[]>("/log")).data,
    enabled: !!token && !!farmId,
  });
}

export function useFarmMembers(farmsApi: ApiClient, farmId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.members(farmId),
    queryFn: async () => (await farmsApi.get<FarmMember[]>(`/farms/${farmId}/members`)).data,
    enabled: enabled && !!farmId,
  });
}

export function useAnimalEvents(api: ApiClient, farmId: string, animalId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.events(farmId, animalId),
    queryFn: async () => (await api.get<HealthEvent[]>(`/animals/${animalId}/events`)).data,
    enabled: enabled && !!farmId && !!animalId,
  });
}

export function useGenealogyTree(api: ApiClient, farmId: string, ring: string) {
  return useQuery({
    queryKey: qk.tree(farmId, ring),
    queryFn: async () =>
      (await api.get<Record<string, unknown>>(`/animals/${encodeURIComponent(ring)}/tree`)).data,
    enabled: !!farmId && !!ring,
  });
}

/**
 * Returns a helper that invalidates all farm-scoped resource caches for the
 * active farm — call after any create/update/delete so the affected lists
 * refetch. `tree` is intentionally left for its own screen to manage.
 */
export function useInvalidateFarmData(farmId: string) {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: qk.animals(farmId) });
    client.invalidateQueries({ queryKey: qk.animalTypes(farmId) });
    client.invalidateQueries({ queryKey: qk.incubation(farmId) });
    client.invalidateQueries({ queryKey: qk.medication(farmId) });
    client.invalidateQueries({ queryKey: ["tree", farmId] });
  };
}
