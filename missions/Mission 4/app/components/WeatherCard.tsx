import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, I18nManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type WeatherData = {
  name: string;
  main: { temp: number };
  weather: { main: string; description: string }[];
};

export default function WeatherCard() {
  const apiKey = "07357e01f1906b445c5eb9f0904b589a";
  const city = "Tunis"; 

  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=ar&appid=${apiKey}`
        );
        const result = await response.json();
        if (result.cod !== 200) throw new Error(result.message);
        setData(result);
      } catch (err) {
        console.error("Erreur météo :", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={{ marginLeft: 10, color: "#475569" }}>جاري تحميل حالة الطقس...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>تعذّر جلب حالة الطقس</Text>
      </View>
    );
  }

  // --- Choix de l’icône et du message selon la condition météo ---
  const condition = data.weather[0].main.toLowerCase();
  let icon = "weather-cloudy";
  let msg = "الطقس اليوم غائم شوي";
  let colors = ["#dbeafe", "#eff6ff"]; 

  if (condition.includes("rain")) {
    icon = "weather-rainy";
    msg = "فما مطر اليوم، دير بالك 🌧️";
    colors = ["#93c5fd", "#bfdbfe"];
  } else if (condition.includes("clear")) {
    icon = "weather-sunny";
    msg = "الطقس اليوم مزيان ☀️";
    colors = ["#fde68a", "#fef3c7"];
  } else if (condition.includes("storm")) {
    icon = "weather-lightning";
    msg = "فما رعد اليوم ⚡";
    colors = ["#fca5a5", "#fecaca"];
  } else if (condition.includes("snow")) {
    icon = "weather-snowy";
    msg = "الجو بارد وفيه ثلج ❄️";
    colors = ["#e0f2fe", "#bae6fd"];
  }

  return (
    <LinearGradient colors={colors} style={styles.gradient}>
      <View style={styles.card}>
        <View style={styles.row}>
          <MaterialCommunityIcons name={icon as any} size={52} color="#1e40af" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.city}>{data.name}</Text>
            <Text style={styles.desc}>{data.weather[0].description}</Text>
          </View>
        </View>
        <View style={{ alignItems: I18nManager.isRTL ? "flex-start" : "flex-end" }}>
          <Text style={styles.temp}>{Math.round(data.main.temp)}°</Text>
          <Text style={styles.message}>{msg}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  row: { flexDirection: "row", alignItems: "center" },
  city: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "right",
  },
  desc: {
    fontSize: 14,
    color: "#334155",
    textAlign: "right",
  },
  temp: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  message: {
    fontSize: 14,
    color: "#1e293b",
    marginTop: 4,
    textAlign: "right",
  },
  errorText: { color: "#ef4444", fontSize: 15, textAlign: "center" },
});
