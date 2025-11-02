import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>مرحبا بيكم في إسقيني</Text>
      <Text style={styles.text}>
        أنتم مستعدون لإدارة الري الخاص بكم بذكاء.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => router.push("/screens/LoginScreen")}
        >
          <Text style={styles.buttonText}>تسجيل الدخول</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={() => router.push("/screens/RegisterScreen")}
        >
          <Text style={[styles.buttonText, { color: "#3B82F6" }]}>
            إنشاء حساب
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    color: "#3B82F6",
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "600",
  },
  text: {
    fontSize: 16,
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 40,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    gap: 15,
  },
  button: {
    width: "80%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  loginButton: {
    backgroundColor: "#3B82F6",
  },
  registerButton: {
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    backgroundColor: "transparent",
  },
  buttonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
});
