import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#F0F5FA" }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
