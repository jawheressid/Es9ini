import React, { useState } from "react";
import { View, Text, StyleSheet, Button, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";

export default function IrrigationPlanner() {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [duration, setDuration] = useState(15); // durée en minutes
  const [scheduled, setScheduled] = useState(false);

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDate(selectedDate);
  };

  const scheduleIrrigation = () => {
    setScheduled(true);
    // 👉 Ici tu pourrais envoyer la planification à ton backend ou une base de données
    console.log("✅ Arrosage planifié :", {
      date: date.toLocaleString(),
      duration: duration + " minutes",
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🕒 Planifier un arrosage</Text>

      <View style={styles.box}>
        <MaterialIcons name="schedule" size={24} color="#2563eb" />
        <Text style={styles.label}>Heure d’arrosage :</Text>
        <Button title="Choisir une heure" onPress={() => setShowDatePicker(true)} />
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          display="default"
          onChange={handleDateChange}
        />
      )}

      <View style={styles.box}>
        <MaterialIcons name="timer" size={24} color="#2563eb" />
        <Text style={styles.label}>Durée (minutes) :</Text>
        <View style={styles.durationButtons}>
          {[10, 15, 20, 30].map((min) => (
            <Button key={min} title={`${min}`} onPress={() => setDuration(min)} />
          ))}
        </View>
      </View>

      <Button title="Planifier l’arrosage" color="#3b82f6" onPress={scheduleIrrigation} />

      {scheduled && (
        <View style={styles.result}>
          <Text style={styles.resultText}>
            🌱 Arrosage prévu à {date.toLocaleTimeString()} pour {duration} minutes.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 30,
  },
  box: {
    marginBottom: 20,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    color: "#475569",
    marginVertical: 10,
  },
  durationButtons: {
    flexDirection: "row",
    gap: 8,
  },
  result: {
    marginTop: 30,
    backgroundColor: "#dcfce7",
    padding: 15,
    borderRadius: 10,
  },
  resultText: {
    color: "#166534",
    fontWeight: "600",
  },
});
