import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";

export default function HomeScreen({ route }) {
  // Retrieve the username passed from Login
  const { username } = route.params;

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            {/* Left Side */}
            <Text style={styles.logoText}>HealthMate</Text>

            {/* Right Bottom Side */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Hello</Text>
              <Text style={styles.usernameText}>{username}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Placeholder Content */}
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Welcome to your Dashboard</Text>
        <Text style={styles.subText}>
          Medical records and appointments will appear here.
        </Text>
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0, // Handle Notch/Statusbar
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 25,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    height: 150, // Fixed height to allow "bottom right" positioning
    justifyContent: "center",
  },
  headerContent: {
    height: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15, // Push text slightly up from the very bottom edge
    alignItems: "flex-end", // Aligns content to the bottom of the header
  },
  logoText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5, // Slight adjustment
  },
  welcomeContainer: {
    alignItems: "flex-end",
  },
  welcomeText: {
    color: "#E0E0E0",
    fontSize: 14,
  },
  usernameText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
