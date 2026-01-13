import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { WebView } from "react-native-webview";

const { width, height } = Dimensions.get("window");

export default function PastAlertsScreen({ route, navigation }) {
  const { userId } = route.params;
  const API_BASE = "https://hc-server-96w6.onrender.com"; // CHECK YOUR URL

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MAP STATE ---
  const [mapVisible, setMapVisible] = useState(false);
  const [mapData, setMapData] = useState(null); // { pLat, pLon, hLat, hLon }

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/alerts/${userId}`);
      if (response.data.success) {
        setAlerts(response.data.data);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const openMap = (item) => {
    // Only open map if valid patient coordinates exist
    const pLat = parseFloat(item.gps_lat);
    const pLon = parseFloat(item.gps_lon);

    if (!isNaN(pLat) && !isNaN(pLon)) {
      setMapData({
        pLat: pLat,
        pLon: pLon,
        hLat: item.hosp_lat ? parseFloat(item.hosp_lat) : null,
        hLon: item.hosp_lon ? parseFloat(item.hosp_lon) : null,
      });
      setMapVisible(true);
    } else {
      alert("Invalid GPS data for this alert");
    }
  };

  // --- ADVANCED MAP HTML (Leaflet) ---
  const getMapHtml = (data) => {
    if (!data) return "";
    const { pLat, pLon, hLat, hLon } = data;

    let scriptContent = `
        var map = L.map('map').setView([${pLat}, ${pLon}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 1. Patient Marker (Red)
        var patientIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#D32F2F;width:15px;height:15px;border-radius:50%;border:2px solid white;'></div>",
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        // UPDATED LABEL HERE
        L.marker([${pLat}, ${pLon}], {icon: patientIcon}).addTo(map)
            .bindPopup('<b>Patient Location</b>').openPopup();
    `;

    // 2. Hospital Marker (Blue) - Only if exists
    if (hLat && hLon) {
      scriptContent += `
            var hospitalIcon = L.divIcon({
                className: 'custom-div-icon',
                html: "<div style='background-color:#1976D2;width:15px;height:15px;border-radius:50%;border:2px solid white;'></div>",
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            // UPDATED LABEL HERE
            L.marker([${hLat}, ${hLon}], {icon: hospitalIcon}).addTo(map)
                .bindPopup('<b>Hospital Location</b>');

            // Draw Line
            var latlngs = [
                [${pLat}, ${pLon}],
                [${hLat}, ${hLon}]
            ];
            var polyline = L.polyline(latlngs, {color: 'blue', dashArray: '5, 10'}).addTo(map);
            map.fitBounds(polyline.getBounds(), {padding: [50, 50]});
        `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style> body { margin: 0; } #map { height: 100vh; width: 100vw; } </style>
        </head>
        <body>
          <div id="map"></div>
          <script>${scriptContent}</script>
        </body>
      </html>
    `;
  };

  const renderAlertItem = ({ item }) => {
    // 1. Safety Check: If alert_type is missing, give it a default string
    const typeStr = item.alert_type || "UNKNOWN_TYPE";

    // 2. Safety Check: If status is missing, default to 'Pending'
    const statusStr = item.status || "Pending";

    const isCritical = typeStr.includes("LOW") || typeStr.includes("HIGH");
    const iconName = typeStr.includes("TEMP") ? "thermometer" : "heart";
    const alertColor = isCritical ? "#D32F2F" : "#F57C00";

    // Status Logic
    const isServed = statusStr === "Served";
    const isAssigned = statusStr === "Assigned";
    const statusColor = isServed ? "#2E7D32" : isAssigned ? "#F57C00" : "#999";

    return (
      <View style={[styles.card, { borderLeftColor: alertColor }]}>
        {/* Header: Type & Status */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Ionicons name={iconName} size={24} color={alertColor} />
            <Text style={styles.alertTitle}>{typeStr.replace("_", " ")}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusStr.toUpperCase()}</Text>
          </View>
        </View>

        {/* Value & Time */}
        <View style={styles.infoRow}>
          <Text style={styles.alertValue}>{item.alert_value}</Text>
          <Text style={styles.timestamp}>
            <Ionicons name="time-outline" size={14} color="#666" />{" "}
            {item.alert_time}
          </Text>
        </View>

        {/* Hospital Info */}
        {(isServed || isAssigned) && item.hospital_name && (
          <View style={styles.hospitalContainer}>
            <Ionicons name="medical" size={16} color="#0056D2" />
            <Text style={styles.hospitalText}>
              Handled by:{" "}
              <Text style={{ fontWeight: "bold" }}>{item.hospital_name}</Text>
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Footer: Map Button */}
        <View style={styles.footerRow}>
          <Text style={styles.message}>
            Open map to view the location of Patient and Hospital
          </Text>

          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => openMap(item)}
          >
            <Ionicons name="location" size={16} color="white" />
            {/* <Text style={styles.mapButtonText}>View Map</Text> */}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alerts History</Text>
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0056D2"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) =>
            item.id ? item.id.toString() : Math.random().toString()
          }
          renderItem={renderAlertItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No past alerts found.</Text>
          }
        />
      )}

      {/* MAP MODAL */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={mapVisible}
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Incident Map</Text>
            <TouchableOpacity onPress={() => setMapVisible(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {mapData && (
            <WebView
              originWhitelist={["*"]}
              source={{ html: getMapHtml(mapData) }}
              style={{ flex: 1 }}
            />
          )}

          {/* Directions Button */}
          {mapData && mapData.hLat && (
            <TouchableOpacity
              style={styles.directionsBtn}
              onPress={() => {
                const url = `http://maps.google.com/maps?saddr=${mapData.pLat},${mapData.pLon}&daddr=${mapData.hLat},${mapData.hLon}`;
                Linking.openURL(url);
              }}
            >
              <Text style={styles.directionsText}>
                Open Route in Google Maps
              </Text>
              <Ionicons
                name="navigate"
                size={18}
                color="white"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", marginLeft: 15 },
  listContent: { padding: 20 },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    borderLeftWidth: 5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: { flexDirection: "row", alignItems: "center" },
  alertTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#333",
  },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  statusText: { color: "white", fontSize: 10, fontWeight: "bold" },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  alertValue: { fontSize: 22, fontWeight: "bold", color: "#333" },
  timestamp: { fontSize: 13, color: "#666" },

  hospitalContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  hospitalText: { fontSize: 13, color: "#0056D2", marginLeft: 6 },

  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  message: { fontSize: 11, color: "#888", fontStyle: "italic" },
  mapButton: {
    flexDirection: "row",
    backgroundColor: "#0056D2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
  },
  mapButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  emptyText: { textAlign: "center", marginTop: 50, color: "#999" },

  // MODAL
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontWeight: "bold", fontSize: 18 },

  directionsBtn: {
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  directionsText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
