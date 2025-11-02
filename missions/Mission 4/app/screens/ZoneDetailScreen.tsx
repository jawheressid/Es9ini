import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getLatest,
  sendCommand,
  setZoneMode,
  TelemetryPayload,
} from "../services/api";

type ZoneMeta = {
  id: string;
  name: string;
  image?: string | null;
  waterLevel?: number;
  lastUpdate?: string | null;
  mode?: "auto" | "manual";
};

type ZoneMode = "auto" | "manual";

const clampPercent = (value: unknown, fallback = 0) => {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return Math.max(0, Math.min(100, Math.round(num)));
  }
  return fallback;
};

const deriveMode = (mode: unknown): ZoneMode =>
  mode === "manual" ? "manual" : "auto";

const formatLastUpdate = (iso?: string | null) => {
  if (!iso) return "no recent measurements";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown timestamp";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (diffSec < 60) return "less than 1 min ago";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h ago`;
  return date.toLocaleDateString();
};

const sanitizeStoredZone = (value: any) => {
  if (!value || typeof value !== "object") return value;
  const { schedule, ...rest } = value;
  return rest;
};

const telemetryWaterLevel = (telemetry?: TelemetryPayload | null, fallback = 0) =>
  clampPercent(telemetry?.moist ?? fallback, fallback);

