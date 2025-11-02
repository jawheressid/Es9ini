import Constants from "expo-constants";

type Extra = {
  apiUrl?: string;
};

const DEFAULT_API_URL = "http://localhost:8000";

const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

const readExtra = (): Extra => {
  const expoConfig = (Constants.expoConfig as { extra?: Extra }) ?? {};
  const manifest = (Constants.manifest as { extra?: Extra }) ?? {};
  return expoConfig.extra ?? manifest.extra ?? {};
};

const envApi =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
  (typeof process !== "undefined" && process.env?.API_URL);

const extra = readExtra();

export const API_BASE_URL = normalizeUrl(envApi ?? extra.apiUrl ?? DEFAULT_API_URL);

const deriveWs = (httpUrl: string) => {
  if (httpUrl.startsWith("https://")) return `wss://${httpUrl.slice("https://".length)}`;
  if (httpUrl.startsWith("http://")) return `ws://${httpUrl.slice("http://".length)}`;
  return httpUrl;
};

export const WS_BASE_URL = deriveWs(API_BASE_URL);

export const API_TIMEOUT = 8000;
