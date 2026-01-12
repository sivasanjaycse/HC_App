import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview"; // <--- NEW IMPORT
import { Ionicons } from "@expo/vector-icons"; // Ensure you have this, standard in Expo
import axios from "axios";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

const { width, height } = Dimensions.get("window");
const API_BASE = "https://calycine-flexile-sumiko.ngrok-free.dev"; // CHECK YOUR URL

// Notification Handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen({ route }) {
  const {
    id: hospitalId,
    inchargeName,
    hospitalName,
  } = route.params || {
    id: 2001,
    inchargeName: "Doc",
    hospitalName: "General",
  };

  const [liveAlerts, setLiveAlerts] = useState([]);
  const [servedAlerts, setServedAlerts] = useState([]);
  const [confirmingId, setConfirmingId] = useState(null);

  // --- MAP STATE ---
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) updateTokenInDb(token);
    });

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateTokenInDb = async (token) => {
    try {
      await axios.post(`${API_BASE}/hospital/push-token`, {
        id: hospitalId,
        token,
      });
    } catch (e) {
      console.log("Token update failed", e);
    }
  };

  const fetchData = async () => {
    try {
      const liveRes = await axios.get(
        `${API_BASE}/hospital/live-alerts/${hospitalId}`
      );
      if (liveRes.data.success) setLiveAlerts(liveRes.data.data);

      const servedRes = await axios.get(
        `${API_BASE}/hospital/served-alerts/${hospitalId}`
      );
      if (servedRes.data.success) setServedAlerts(servedRes.data.data);
    } catch (e) {
      console.log("Fetch error", e);
    }
  };

  // --- ACTION HANDLERS ---
  const handleServePress = (id) => {
    setConfirmingId(id);
    setTimeout(() => setConfirmingId(null), 3000);
  };

  const handleConfirmServe = async (assignmentId) => {
    try {
      const res = await axios.post(`${API_BASE}/hospital/serve`, {
        assignment_id: assignmentId,
        hospital_id: hospitalId,
      });
      if (res.data.success) {
        setConfirmingId(null);
        fetchData();
      }
    } catch (e) {
      Alert.alert("Error", "Could not complete action");
    }
  };

  // --- MAP HANDLERS ---
  const openInternalMap = (lat, lon) => {
    setSelectedLocation({ lat, lon });
    setMapVisible(true);
  };

  const openGoogleMapsApp = (lat, lon) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}`,
    });
    Linking.openURL(url);
  };

  // --- HTML FOR LEAFLET MAP ---
  const getMapHtml = (lat, lon) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>body { margin: 0; } #map { height: 100vh; width: 100vw; }</style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([${lat}, ${lon}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            L.marker([${lat}, ${lon}]).addTo(map).bindPopup('<b>Patient Location</b>').openPopup();
          </script>
        </body>
      </html>
  `;

  // --- RENDER ITEMS ---
  const renderLiveItem = ({ item }) => {
    const isConfirming = confirmingId === item.assignment_id;
    return (
      <View style={[styles.card, styles.liveCard]}>
        {/* Header: Alert Type */}
        <View style={styles.cardHeader}>
          <Ionicons name="warning" size={24} color="#D32F2F" />
          <Text style={styles.cardTitle}>
            {item.alert_type.replace("_", " ")} ALERT
          </Text>
        </View>

        {/* Body: Details */}
        <View style={styles.cardBody}>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Patient:</Text> {item.user_name}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Value:</Text> {item.alert_value}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.label}>Time:</Text> {item.alert_time}
          </Text>
        </View>

        {/* Action Row: Maps & Serve */}
        <View style={styles.actionRow}>
          <View style={styles.mapActions}>
            <TouchableOpacity
              onPress={() => openInternalMap(item.gps_lat, item.gps_lon)}
              style={styles.iconBtn}
            >
              <Ionicons name="map-outline" size={20} color="#0056D2" />
              <Text style={styles.iconBtnText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openGoogleMapsApp(item.gps_lat, item.gps_lon)}
              style={styles.iconBtn}
            >
              <Ionicons name="navigate-outline" size={20} color="#2E7D32" />
              <Text style={[styles.iconBtnText, { color: "#2E7D32" }]}>Go</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.serveBtn, isConfirming ? styles.confirmBtn : {}]}
            onPress={() =>
              isConfirming
                ? handleConfirmServe(item.assignment_id)
                : handleServePress(item.assignment_id)
            }
          >
            <Text style={styles.serveBtnText}>
              {isConfirming ? "CONFIRM?" : "SERVE PATIENT"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderServedItem = ({ item }) => (
    <View style={[styles.card, styles.servedCard]}>
      <View style={styles.cardHeader}>
        <Ionicons name="checkmark-circle" size={24} color="#2E7D32" />
        <Text style={[styles.cardTitle, { color: "#2E7D32" }]}>SERVED</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Patient:</Text> {item.user_name}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Reason:</Text> {item.alert_type}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.label}>Time:</Text> {item.alert_time}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView
          edges={["top", "left", "right"]}
          style={styles.headerContent}
        >
          <Text style={styles.appName}>HospiEnd Dispatch</Text>
          <View>
            <Text style={styles.welcomeLabel}>On Duty</Text>
            <Text style={styles.inchargeName}>{inchargeName}</Text>
          </View>
        </SafeAreaView>
      </View>

      <FlatList
        data={liveAlerts}
        renderItem={renderLiveItem}
        keyExtractor={(item) => item.assignment_id.toString()}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}> Live Assignments</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No pending emergencies.</Text>
        }
        contentContainerStyle={{ padding: 20 }}
        ListFooterComponent={
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}> Served History</Text>
            <FlatList
              data={servedAlerts}
              renderItem={renderServedItem}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <Text style={styles.emptyText}>History is empty.</Text>
              }
            />
          </>
        }
      />

      {/* MAP MODAL */}
      <Modal
        visible={mapVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.mapWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Location</Text>
              <TouchableOpacity onPress={() => setMapVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedLocation && (
              <WebView
                originWhitelist={["*"]}
                source={{
                  html: getMapHtml(selectedLocation.lat, selectedLocation.lon),
                }}
                style={styles.map}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- PUSH LOGIC ---
async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  if (!Device.isDevice) return null;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== "granted") return null;
  }
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    backgroundColor: "#B71C1C",
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 10,
  },
  appName: { fontSize: 20, fontWeight: "bold", color: "white" },
  welcomeLabel: { color: "#FFEBEE", fontSize: 12, textAlign: "right" },
  inchargeName: { color: "white", fontSize: 16, fontWeight: "bold" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    marginTop: 10,
  },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 20 },
  emptyText: {
    fontStyle: "italic",
    color: "#999",
    marginBottom: 10,
    textAlign: "center",
  },

  // CARD STYLES
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  liveCard: { borderLeftWidth: 5, borderLeftColor: "#D32F2F" },
  servedCard: { borderLeftWidth: 5, borderLeftColor: "#2E7D32", opacity: 0.8 },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#D32F2F",
    marginLeft: 8,
  },

  cardBody: { padding: 15 },
  infoText: { fontSize: 15, color: "#444", marginBottom: 4 },
  label: { fontWeight: "bold", color: "#333" },

  // ACTION ROW
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  mapActions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
  },
  iconBtnText: {
    marginLeft: 5,
    fontWeight: "bold",
    color: "#0056D2",
    fontSize: 12,
  },

  serveBtn: {
    backgroundColor: "#D32F2F",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmBtn: { backgroundColor: "#F57C00" },
  serveBtnText: { color: "white", fontWeight: "bold", fontSize: 12 },

  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapWrapper: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: "white",
    borderRadius: 15,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontWeight: "bold", fontSize: 16 },
  map: { flex: 1 },
});
