import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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

export default function AddZoneScreen() {
  const [zoneName, setZoneName] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const router = useRouter();

  // 📸 Sélection d'image
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

  // 💾 Sauvegarder la zone
  const saveZone = async () => {
    if (!zoneName.trim()) {
      Alert.alert("تنبيه", "أدخل اسم المنطقة أولاً");
      return;
    }

    try {
      const saved = await AsyncStorage.getItem("zones");
      const zones = saved ? JSON.parse(saved) : [];

      const newZone = {
        id: Date.now().toString(),
        name: zoneName,
        color: colorPalette[zones.length % colorPalette.length],
        image: imageUri,
        waterLevel: 80,
        lastUpdate: new Date().toISOString(),
        mode: "auto",
      };

      const updatedZones = [...zones, newZone];
      await AsyncStorage.setItem("zones", JSON.stringify(updatedZones));

      Alert.alert("✅ تم", "تمت إضافة المنطقة بنجاح");
      router.back();
    } catch (err) {
      console.log(err);
      Alert.alert("خطأ", "تعذر حفظ المنطقة الجديدة");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>إضافة منطقة جديدة</Text>

      <TextInput
        style={styles.input}
        placeholder="اسم المنطقة"
        placeholderTextColor="#94a3b8"
        value={zoneName}
        onChangeText={setZoneName}
      />

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>📸 اختر صورة للمنطقة</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={saveZone}>
        <Text style={styles.saveText}>💾 حفظ المنطقة</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelText}>رجوع</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    width: "90%",
    fontSize: 16,
    backgroundColor: "#f8fafc",
    textAlign: "center",
    marginBottom: 20,
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    width: "90%",
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  imagePlaceholder: {
    color: "#64748b",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    width: "90%",
    marginBottom: 10,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    width: "90%",
  },
  cancelText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 15,
  },
});
