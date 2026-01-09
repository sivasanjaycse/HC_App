import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { CameraView, Camera } from "expo-camera"; // Updated for newer Expo versions

export default function LoginScreen({ navigation }) {
  // --- CONFIG ---
  const API_BASE = " https://calycine-flexile-sumiko.ngrok-free.dev"; // REPLACE X WITH YOUR IP

  // State
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // QR Scanner State
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  // Reset Password Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [resetId, setResetId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Camera Permission
  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };
    getCameraPermissions();
  }, []);

  // --- API FUNCTIONS ---

  const handleLogin = async () => {
    if (!userId || !password) {
      Alert.alert("Error", "Enter ID and Password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, password }),
      });
      const data = await res.json();
      if (data.success) {
        navigation.replace("Home", { username: data.name, userId: data.id });
      } else {
        Alert.alert("Failed", data.message);
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetId || !newPassword) return;
    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetId, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Password Updated");
        setModalVisible(false);
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    }
  };

  // --- QR LOGIC ---
  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setScanning(false);
    setLoading(true);

    // Assume QR data is just the ID (e.g., "1001")
    try {
      const res = await fetch(`${API_BASE}/login-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data }),
      });
      const result = await res.json();
      if (result.success) {
        navigation.replace("Home", {
          username: result.name,
          userId: result.id,
        });
      } else {
        Alert.alert("Invalid QR", "User ID from QR not found.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
    }
    setLoading(false);
  };

  // --- RENDER ---

  if (scanning) {
    if (hasPermission === null)
      return <Text>Requesting camera permission...</Text>;
    if (hasPermission === false) return <Text>No access to camera</Text>;
    return (
      <View style={styles.container}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setScanning(false);
            setScanned(false);
          }}
        >
          <Text style={styles.buttonText}>Cancel Scan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.appTitle}>HealthMate</Text>
        <Text style={styles.appSubtitle}>Patient Portal</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          placeholder="1001"
          keyboardType="numeric"
          value={userId}
          onChangeText={setUserId}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="******"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.qrBtn}
          onPress={() => {
            setScanned(false);
            setScanning(true);
          }}
        >
          <Text style={styles.qrText}>Scan QR Code (No Password)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Text style={styles.forgotText}>Forgot/Reset Password?</Text>
        </TouchableOpacity>
      </View>

      {/* RESET PASSWORD MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <TextInput
              style={styles.input}
              placeholder="User ID"
              keyboardType="numeric"
              value={resetId}
              onChangeText={setResetId}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#0056D2" }]}
                onPress={handleResetPassword}
              >
                <Text style={{ color: "white" }}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F9FF", justifyContent: "center" },
  logoContainer: { alignItems: "center", marginBottom: 40 },
  appTitle: { fontSize: 32, fontWeight: "bold", color: "#0056D2" },
  appSubtitle: { fontSize: 16, color: "#666" },
  form: { paddingHorizontal: 30 },
  label: { marginBottom: 5, color: "#333", fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  loginBtn: {
    backgroundColor: "#0056D2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  loginText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  qrBtn: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0056D2",
  },
  qrText: { color: "#0056D2", fontWeight: "bold" },
  forgotText: { textAlign: "center", marginTop: 20, color: "#666" },
  cancelButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "red",
    padding: 20,
    borderRadius: 10,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  modalBtn: {
    padding: 10,
    borderRadius: 5,
    width: "45%",
    alignItems: "center",
  },
});
