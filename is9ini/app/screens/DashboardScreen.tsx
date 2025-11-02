import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Toast from "react-native-root-toast";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WeatherCard from "../components/WeatherCard";
import WeatherForecastCard from "../components/WeatherForecastCard";
import { getLatest, getZones, TelemetryPayload } from "../services/api";

type StoredZone = {
  id: string;
  name?: string;
  color?: string;
  image?: string | null;
  waterLevel?: number;
  lastUpdate?: string | null;
  mode?: "auto" | "manual" | string;
};

type ZoneMode = "auto" | "manual";

type DisplayZone = StoredZone & {
  name: string;
  color: string;
  waterLevel: number;
  dryness: number;
  mode: ZoneMode;
  telemetry?: TelemetryPayload | null;
};

const CONNECTED_ZONE_ID = "tofe7";

const isConnectedZone = (id: string) =>
  String(id).toLowerCase().includes(CONNECTED_ZONE_ID);

const defaultZones: StoredZone[] = [
  { id: CONNECTED_ZONE_ID, name: "Tofe7", color: "#e0f2f1", mode: "auto" },
];

const colorPalette = [
  "#fde2e4",
  "#e0f2f1",
  "#dcedc8",
  "#e0e7ff",
  "#fef3c7",
  "#fbcfe8",
  "#bbf7d0",
  "#bae6fd",
];

const clampPercent = (value: unknown, fallback = 0) => {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return Math.max(0, Math.min(100, Math.round(num)));
  }
  return fallback;
};

const normalizeMode = (value: unknown): ZoneMode =>
  value === "manual" ? "manual" : "auto";

