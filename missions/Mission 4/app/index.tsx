import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated,ImageBackground } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();
  const pulse = new Animated.Value(0);

  // Animation de chargement
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();

    // Redirection après 3 secondes
    const timer = setTimeout(() => {
      router.push("./screens/HomeScreen");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const barWidth = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ["30%", "100%"],
  });

  return (
 

    
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconBox}>
          <MaterialIcons name="water-drop" size={70} color="#3B82F6" />
        </View>
        <Text style={styles.title}>إسقيني</Text>
        <Text style={styles.subtitle}>الري الذكي، المبسط.</Text>
      </View>

      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingFill, { width: barWidth }]} />
        </View>
        <Text style={styles.loadingText}>جاري التحميل</Text>
      </View>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F5FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBox: {
    backgroundColor: "#EFF6FF",
    padding: 25,
    borderRadius: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 42,
    color: "#1E293B",
    letterSpacing: 4,
    textTransform: "uppercase",
    fontWeight: "300",
  },
  subtitle: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  loadingBar: {
    width: 120,
    height: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    overflow: "hidden",
  },
  loadingFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 10,
  },
  loadingText: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 14,
    letterSpacing: 1,
  },

});
