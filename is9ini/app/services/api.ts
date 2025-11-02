import { API_BASE_URL, API_TIMEOUT } from "../config/env";

export type TelemetryPayload = {
  area_id: string;
  ts?: string;
  dryness?: number;
  moist?: number;
  last_pump?: number;
  mode?: "auto" | "manual" | string;
  [key: string]: unknown;
};

export type PingResponse = {
  ok: boolean;
  zones: string[];
  modes?: Record<string, "auto" | "manual" | string>;
};

const API_ROOT = API_BASE_URL;

const fetchJson = async <T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = API_TIMEOUT
): Promise<T> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
};

export const getZones = async (): Promise<PingResponse> =>
  fetchJson<PingResponse>("/api/ping");

export const getLatest = async (areaId: string): Promise<TelemetryPayload | null> => {
  const data = await fetchJson<{ ok: boolean; data: TelemetryPayload | null }>(
    `/api/latest?area_id=${encodeURIComponent(areaId)}`
  );
  return data.data;
};

export const getHistory = async (
  areaId: string,
  minutes = 60
): Promise<TelemetryPayload[]> => {
  const data = await fetchJson<{ ok: boolean; data: TelemetryPayload[] }>(
    `/api/history?area_id=${encodeURIComponent(areaId)}&minutes=${minutes}`
  );
  return data.data ?? [];
};

export const sendCommand = async (
  areaId: string,
  order: 0 | 1
): Promise<{ ok: boolean }> =>
  fetchJson<{ ok: boolean }>(
    `/api/cmd?area_id=${encodeURIComponent(areaId)}&order=${order}`,
    { method: "POST" }
  );

export const toggleAutoMode = async (
  enabled: boolean
): Promise<{ ok: boolean; auto: boolean }> =>
  fetchJson(
    `/api/auto?enabled=${enabled ? 1 : 0}`,
    { method: "POST" }
  );

export const setZoneMode = async (
  areaId: string,
  mode: "auto" | "manual"
): Promise<{ ok: boolean; area_id: string; mode: string }> =>
  fetchJson(
    `/api/set-mode?area_id=${encodeURIComponent(areaId)}&mode=${mode}`,
    { method: "POST" }
  );
