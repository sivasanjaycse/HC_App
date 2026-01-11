import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  Modal,
  Dimensions,
  Linking // Added for "Get Directions" feature
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { WebView } from 'react-native-webview'; // <--- NEW IMPORT

const { width, height } = Dimensions.get('window');

export default function PastAlertsScreen({ route, navigation }) {
  const { userId } = route.params; 
  const API_BASE = "https://calycine-flexile-sumiko.ngrok-free.dev"; 

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MAP STATE ---
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

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

  const openMap = (lat, lon) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (!isNaN(latitude) && !isNaN(longitude)) {
      setSelectedLocation({ lat: latitude, lon: longitude });
      setMapVisible(true);
    } else {
        alert("Invalid GPS data");
    }
  };

  // --- THIS GENERATES THE FREE MAP HTML ---
  const getMapHtml = (lat, lon) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100vw; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            // Initialize Leaflet Map
            var map = L.map('map').setView([${lat}, ${lon}], 15);

            // Use OpenStreetMap Tiles (Completely Free)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add a Marker
            L.marker([${lat}, ${lon}]).addTo(map)
              .bindPopup('<b>Alert Location</b><br>Patient was here.')
              .openPopup();
          </script>
        </body>
      </html>
    `;
  };

  const renderAlertItem = ({ item }) => {
    const typeStr = item.alert_type || "UNKNOWN";
    const isCritical = typeStr.includes("LOW") || typeStr.includes("HIGH");
    const iconName = typeStr.includes("TEMP") ? "thermometer" : "heart";
    const alertColor = isCritical ? "#FF4444" : "#FFBB33"; 

    return (
      <View style={[styles.card, { borderLeftColor: alertColor }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Ionicons name={iconName} size={24} color={alertColor} />
            <Text style={styles.alertTitle}>
              {typeStr.replace('_', ' ')}
            </Text>
          </View>
          <Text style={styles.alertValue}>{item.alert_value}</Text>
        </View>
        
        <Text style={styles.timestamp}>
          <Ionicons name="time-outline" size={14} color="#666" /> {item.alert_time}
        </Text>
        
        <View style={styles.divider} />
        
        <View style={styles.footerRow}>
            <Text style={styles.message}>
            Lat: {item.gps_lat}, Lon: {item.gps_lon}
            </Text>
            
            <TouchableOpacity 
                style={styles.mapButton} 
                onPress={() => openMap(item.gps_lat, item.gps_lon)}
            >
                <Ionicons name="map" size={16} color="white" />
                <Text style={styles.mapButtonText}>View</Text>
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
        <Text style={styles.headerTitle}>Past Alerts History</Text>
        <View style={{ width: 24 }} /> 
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#0056D2" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
          renderItem={renderAlertItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No past alerts found.</Text>
          }
        />
      )}

      {/* MAP MODAL WITH WEBVIEW */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mapVisible}
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={styles.mapWrapper}>
                
                {/* Header inside Modal */}
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Alert Location</Text>
                    <TouchableOpacity onPress={() => setMapVisible(false)}>
                        <Ionicons name="close" size={28} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* THE MAP */}
                {selectedLocation && (
                    <WebView
                        originWhitelist={['*']}
                        source={{ html: getMapHtml(selectedLocation.lat, selectedLocation.lon) }}
                        style={styles.map}
                    />
                )}

                {/* Extra: Button to open in Real Google Maps for Directions */}
                <TouchableOpacity 
                    style={styles.directionsButton}
                    onPress={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lon}`;
                        Linking.openURL(url);
                    }}
                >
                    <Text style={styles.directionsText}>Open in Google Maps App</Text>
                    <Ionicons name="open-outline" size={16} color="white" style={{marginLeft:5}} />
                </TouchableOpacity>

            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    backgroundColor: '#fff',
    elevation: 2 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 15, flex: 1 },
  listContent: { padding: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    borderLeftWidth: 5, 
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  alertTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 10, color: '#333' },
  alertValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  timestamp: { fontSize: 14, color: '#666', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { fontSize: 12, color: '#888', fontStyle: 'italic', flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  
  mapButton: {
      flexDirection: 'row',
      backgroundColor: '#0056D2',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      alignItems: 'center',
  },
  mapButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  mapWrapper: { width: width * 0.9, height: height * 0.7, backgroundColor: 'white', borderRadius: 15, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontWeight: 'bold', fontSize: 16 },
  map: { flex: 1 },
  directionsButton: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15 },
  directionsText: { color: 'white', fontWeight: 'bold' }
});