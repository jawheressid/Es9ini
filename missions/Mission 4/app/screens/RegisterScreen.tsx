import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = () => {
    if (!fullName || !email || !password) {
      Alert.alert("تنبيه", "عبي المعلومة الكل قبل ما تكمل.");
      return;
    }
    Alert.alert("تمام", "تسجّلت بنجاح.");
    router.push("/screens/LoginScreen");
  };

  return (
    <View style={styles.container}>
      {/* اللوجو */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <MaterialIcons name="water-drop" size={40} color="#3B82F6" />
        </View>
        <Text style={styles.title}>أنشئ حسابك</Text>
        <Text style={styles.subtitle}>نظّم السقي متاعك بذكاء</Text>
      </View>

      {/* الفورم */}
      <View style={styles.form}>
        {/* الاسم */}
        <View style={styles.inputGroup}>
          <MaterialIcons
            name="person"
            size={22}
            color="#9ca3af"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="الاسم الكامل"
            placeholderTextColor="#9ca3af"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* الإيميل */}
        <View style={styles.inputGroup}>
          <MaterialIcons
            name="mail"
            size={22}
            color="#9ca3af"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="الإيميل"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* كلمة السر */}
        <View style={styles.inputGroup}>
          <MaterialIcons
            name="lock"
            size={22}
            color="#9ca3af"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="كلمة السر"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialIcons
              name={showPassword ? "visibility" : "visibility-off"}
              size={22}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>

        {/* الزر */}
        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerText}>إنشاء الحساب</Text>
        </TouchableOpacity>

        {/* رابط تسجيل الدخول */}
        <Text style={styles.footerText}>
          عندك حساب من قبل؟{" "}
          <Text
            style={styles.link}
            onPress={() => router.push("/screens/LoginScreen")}
          >
            دخّل لتطبيقك
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  header: {
    alignItems: "center",
    marginBottom: 35,
  },
  logoBox: {
    backgroundColor: "rgba(59,130,246,0.1)",
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 4,
  },
  form: {
    width: "100%",
    gap: 18,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    color: "#111827",
  },
  eyeButton: {
    padding: 4,
  },
  registerButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  registerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footerText: {
    marginTop: 25,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  link: {
    color: "#3B82F6",
    fontWeight: "600",
  },
});
