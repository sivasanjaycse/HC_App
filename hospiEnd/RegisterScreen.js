import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";

export default function RegisterScreen({ navigation }) {
  const API_BASE = "https://calycine-flexile-sumiko.ngrok-free.dev";

  const [form, setForm] = useState({
    hospital_name: "",
    incharge_name: "",
    address: "",
    contact_number: "",
    password: "",
  });
  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [mapVisible, setMapVisible] = useState(false);

  // Default region
  const [region, setRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 5,
    longitudeDelta: 5,
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let loc = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        setLocation(loc.coords);
      }
    })();
  }, []);

  const handleRegister = async () => {
    if (
      !form.hospital_name ||
      !form.incharge_name ||
      !form.password ||
      !location
    ) {
      Alert.alert("Error", "Please fill all fields and pick a location.");
      return;
    }

    try {
      const payload = {
        ...form,
        latitude: location.latitude,
        longitude: location.longitude,
      };
      const response = await axios.post(
        `${API_BASE}/hospital/register`,
        payload
      );

      if (response.data.success) {
        Alert.alert(
          "Success",
          `Registered! Your Hospital ID is: ${response.data.id}`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Registration Failed");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>Register Hospital</Text>

        <TextInput
          style={styles.input}
          placeholder="Hospital Name"
          onChangeText={(t) => setForm({ ...form, hospital_name: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Incharge Name"
          onChangeText={(t) => setForm({ ...form, incharge_name: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Address"
          onChangeText={(t) => setForm({ ...form, address: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Contact Number"
          keyboardType="phone-pad"
          onChangeText={(t) => setForm({ ...form, contact_number: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          onChangeText={(t) => setForm({ ...form, password: t })}
        />

        {/* Location Picker Button */}
        <TouchableOpacity
          style={styles.locationBtn}
          onPress={() => setMapVisible(true)}
        >
          <Text style={styles.btnText}>
            Pick Location
          </Text>
        </TouchableOpacity>
        {location && (
          <Text style={styles.locText}>
            Lat: {location.latitude.toFixed(4)}, Lng:{" "}
            {location.longitude.toFixed(4)}
          </Text>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister}>
          <Text style={styles.btnText}>SUBMIT & GET ID</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MAP MODAL */}
      <Modal visible={mapVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={region}
            onPress={(e) => setLocation(e.nativeEvent.coordinate)}
          >
            {location && (
              <Marker coordinate={location} title="Hospital Location" />
            )}
          </MapView>

          <View style={styles.mapFooter}>
            <Text style={{ textAlign: "center", marginBottom: 10 }}>
              Tap on map to set location
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => setMapVisible(false)}
            >
              <Text style={styles.btnText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 40,
    color: "#0056D2",
  },
  input: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  locationBtn: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: "#0056D2",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  confirmBtn: {
    backgroundColor: "#0056D2",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "bold" },
  locText: { textAlign: "center", marginTop: 5, color: "#666" },
  mapFooter: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
});