export default function ZoneDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const areaIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const areaId = typeof areaIdParam === "string" && areaIdParam.trim().length > 0
    ? areaIdParam.trim()
    : null;

  const [zone, setZone] = useState<ZoneMeta | null>(null);
  const [mode, setMode] = useState<ZoneMode>("auto");
  const [modeBusy, setModeBusy] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);

  const isMounted = useRef(true);
  const zoneRef = useRef<ZoneMeta | null>(null);
  const imageUriRef = useRef<string | null>(null);
  const modeRef = useRef<ZoneMode>("auto");

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    zoneRef.current = zone;
  }, [zone]);

  useEffect(() => {
    imageUriRef.current = imageUri;
  }, [imageUri]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const persistZone = useCallback(
    async (mutator: (zone: Record<string, any>) => Record<string, any>) => {
      if (!areaId) return;
      try {
        const saved = await AsyncStorage.getItem("zones");
        let parsed: any[] = [];
        if (saved) {
          const raw = JSON.parse(saved);
          if (Array.isArray(raw)) {
            parsed = raw;
          }
        }
        let found = false;
        const updated = parsed.map((entry: any) => {
          if (!entry || typeof entry !== "object") return entry;
          const base = sanitizeStoredZone(entry);
          if (String(base.id) !== areaId) return base;
          found = true;
          const next = sanitizeStoredZone(mutator({ ...base }));
          return { ...base, ...next };
        });
        if (!found) {
          const seeded = sanitizeStoredZone(mutator({ id: areaId }));
          updated.push({ id: areaId, ...seeded });
        }
        await AsyncStorage.setItem("zones", JSON.stringify(updated));
      } catch (err) {
        console.log("[ZoneDetail] Failed to update local cache:", err);
      }
    },
    [areaId]
  );

  const persistTelemetry = useCallback(
    async (waterLevelValue: number, timestamp?: string | null, nextMode?: ZoneMode) => {
      await persistZone((stored) => ({
        ...stored,
        waterLevel: waterLevelValue,
        lastUpdate: timestamp ?? stored.lastUpdate ?? null,
        mode: nextMode ?? stored.mode,
      }));
    },
    [persistZone]
  );

  const loadZone = useCallback(async () => {
    if (!areaId) {
      setLoading(false);
      return;
    }
    try {
      const saved = await AsyncStorage.getItem("zones");
      if (saved) {
        const allZones = JSON.parse(saved);
        if (Array.isArray(allZones)) {
          const rawZone = allZones.find(
            (z: any) => String(z?.id) === areaId
          );
          if (rawZone) {
            const sanitized = sanitizeStoredZone(rawZone);
            const meta: ZoneMeta = {
              id: areaId,
              name: sanitized.name ?? areaId,
              image: sanitized.image ?? null,
              waterLevel: Number(sanitized.waterLevel ?? 0),
              lastUpdate: sanitized.lastUpdate ?? null,
              mode: deriveMode(sanitized.mode),
            };
            setZone(meta);
            setImageUri(meta.image ?? null);
            setMode(deriveMode(meta.mode));
          }
        }
      }
    } catch (err) {
      console.log("[ZoneDetail] Failed to load zone:", err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [areaId]);

  const fetchTelemetry = useCallback(
    async (modeHint: "initial" | "silent" = "initial") => {
      if (!areaId) return;
      if (modeHint === "initial") setTelemetryLoading(true);
      try {
        const data = await getLatest(areaId);
        if (!isMounted.current) return;
        setTelemetry(data);

        if (data) {
          const zoneSnapshot = zoneRef.current;
          const imageSnapshot = imageUriRef.current;
          const modeSnapshot = modeRef.current;
          const moisture = telemetryWaterLevel(data, zoneSnapshot?.waterLevel ?? 0);
          const nextMode = deriveMode(data.mode ?? modeSnapshot);
          const nextZone: ZoneMeta = {
            id: zoneSnapshot?.id ?? areaId,
            name: zoneSnapshot?.name ?? areaId,
            image: imageSnapshot,
            waterLevel: moisture,
            lastUpdate: data.ts ?? zoneSnapshot?.lastUpdate ?? null,
            mode: nextMode,
          };
          const shouldUpdateMode = nextMode !== modeSnapshot;
          zoneRef.current = nextZone;
          setZone(nextZone);
          if (shouldUpdateMode) {
            setMode(nextMode);
          }
          modeRef.current = nextMode;
          await persistTelemetry(moisture, data.ts ?? null, nextMode);
          if (data.last_pump !== undefined) {
            setIsWatering(Number(data.last_pump) === 1);
          }
        }
        setTelemetryError(null);
      } catch (err) {
        console.log("[ZoneDetail] Telemetry request failed:", err);
        if (modeHint !== "silent" && isMounted.current) {
          setTelemetryError("تعذر تحديث البيانات الحية.");
        }
      } finally {
        if (modeHint === "initial" && isMounted.current) {
          setTelemetryLoading(false);
        }
      }
    },
    [areaId, persistTelemetry]
  );

  useEffect(() => {
    loadZone();
  }, [loadZone]);

  useEffect(() => {
    if (!areaId) return;
    fetchTelemetry("initial");
    const interval = setInterval(() => fetchTelemetry("silent"), 5000);
    return () => clearInterval(interval);
  }, [areaId, fetchTelemetry]);

  const handleModeChange = useCallback(
    async (nextMode: ZoneMode) => {
      if (!areaId || mode === nextMode) return;
      const previousMode = mode;
      setMode(nextMode);
      setModeBusy(true);
      try {
        await setZoneMode(areaId, nextMode);
        setZone((prev) =>
          prev
            ? { ...prev, mode: nextMode }
            : { id: areaId, name: areaId, mode: nextMode }
        );
        await persistZone((stored) => ({
          ...stored,
          mode: nextMode,
        }));
        if (nextMode === "auto") {
          fetchTelemetry("silent");
        }
      } catch (err) {
        console.log("[ZoneDetail] Failed to set mode:", err);
        Alert.alert(
          "تعذر تغيير الوضع",
          "لم نتمكن من تعديل وضع الري الآن، يرجى المحاولة لاحقاً."
        );
        setMode(previousMode);
      } finally {
        setModeBusy(false);
      }
    },
    [areaId, fetchTelemetry, mode, persistZone]
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const saveChanges = useCallback(async () => {
    if (!areaId || !zone) return;
    await persistZone((stored) => ({
      ...stored,
      name: zone.name,
      image: imageUri,
      mode,
    }));
    Alert.alert("تم الحفظ", "تم تحديث بيانات المنطقة.");
    router.back();
  }, [areaId, imageUri, mode, persistZone, router, zone]);

  const toggleWatering = async () => {
    if (!areaId) return;
    if (mode === "auto") {
      Alert.alert(
        "الوضع التلقائي مفعل",
        "قم بالتبديل إلى الوضع اليدوي للتحكم في المضخة مباشرة."
      );
      return;
    }
    const nextState = !isWatering;
    setCommandLoading(true);
    try {
      await sendCommand(areaId, nextState ? 1 : 0);
      setIsWatering(nextState);
      Alert.alert(
        nextState ? "تم تشغيل المضخة" : "تم إيقاف المضخة",
        nextState ? "الري يعمل الآن." : "تم إيقاف عملية الري."
      );
      fetchTelemetry("silent");
    } catch (err) {
      console.log("[ZoneDetail] Failed to send pump command:", err);
      Alert.alert(
        "تعذر تنفيذ الأمر",
        "تعذر إرسال الأمر إلى الخادم. يرجى التحقق من الاتصال."
      );
    } finally {
      setCommandLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: "#475569", marginTop: 10 }}>
          جاري تحميل تفاصيل المنطقة...
        </Text>
      </View>
    );
  }

  if (!areaId || !zone) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#ef4444", fontSize: 16 }}>
          تعذر العثور على المنطقة أو تم حذفها مسبقاً.
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: "#3b82f6", marginTop: 20 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.saveText}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const waterLevel = telemetryWaterLevel(telemetry, zone.waterLevel ?? 0);
  const dryness = clampPercent(telemetry?.dryness ?? 100 - waterLevel);
  const waterColor =
    waterLevel >= 60 ? "#3b82f6" : waterLevel >= 30 ? "#f59e0b" : "#ef4444";
  const irrigationStatus = isWatering ? "الري قيد التشغيل" : "المضخة متوقفة";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تفاصيل المنطقة: {zone.name}</Text>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "manual" ? styles.modeButtonActive : styles.modeButtonIdle,
          ]}
          onPress={() => handleModeChange("manual")}
          disabled={modeBusy}
        >
          <MaterialIcons
            name="handyman"
            size={18}
            color={mode === "manual" ? "#0f172a" : "#64748b"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.modeButtonText,
              mode === "manual" ? styles.modeButtonTextActive : styles.modeButtonTextIdle,
            ]}
          >
            يدوي
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "auto" ? styles.modeButtonActive : styles.modeButtonIdle,
          ]}
          onPress={() => handleModeChange("auto")}
          disabled={modeBusy}
        >
          <MaterialIcons
            name="autorenew"
            size={18}
            color={mode === "auto" ? "#0f172a" : "#64748b"}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.modeButtonText,
              mode === "auto" ? styles.modeButtonTextActive : styles.modeButtonTextIdle,
            ]}
          >
            تلقائي
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.modeHelp}>
        في الوضع التلقائي تعمل المضخة عندما تتجاوز نسبة الجفاف 70٪ وتتوقف عند أقل من 30٪،
        بينما يمنحك الوضع اليدوي التحكم الكامل في تشغيل وإيقاف المضخة.
      </Text>

      <View style={styles.waterSection}>
        <Text style={[styles.waterLabel, { color: waterColor }]}>
          رطوبة التربة: {waterLevel}%
        </Text>
        <Text
          style={[
            styles.statusText,
            { color: isWatering ? "#0ea5e9" : waterColor },
          ]}
        >
          {irrigationStatus}
        </Text>
        <View style={styles.waterBar}>
          <View
            style={[
              styles.waterFill,
              { width: `${waterLevel}%`, backgroundColor: waterColor },
            ]}
          />
        </View>
        <Text style={styles.extraInfo}>
          تقدير نسبة الجفاف: {dryness}%
        </Text>
        <Text style={styles.extraInfo}>
          آخر قراءة - {formatLastUpdate(telemetry?.ts ?? zone.lastUpdate ?? null)}
        </Text>
        {telemetryLoading && (
          <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 8 }} />
        )}
        {telemetryError && (
          <Text style={styles.telemetryError}>{telemetryError}</Text>
        )}
      </View>

      <Text style={styles.label}>اسم المنطقة</Text>
      <TextInput
        value={zone.name}
        onChangeText={(text) => setZone({ ...zone, name: text })}
        style={styles.input}
        placeholder="اسم مخصص"
      />

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>إضافة صورة</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          mode === "auto"
            ? styles.buttonDisabled
            : { backgroundColor: isWatering ? "#ef4444" : "#3b82f6" },
        ]}
        onPress={toggleWatering}
        disabled={commandLoading || mode === "auto"}
      >
        {commandLoading ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
        ) : (
          <MaterialIcons
            name={isWatering ? "pause-circle" : "water-drop"}
            size={22}
            color="#fff"
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={styles.buttonText}>
          {mode === "auto"
            ? "قم بالتبديل إلى الوضع اليدوي للتحكم"
            : isWatering
            ? "إيقاف الري"
            : "بدء الري"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
        <Text style={styles.saveText}>حفظ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  modeToggle: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#cbd5f5",
  },
  modeButtonActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#38bdf8",
  },
  modeButtonIdle: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: "#0f172a",
  },
  modeButtonTextIdle: {
    color: "#64748b",
  },
  modeHelp: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
  },
  waterSection: { alignItems: "center", marginBottom: 20 },
  waterLabel: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  statusText: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  waterBar: {
    width: "90%",
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  waterFill: { height: "100%", borderRadius: 10 },
  extraInfo: { marginTop: 8, color: "#475569", fontSize: 13 },
  telemetryError: { marginTop: 8, color: "#ef4444", fontSize: 13, textAlign: "center" },
  label: { fontSize: 15, color: "#475569", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    backgroundColor: "#f8fafc",
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    marginBottom: 20,
  },
  image: { width: "100%", height: "100%", borderRadius: 8 },
  imagePlaceholder: { color: "#64748b" },
  button: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  saveButton: {
    backgroundColor: "#10b981",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
