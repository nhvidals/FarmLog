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

describe("App farm guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({ token: "test-token", user: { id: "u1", email: "owner@example.com" } });
    mockFarmsClient.get.mockResolvedValue({ data: [] });
    mockDataClient.get.mockResolvedValue({ data: [] });
    mockDataClient.post.mockResolvedValue({ data: {} });
  });

  it("blocks export when no farm is selected and shows a toast", async () => {
    const screen = await signIn();

    fireEvent.press(screen.getByText("Dados"));
    fireEvent.press(screen.getAllByText("Exportar JSON")[1]);

    // Feedback is now an in-app toast (Alert.alert is a no-op on web).
    await screen.findByText("Selecione uma quinta.");
    expect(mockDataClient.get).not.toHaveBeenCalledWith("/data/export");
  });

  it("blocks import when no farm is selected and shows a toast", async () => {
    const screen = await signIn();

    fireEvent.press(screen.getByText("Dados"));
    fireEvent.press(screen.getAllByText("Importar JSON")[1]);

    await screen.findByText("Selecione uma quinta.");
    expect(mockGetDocumentAsync).not.toHaveBeenCalled();
    expect(mockDataClient.post).not.toHaveBeenCalledWith("/data/import", expect.anything());
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
