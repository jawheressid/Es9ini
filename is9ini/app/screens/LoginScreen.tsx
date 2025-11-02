import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  I18nManager,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("خطأ", "عبي المعلومة الكل قبل ما تكمل.");
      return;
    }
    Alert.alert("تمام", "دخلت بنجاح.");
    router.push("/screens/DashboardScreen");
  };

  return (
    <View style={styles.container}>
      {/* لوجو وعناوين */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <MaterialIcons name="water-drop" size={40} color="#3b82f6" />
        </View>
        <Text style={styles.title}>مرحبا بيك من جديد</Text>
        <Text style={styles.subtitle}>سجّل دخولك لحسابك</Text>
      </View>

      {/* فورم */}
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الإيميل</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="mail"
              size={22}
              color="#9ca3af"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="example@gmail.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              textAlign={I18nManager.isRTL ? "right" : "left"}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>كلمة السر</Text>
            <TouchableOpacity>
              <Text style={styles.forgot}>نسيتها؟</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="lock"
              size={22}
              color="#9ca3af"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              textAlign={I18nManager.isRTL ? "right" : "left"}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityLabel="اظهر/خبي كلمة السر"
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={22}
                color="#9ca3af"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>تسجيل الدخول</Text>
        </TouchableOpacity>
      </View>

      {/* فاصل */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>ولا</Text>
        <View style={styles.divider} />
      </View>

      {/* Google و Apple */}
      <View style={styles.socialContainer}>
        <TouchableOpacity style={styles.socialButton}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
            }}
            style={styles.socialIcon}
          />
          <Text style={styles.socialText}>كمّل بجوجل</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/179/179309.png",
            }}
            style={styles.socialIcon}
          />
          <Text style={styles.socialText}>كمّل بأبل</Text>
        </TouchableOpacity>
      </View>

      {/* رابط تسجيل */}
      <Text style={styles.footerText}>
        ما عندكش حساب؟{" "}
        <Text
          style={styles.link}
          onPress={() => router.push("/screens/RegisterScreen")}
        >
          سجّل توا
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoBox: {
    backgroundColor: "rgba(59,130,246,0.1)",
    padding: 16,
    borderRadius: 50,
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
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  forgot: {
    fontSize: 14,
    color: "#3b82f6",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 45,
    color: "#111827",
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#9ca3af",
    fontSize: 13,
  },
  socialContainer: {
    flexDirection: "column",
    width: "100%",
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  socialText: {
    fontSize: 14,
    color: "#374151",
  },
  footerText: {
    marginTop: 25,
    fontSize: 14,
    color: "#6b7280",
  },
  link: {
    color: "#3b82f6",
    fontWeight: "600",
  },
});



