import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

export default function RealtimeDataScreen({ route, navigation }) {
  // 1. Get the exact User ID from the Login response
  const { username, userId } = route.params;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Construct URL dynamically using that ID (e.g. patient1001)
  const DATA_URL = `https://healthcarebandtech-72c66-default-rtdb.firebaseio.com/patient${userId}/live.json`;

  useEffect(() => {
    fetchData(); // Run immediately

    // 3. Set up 3-second polling
    const intervalId = setInterval(() => {
      fetchData();
    }, 3000);

    // Cleanup when screen is closed
    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    try {
      // We use GET because we are READING data
      const response = await axios.get(DATA_URL);

      // If response.data is null, it means the node doesn't exist or device is off
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Polling Error:", error);
      // Optional: Handle network errors silently to keep trying
    }
  };

  const renderContent = () => {
    // Initial Load
    if (loading && data === null) {
      return (
        <ActivityIndicator
          size="large"
          color="#0056D2"
          style={{ marginTop: 50 }}
        />
      );
    }

    // 4. "Turn On Device" State (Data is null)
    if (!data) {
      return (
        <View style={styles.offContainer}>
          <Ionicons name="power" size={80} color="#ccc" />
          <Text style={styles.offText}>Turn on the device</Text>
          <Text style={styles.offSubText}>
            Waiting for live stream from ID: {userId}...
          </Text>
        </View>
      );
    }

    // 5. Live Data State (Data exists)
    return (
      <View style={styles.grid}>
        {/* BPM Card */}
        <View style={[styles.card, { borderLeftColor: "#FF3B30" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart" size={30} color="#FF3B30" />
            <Text style={styles.cardLabel}>Heart Rate</Text>
          </View>
          <Text style={styles.cardValue}>
            {data.bpm} <Text style={styles.unit}>BPM</Text>
          </Text>
        </View>

        {/* SpO2 Card */}
        <View style={[styles.card, { borderLeftColor: "#0056D2" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="water" size={30} color="#0056D2" />
            <Text style={styles.cardLabel}>SpO2</Text>
          </View>
          <Text style={styles.cardValue}>
            {data.spo2} <Text style={styles.unit}>%</Text>
          </Text>
        </View>

        {/* Temperature Card */}
        <View style={[styles.card, { borderLeftColor: "#FF9500" }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="thermometer" size={30} color="#FF9500" />
            <Text style={styles.cardLabel}>Temperature</Text>
          </View>
          <Text style={styles.cardValue}>
            {data.temp} <Text style={styles.unit}>°C</Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text style={styles.logoText}> Realtime Vitals</Text>
            </TouchableOpacity>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Monitoring</Text>
              <Text style={styles.usernameText}>{username}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Content */}
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F9FF" },
  header: {
    backgroundColor: "#0056D2",
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 25,
    elevation: 8,
    height: 120,
    justifyContent: "center",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
    alignItems: "center",
  },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "bold", marginLeft: 10 },
  welcomeContainer: { alignItems: "flex-end" },
  welcomeText: { color: "#E0E0E0", fontSize: 12 },
  usernameText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  content: { flex: 1, padding: 20 },

  // OFF STATE
  offContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  offText: { fontSize: 24, fontWeight: "bold", color: "#666", marginTop: 20 },
  offSubText: { fontSize: 16, color: "#999", marginTop: 10 },

  // DATA CARDS
  grid: { gap: 20 },
  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    borderLeftWidth: 8, // Colored strip on the left
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 15 },
  cardLabel: { fontSize: 18, color: "#555", fontWeight: "600" },
  cardValue: { fontSize: 32, fontWeight: "bold", color: "#333" },
  unit: { fontSize: 16, color: "#999", fontWeight: "normal" },
});
