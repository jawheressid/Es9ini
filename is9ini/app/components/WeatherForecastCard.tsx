import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type ForecastItem = {
  dt_txt: string;
  main: { temp: number };
  weather: { main: string; description: string }[];
};

export default function WeatherForecastCard() {
  const apiKey = "07357e01f1906b445c5eb9f0904b589a";
  const city = "Tunis";

  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&lang=ar&appid=${apiKey}`
        );
        const json = await res.json();
        if (json.cod !== "200") throw new Error(json.message);

        const filtered = json.list.filter((item: ForecastItem) =>
          item.dt_txt.includes("12:00:00")
        );

        // garder les 3 prochains jours et inverser l'ordre pour affichage droite->gauche
        const nextDays = filtered.slice(1, 4);
        setForecast(nextDays);
      } catch (err) {
        console.error("Erreur forecast:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  const getIcon = (condition: string) => {
    condition = condition.toLowerCase();
    if (condition.includes("rain")) return "weather-rainy";
    if (condition.includes("clear")) return "weather-sunny";
    if (condition.includes("cloud")) return "weather-cloudy";
    if (condition.includes("storm")) return "weather-lightning";
    if (condition.includes("snow")) return "weather-snowy";
    return "weather-partly-cloudy";
  };

  const getColors = (condition: string) => {
    condition = condition.toLowerCase();
    if (condition.includes("rain")) return ["#93c5fd", "#bfdbfe"];
    if (condition.includes("clear")) return ["#fde68a", "#fef3c7"];
    if (condition.includes("cloud")) return ["#e2e8f0", "#f8fafc"];
    if (condition.includes("storm")) return ["#fca5a5", "#fecaca"];
    return ["#e0f2fe", "#bae6fd"];
  };

  const getDayName = (dateStr: string) => {
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const d = new Date(dateStr);
    return days[d.getDay()];
  };

  if (loading)
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#3b82f6" />
        <Text style={{ marginLeft: 10, color: "#475569" }}>جاري تحميل التوقعات...</Text>
      </View>
    );

  if (error || forecast.length === 0)
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>ما نجمتش نجيب التوقعات الجوية</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>توقعات الطقس لـ 3 أيام القادمة</Text>

      <View
        style={[
          styles.rowCentered,
          { flexDirection: I18nManager.isRTL ? "row" : "row-reverse" },
        ]}
      >
        {forecast.map((item) => {
          const condition = item.weather[0].main;
          const colors = getColors(condition);
          return (
            <LinearGradient
              key={item.dt_txt}
              colors={colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Text style={styles.day}>{getDayName(item.dt_txt)}</Text>
              <MaterialCommunityIcons
                name={getIcon(condition) as any}
                size={48}
                color="#1e3a8a"
                style={{ marginVertical: 8 }}
              />
              <Text style={styles.temp}>{Math.round(item.main.temp)}°</Text>
              <Text style={styles.desc}>{item.weather[0].description}</Text>
            </LinearGradient>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 20 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 18,
  },
  rowCentered: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  card: {
    width: 110,
    height: 160,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    paddingVertical: 10,
  },
  day: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  temp: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1e3a8a",
    marginVertical: 4,
  },
  desc: {
    fontSize: 13,
    color: "#334155",
    textAlign: "center",
    marginHorizontal: 8,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
  },
  errorBox: {
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
  },
  errorText: { color: "#b91c1c", textAlign: "center", fontSize: 14 },
});