const prettifyId = (id: string) => {
  const clean = id.replace(/[_-]+/g, " ").trim();
  if (!clean) return `Zone ${id}`;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const formatLastUpdate = (iso?: string | null) => {
  if (!iso) return "no recent data";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown timestamp";
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (diffSec < 60) return "less than 1 min ago";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h ago`;
  return date.toLocaleDateString();
};

const buildDisplayZone = (
  zone: StoredZone,
  telemetry?: TelemetryPayload | null
): DisplayZone => {
  const moisture = clampPercent(telemetry?.moist ?? zone.waterLevel ?? 0);
  const dryness = clampPercent(telemetry?.dryness ?? 100 - moisture);
  const lastUpdate = telemetry?.ts ?? zone.lastUpdate ?? null;
  const mode = normalizeMode(telemetry?.mode ?? zone.mode);

  return {
    ...zone,
    id: String(zone.id),
    name: zone.name?.trim().length ? zone.name : prettifyId(String(zone.id)),
    color: zone.color ?? "#e2e8f0",
    waterLevel: moisture,
    dryness,
    lastUpdate,
    mode,
    telemetry,
  };
};

const toStoredZone = (zone: DisplayZone): StoredZone => ({
  id: zone.id,
  name: zone.name,
  color: zone.color,
  image: zone.image ?? null,
  waterLevel: zone.waterLevel,
  lastUpdate: zone.lastUpdate ?? null,
  mode: zone.mode,
});

type LoadMode = "initial" | "refresh" | "silent";

export default function DashboardScreen() {
    const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfileImage = async () => {
      const storedImage = await AsyncStorage.getItem("profileImage");
      if (storedImage) setProfileImage(storedImage);
    };
    loadProfileImage();
  }, []);

  const router = useRouter();
  const [zones, setZones] = useState<DisplayZone[]>([]);
  const zonesRef = useRef<DisplayZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFocus = useRef(true);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const persistZonesState = useCallback(
    async (list: DisplayZone[]) => {
      try {
        const serialized = list.map(toStoredZone);
        await AsyncStorage.setItem("zones", JSON.stringify(serialized));
      } catch (err) {
        console.log("[Dashboard] Failed to persist zones:", err);
      }
    },
    []
  );

const loadZones = useCallback(
  async (mode: LoadMode = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    let storedZones: StoredZone[] = defaultZones;
    try {
      const saved = await AsyncStorage.getItem("zones");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          storedZones = parsed
            .filter((z: any) => z && z.id)
            .map((z: any, idx: number) => ({
              id: String(z.id),
              name: z.name,
              color: z.color ?? colorPalette[idx % colorPalette.length],
              image: z.image ?? null,
              waterLevel: Number(z.waterLevel ?? 0),
              lastUpdate: z.lastUpdate ?? null,
              mode: normalizeMode(z.mode),
            }));
        }
      } else {
        await AsyncStorage.setItem("zones", JSON.stringify(defaultZones));
      }
    } catch (parseErr) {
      console.log("[Dashboard] Failed to read stored zones:", parseErr);
    }

    try {
      const ping = await getZones();
      const backendIds = (ping?.zones ?? []).map((id) => String(id));
      const backendModes = ping?.modes ?? {};

      let zoneIds =
        backendIds.length > 0
          ? backendIds
          : storedZones.map((zone) => String(zone.id));

      if (zoneIds.length === 0) {
        zoneIds = defaultZones.map((zone) => String(zone.id));
      }

      const uniqueIds: string[] = [];
      const seen = new Set<string>();
      zoneIds.forEach((id) => {
        if (!seen.has(id)) {
          seen.add(id);
          uniqueIds.push(id);
        }
      });

      const metaMap = new Map<string, StoredZone>();
      uniqueIds.forEach((id, idx) => {
        const stored = storedZones.find((zone) => String(zone.id) === id);
        metaMap.set(id, {
          id,
          name: stored?.name ?? prettifyId(id),
          color: stored?.color ?? colorPalette[idx % colorPalette.length],
          image: stored?.image ?? null,
          waterLevel: stored?.waterLevel ?? 0,
          lastUpdate: stored?.lastUpdate ?? null,
          mode: normalizeMode(stored?.mode ?? backendModes[id]),
        });
      });

      const telemetryList = await Promise.all(
        uniqueIds.map((id) =>
          getLatest(id).catch((err) => {
            console.log(`[Dashboard] Failed to retrieve ${id}:`, err);
            return null;
          })
        )
      );

      const displayZones = uniqueIds.map((id, index) => {
        const meta = metaMap.get(id)!;
        const zone = buildDisplayZone(meta, telemetryList[index]);
        metaMap.set(id, {
          ...meta,
          name: zone.name,
          waterLevel: zone.waterLevel,
          lastUpdate: zone.lastUpdate ?? null,
          mode: zone.mode,
        });
        return zone;
      });

      if (!isMounted.current) return;

      zonesRef.current = displayZones;
      setZones(displayZones);
      setError(null);

      try {
        const toPersist = displayZones.map(toStoredZone);
        await AsyncStorage.setItem("zones", JSON.stringify(toPersist));
      } catch (persistErr) {
        console.log("[Dashboard] Failed to persist zones:", persistErr);
      }
    } catch (err) {
      console.log("[Dashboard] Backend fetch failed:", err);
      if (!isMounted.current) return;
      const fallback = storedZones.map((meta, idx) =>
        buildDisplayZone(
          {
            ...meta,
            color: meta.color ?? colorPalette[idx % colorPalette.length],
            mode: normalizeMode(meta.mode),
          },
          null
        )
      );
      zonesRef.current = fallback;
      setZones(fallback);
      if (mode !== "silent") {
        setError("تعذر تحديث البيانات الحية؛ يتم عرض البيانات المخزنة مؤقتاً.");
      }
    } finally {
      if (mode === "initial") setLoading(false);
      if (mode === "refresh") setRefreshing(false);
    }
  },
  []
);

const handleAddZone = useCallback(() => {
  router.push("/screens/AddZoneScreen");
}, []);


const handleDeleteZone = useCallback(
  (zoneId: string, zoneName: string) => {
    const isProtected = isConnectedZone(zoneId);
    if (isProtected) {
      Alert.alert("منطقة محمية", "لا يمكن حذف المنطقة المتصلة.");
      return;
    }
    Alert.alert(
      "حذف المنطقة",
      `هل تريد حذف ${zoneName}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            const nextZones = zonesRef.current.filter((zone) => zone.id !== zoneId);
            zonesRef.current = nextZones;
            setZones(nextZones);
            try {
              await persistZonesState(nextZones);
            } catch (err) {
              console.log("[Dashboard] Failed to delete zone:", err);
              }
            },
          },
        ]
      );
    },
    [persistZonesState]
  );

  useEffect(() => {
    loadZones("initial");
    const interval = setInterval(() => loadZones("silent"), 5000);
    return () => clearInterval(interval);
  }, [loadZones]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
      } else {
        loadZones("refresh");
      }
      return () => {};
    }, [loadZones])
  );

  const criticalZones = zones.filter((zone) => zone.waterLevel < 30);
  const hasCritical = criticalZones.length > 0;
  const notificationMessage = hasCritical
    ? `تنبيه: ${criticalZones.map((zone) => zone.name).join(", ")} أقل من 30٪ رطوبة.`
    : "جميع المناطق استجابت خلال دورة الري الأخيرة بدون أي إنذارات.";
  const notificationIconName = hasCritical ? "warning-amber" : "check-circle";
  const notificationIconColor = hasCritical ? "#f97316" : "#22c55e";
  const notificationStyle = hasCritical ? styles.notificationAlert : styles.notification;
