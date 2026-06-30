import axios, { AxiosHeaders } from "axios";

export const createApi = (
  baseURL: string,
  farmId: string,
  token?: string,
  onUnauthorized?: () => void
) => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json"
    }
  });

  client.interceptors.request.use((config) => {
    const headers = AxiosHeaders.from(config.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (farmId) {
      config.params = {
        ...(config.params ?? {}),
        farmId
      };
      headers.set("x-farm-id", farmId);
    }

    config.headers = headers;
    return config;
  });

  // A 401 means the token is missing/expired/invalid — surface it so the app
  // can drop the dead session and return the user to the login screen.
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export type AuthResult = { token: string; user: { id: string; email: string } };

/** Registers a new account and returns the issued token + user. */
export const register = async (baseURL: string, email: string, password: string): Promise<AuthResult> => {
  const res = await axios.post(`${baseURL}/auth/register`, { email, password }, { timeout: 10000 });
  return res.data;
};

/** Logs in and returns the issued token + user. */
export const login = async (baseURL: string, email: string, password: string): Promise<AuthResult> => {
  const res = await axios.post(`${baseURL}/auth/login`, { email, password }, { timeout: 10000 });
  return res.data;
};
