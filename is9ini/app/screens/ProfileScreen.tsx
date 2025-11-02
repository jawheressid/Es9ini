import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const [name, setName] = useState("مستخدم");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const router = useRouter();

  // 🔹 Charger le profil au montage
  useEffect(() => {
    const loadProfile = async () => {
      const storedName = await AsyncStorage.getItem("userName");
      const storedImage = await AsyncStorage.getItem("profileImage");
      if (storedName) setName(storedName);
      if (storedImage) setImageUri(storedImage);
    };
    loadProfile();
  }, []);

  // 🔹 Choisir une nouvelle image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
    }
  };

  // 🔹 Sauvegarder les modifications (nom + image)
  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem("userName", name);
      if (imageUri) {
        await AsyncStorage.setItem("profileImage", imageUri);
      }
      Alert.alert("تم", "تم حفظ التغييرات بنجاح");
    } catch (error) {
      Alert.alert("خطأ", "حدث مشكل أثناء الحفظ");
    }
  };

  // 🔹 Déconnexion
  const handleLogout = async () => {
    Alert.alert("تسجيل الخروج", "هل تريد الخروج من التطبيق؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "نعم",
        onPress: async () => {
          await AsyncStorage.removeItem("authToken");
          router.replace("/screens/HomeScreen");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 🖼️ صورة المستخدم */}
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={
            imageUri
              ? { uri: imageUri }
              : require("../../assets/mabrouka.png") // الصورة الافتراضية
          }
          style={styles.image}
        />
      </TouchableOpacity>

      {/* 📝 حقل الاسم */}
      <Text style={styles.label}>الاسم</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="أدخل اسمك"
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
        <Text style={styles.saveText}>💾 حفظ التغييرات</Text>
      </TouchableOpacity>


      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>
    </View>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#3b82f6",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  input: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    textAlign: "center",
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 20,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 16,
  },
});
