import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
// 1. Remove SafeAreaView from the import above and add this:
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import UserQRCode from "./UserQRCode";

// ... existing imports
// Keep existing imports and UserQRCode import

export default function HomeScreen({ route, navigation }) {
  // <-- ADD navigation prop
  const { username, userId } = route.params;

  return (
    <View style={styles.container}>
      {/* ... Header Code Remains the Same ... */}
      <View style={styles.header}>
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={styles.headerContent}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="medical"
                size={28}
                color="#fff"
                style={{ marginRight: 8, marginBottom: 5 }}
              />
              <Text style={styles.logoText}>HealthMate</Text>
            </View>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Hello</Text>
              <Text style={styles.usernameText}>{username}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* NEW CONTENT AREA */}
      <View style={styles.content}>
        {/* 1. Show QR Code Component */}
        <UserQRCode userId={userId} />

        {/* 2. Navigation Buttons */}
        <View style={styles.menuContainer}>
          {/* Button 1: Realtime Data */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              navigation.navigate("RealtimeData", { username, userId })
            }
          >
            <Text style={styles.menuText}>Show Realtime Data</Text>
            <Ionicons name="chevron-forward" size={24} color="#0056D2" />
          </TouchableOpacity>

          {/* Button 2: Medical Records (Active) */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              navigation.navigate("MedicalRecords", { username, userId })
            }
          >
            <Text style={styles.menuText}>Show Medical Records</Text>
            <Ionicons name="chevron-forward" size={24} color="#0056D2" />
          </TouchableOpacity>

          {/* Button 3: Past Alerts */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              navigation.navigate("PastAlerts", { userId: userId })
            }
          >
            <Text style={styles.menuText}>My Alerts</Text>
            <Ionicons name="chevron-forward" size={24} color="#0056D2" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF",
  },
  header: {
    backgroundColor: "#0056D2",
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 25,
    elevation: 8,
    height: 150,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerContent: {
    height: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: "flex-end",
  },
  logoText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  welcomeContainer: { alignItems: "flex-end" },
  welcomeText: { color: "#E0E0E0", fontSize: 14 },
  usernameText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  // Updated Content Area
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  // New Menu Styles
  menuContainer: {
    width: "100%",
    marginTop: 20,
  },
  menuButton: {
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  infoText: {
    marginTop: 20,
    color: "#666",
    textAlign: "center",
    fontSize: 14,
    maxWidth: "80%",
  },
});
