import { fireEvent, render, waitFor } from "@testing-library/react-native";
import App from "../App";

const mockLogin = jest.fn();
const mockRegister = jest.fn();

const mockFarmsClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const mockDataClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock("../src/api", () => ({
  createApi: (_baseURL: string, farmId: string) => (farmId ? mockDataClient : mockFarmsClient),
  login: (...args: unknown[]) => mockLogin(...args),
  register: (...args: unknown[]) => mockRegister(...args),
}));

/** Drives the login form so the main app renders. */
async function signIn() {
  const screen = render(<App />);
  // Wait for the bootstrap session check to resolve and the login form to render.
  // The cold first render on slower CI runners can exceed the default 1s findBy
  // timeout, so allow extra time here.
  fireEvent.changeText(
    await screen.findByTestId("login-email", {}, { timeout: 10000 }),
    "owner@example.com",
  );
  fireEvent.changeText(screen.getByTestId("login-password"), "supersecret1");
  fireEvent.press(screen.getByTestId("login-submit"));
  await waitFor(() => {
    expect(mockFarmsClient.get).toHaveBeenCalledWith("/farms");
  });
  return screen;
}

const mockGetDocumentAsync = jest.fn();

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///tmp/",
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  // Clear the web storage backend so a seeded session never leaks across tests.
  if (typeof localStorage !== "undefined") localStorage.clear();
});

describe("App session persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({ token: "test-token", user: { id: "u1", email: "owner@example.com" } });
    mockFarmsClient.get.mockResolvedValue({ data: [] });
    mockDataClient.get.mockResolvedValue({ data: [] });
  });

  it("persists the session when logging in", async () => {
    const SecureStore = require("expo-secure-store");
    await signIn();
    // Native path writes to SecureStore; web path writes to localStorage.
    const wroteToken =
      SecureStore.setItemAsync.mock.calls.some((c: unknown[]) => c[1] === "test-token") ||
      (typeof localStorage !== "undefined" && localStorage.getItem("auth_token") === "test-token");
    expect(wroteToken).toBe(true);
  });

  it("restores a saved session and skips the login screen", async () => {
    const SecureStore = require("expo-secure-store");
    // Seed both backends so the test is platform-agnostic.
    SecureStore.getItemAsync
      .mockResolvedValueOnce("saved-token")
      .mockResolvedValueOnce("saved@example.com");
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("auth_token", "saved-token");
      localStorage.setItem("auth_email", "saved@example.com");
    }

    const screen = render(<App />);
    await waitFor(() => {
      expect(mockFarmsClient.get).toHaveBeenCalledWith("/farms");
    });
    expect(screen.queryByTestId("login-email")).toBeNull();
  });
});

describe("Onboarding (no farms)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({ token: "test-token", user: { id: "u1", email: "owner@example.com" } });
    mockFarmsClient.get.mockResolvedValue({ data: [] });
    mockFarmsClient.post.mockResolvedValue({ data: { _id: "f-new", name: "My Farm" } });
    mockDataClient.get.mockResolvedValue({ data: [] });
  });

  it("shows the onboarding welcome and hides the main tabs when the user has no farms", async () => {
    const screen = await signIn();

    // The first-run flow takes over instead of the empty tabbed UI.
    await screen.findByText("Bem-vindo a Gestao da Quinta");
    expect(screen.queryByText("Dados")).toBeNull();
  });

  it("creates the first farm from the onboarding form", async () => {
    const screen = await signIn();

    fireEvent.changeText(await screen.findByPlaceholderText("Nova quinta"), "My Farm");
    fireEvent.press(screen.getByText("Criar Quinta"));

    await waitFor(() => {
      expect(mockFarmsClient.post).toHaveBeenCalledWith(
        "/farms",
        expect.objectContaining({ name: "My Farm" }),
      );
    });
  });
});

describe("Farm deletion confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({ token: "test-token", user: { id: "u1", email: "owner@example.com" } });
    mockFarmsClient.get.mockResolvedValue({ data: [{ _id: "f1", name: "Quinta X" }] });
    mockFarmsClient.delete.mockResolvedValue({ data: {} });
    mockDataClient.get.mockResolvedValue({ data: [] });
  });

  it("opens a confirmation modal and deletes the farm when confirmed", async () => {
    const screen = await signIn();

    // Wait for the farm pill (and its delete control) to render once farms load.
    await screen.findByTestId("farm-delete-f1");

    // Press the delete control on the farm pill — opens the modal (not a no-op Alert).
    fireEvent.press(screen.getByTestId("farm-delete-f1"));

    // Confirmation modal text appears.
    await screen.findByText("Eliminar quinta");

    // Confirm deletion.
    fireEvent.press(screen.getByText("Eliminar"));

    await waitFor(() => {
      expect(mockFarmsClient.delete).toHaveBeenCalledWith("/farms/f1");
    });
  });

  it("does not delete when the modal is dismissed with Cancel", async () => {
    const screen = await signIn();
    await screen.findByTestId("farm-delete-f1");

    fireEvent.press(screen.getByTestId("farm-delete-f1"));
    await screen.findByText("Eliminar quinta");
    fireEvent.press(screen.getByText("Cancelar"));

    expect(mockFarmsClient.delete).not.toHaveBeenCalled();
  });
});

describe("Undoable delete (medication)", () => {
  const medEntry = {
    _id: "m1",
    medicineName: "Baycox",
    dose: "3ml",
    date: "2026-06-23",
    frequency: "once",
    animalId: { _id: "a1", name: "Rex" },
  };
  const animal = { _id: "a1", name: "Rex", designation: "Galinha", sex: "male", ringNumber: "G1", birthDate: "2025-01-01" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({ token: "test-token", user: { id: "u1", email: "owner@example.com" } });
    mockFarmsClient.get.mockResolvedValue({ data: [{ _id: "f1", name: "Quinta X" }] });
    mockDataClient.get.mockImplementation((url: string) => {
      if (url === "/medication") return Promise.resolve({ data: [medEntry] });
      if (url === "/animals") return Promise.resolve({ data: [animal] });
      return Promise.resolve({ data: [] });
    });
    mockDataClient.delete.mockResolvedValue({ data: {} });
  });

  it("removes the row and offers Undo without deleting immediately, then restores on Undo", async () => {
    const screen = await signIn();

    // Go to the Medication tab and wait for the record to render.
    fireEvent.press(await screen.findByText("Medicacao"));
    await screen.findByText("Baycox");

    // Delete → optimistic removal + Undo toast, but no server call yet.
    fireEvent.press(screen.getByLabelText("Eliminar"));
    await waitFor(() => expect(screen.queryByText("Baycox")).toBeNull());
    await screen.findByText("Anular");
    expect(mockDataClient.delete).not.toHaveBeenCalled();

    // Undo restores the row and never hits the server.
    fireEvent.press(screen.getByText("Anular"));
    await screen.findByText("Baycox");
    expect(mockDataClient.delete).not.toHaveBeenCalled();
  });
});