useEffect(() => {
  if (hasCritical) {
    const message = `🚨 الرطوبة منخفضة في ${criticalZones
      .map((z) => z.name)
      .join(", ")} أقل من 30٪!`;

    Toast.show(message, {
      duration: Toast.durations.LONG,
      position: Toast.positions.TOP, 
      backgroundColor: "#ef4444",
      textColor: "#fff",
      opacity: 1,
      shadow: true,
      animation: true,
      hideOnPress: true,
      delay: 0,
    });
  }
}, [hasCritical]);

  const handleZonePress = (zone: DisplayZone) => {
    router.push(`/screens/ZoneDetailScreen?id=${zone.id}`);
  };

  const renderZone = ({ item }: { item: DisplayZone }) => {
    const pumpOn = item.telemetry?.last_pump === 1;
    const waterColor =
      item.waterLevel >= 60 ? "#3b82f6" : item.waterLevel >= 30 ? "#f59e0b" : "#ef4444";

    return (
      <View style={styles.zoneWrapper}>
        <View style={styles.zoneHeaderRow}>
          <Text style={styles.zoneName}>{item.name}</Text>
          {!isConnectedZone(item.id) && (
            <TouchableOpacity
              onPress={() => handleDeleteZone(item.id, item.name)}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => handleZonePress(item)}
          style={[styles.zoneBox, { backgroundColor: item.color }]}
        >
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.zoneImage}
            />
          ) : (
            <View style={styles.zonePlaceholderContainer}>
              <Text style={styles.zonePlaceholderText}>{item.id.toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.waterContainer}>
          <View style={styles.waterInfo}>
            <MaterialIcons
              name="water-drop"
              size={18}
              color={waterColor}
            />
            <Text style={[styles.waterText, { color: waterColor }]}>
              {item.waterLevel}%
            </Text>
            <Text style={styles.waterLabel}>الرطوبة</Text>
          </View>
          <View style={styles.waterBar}>
            <View
              style={[
                styles.waterFill,
                { width: `${item.waterLevel}%`, backgroundColor: waterColor },
              ]}
            />
          </View>
          <Text style={styles.statusLine}>
          {pumpOn ? "المضخة تعمل" : "المضخة متوقفة"} | الوضع:{" "}
          {item.mode === "manual" ? "يدوي" : "تلقائي"}
          </Text>
          <Text style={styles.statusLine}>
          نسبة الجفاف {item.dryness}% | {formatLastUpdate(item.lastUpdate)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
     <View style={styles.headerRow}>
  {}
  <TouchableOpacity onPress={() => router.push("/screens/ProfileScreen")}>
    <Image
      source={
        profileImage
          ? { uri: profileImage }
          : require("../../assets/mabrouka.png")
      }
      style={styles.profileImage}
    />
  </TouchableOpacity>

  {}
  <Text style={styles.title}>إسقيني</Text>

  {}
  <TouchableOpacity style={styles.addButton} onPress={handleAddZone}>
    <MaterialIcons name="add" size={20} color="#0f172a" />
  </TouchableOpacity>
</View>


      <WeatherCard />

      {error && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={notificationStyle}>
        <MaterialIcons name={notificationIconName} size={20} color={notificationIconColor} />
        <Text style={styles.notificationText}>
          {notificationMessage}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>المناطق النشطة</Text>

      {loading && zones.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.emptyText, { marginTop: 10 }]}>
            جاري تحميل المناطق...
          </Text>
        </View>
      ) : zones.length === 0 ? (
        <Text style={styles.emptyText}>لا توجد مناطق متاحة حالياً.</Text>
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={renderZone}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadZones("refresh")}
              tintColor="#3b82f6"
              colors={["#3b82f6"]}
            />
          }
        />
      )}

      <WeatherForecastCard />
        

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 50  
 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerSpacer: {
    width: 32,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a", flex: 1, textAlign: "center" },
  addButton: {
    marginLeft: 12,
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  errorText: {
    color: "#b91c1c",
    marginLeft: 8,
    flex: 1,
    fontSize: 13,
  },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  notificationتنبيه: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  notificationText: { marginLeft: 10, color: "#475569", fontSize: 14, flex: 1 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#0f172a", marginBottom: 12 },
  emptyText: { color: "#64748b", textAlign: "center", marginTop: 20 },
  emptyWrapper: { alignItems: "center", justifyContent: "center", marginTop: 40 },
  zoneWrapper: {
    width: "48%",
    marginBottom: 25,
  },
    profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },

  zoneHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
  },
  zoneBox: {
    width: "100%",
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  zoneImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  zonePlaceholderContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  zonePlaceholderText: {
    color: "rgba(15, 23, 42, 0.7)",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  waterContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  waterInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  waterText: { fontWeight: "700", marginLeft: 4 },
  waterLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  waterBar: {
    width: "90%",
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  waterFill: {
    height: "100%",
    borderRadius: 10,
  },
  statusLine: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
