import React, { useState, useEffect, useRef } from "react";
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
  Dimensions,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

// --- NEW IMPORTS FOR NOTIFICATIONS ---
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure how notifications should be handled when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }) {
  const API_BASE = "https://calycine-flexile-sumiko.ngrok-free.dev"; // CHECK YOUR URL

  // State
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // QR Scanner State
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Reset Password Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [resetId, setResetId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };
    getCameraPermissions();
  }, []);

  // --- NEW FUNCTION: REGISTER FOR PUSH NOTIFICATIONS ---
  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('critical_alerts', { // NEW CHANNEL ID
        name: 'Critical Health Alerts',
        importance: Notifications.AndroidImportance.MAX, // Pops up over apps
        vibrationPattern: [0, 250, 250, 250, 500, 500, 500], // Aggressive vibration (SOS style)
        lightColor: '#FF0000', // Red light
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show on lock screen
        sound: 'default', // Uses system default notification sound
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        // User refused permissions
        return null;
      }

      // Get the token
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId, 
      });
      
      return tokenData.data;
    } else {
      Alert.alert('Notice', 'Must use physical device for Push Notifications');
      return null;
    }
  };

  // --- API FUNCTIONS ---

  const handleLogin = async () => {
    if (!userId || !password) {
      Alert.alert("Error", "Enter ID and Password");
      return;
    }
    setLoading(true);

    try {
      // 1. Perform Login
      const response = await axios.post(`${API_BASE}/login`, {
        id: userId,
        password: password,
      });

      if (response.data.success) {
        
        // 2. SUCCESS! Now register Push Token silently
        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                console.log("Push Token Generated:", token);
                // Send to Backend
                await axios.post(`${API_BASE}/users/push-token`, {
                    id: response.data.id,
                    token: token
                });
            }
        } catch (tokenError) {
            console.log("Token Registration Failed (Non-fatal):", tokenError);
            // We do NOT stop login if this fails, just log it
        }

        // 3. Navigate to Home
        navigation.replace("Home", {
          username: response.data.name,
          userId: response.data.id,
        });

      } else {
        Alert.alert("Login Failed", response.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Could not connect to server";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetId || !newPassword) return;
    try {
      const response = await axios.put(`${API_BASE}/reset-password`, {
        id: resetId,
        newPassword: newPassword,
      });

      if (response.data.success) {
        Alert.alert("Success", "Password Updated");
        setModalVisible(false);
        setNewPassword("");
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Network error";
      Alert.alert("Error", errorMessage);
    }
  };

  // --- QR LOGIC ---
  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    // CASE 1: RESET PASSWORD
    if (isResetMode) {
      setScanning(false);
      setResetId(data);
      setIsResetMode(false);
      setTimeout(() => {
        Alert.alert("ID Scanned", `User ID: ${data} detected. Enter new password.`);
        setModalVisible(true);
      }, 500);
      return;
    }

    // CASE 2: LOGIN
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/login-qr`, {
        id: data,
      });

      if (response.data.success) {
        
        // REGISTER TOKEN ON QR LOGIN TOO
        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                await axios.post(`${API_BASE}/users/push-token`, {
                    id: response.data.id,
                    token: token
                });
            }
        } catch (e) { console.log("QR Token Error", e); }

        setScanning(false);
        navigation.replace("Home", {
          username: response.data.name,
          userId: response.data.id,
        });
      } else {
        Alert.alert("Invalid QR", "User ID not found.");
        setScanning(false);
      }
    } catch (err) {
      Alert.alert("Error", "Network error");
      setScanning(false);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  if (scanning) {
    if (hasPermission === null) return <Text style={styles.centerText}>Requesting permission...</Text>;
    if (hasPermission === false) return <Text style={styles.centerText}>No access to camera</Text>;
    
    return (
      <View style={styles.container}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.overlay}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.middleContainer}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.focusedContainer}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <View style={styles.unfocusedContainer}></View>
            </View>
            <View style={styles.unfocusedContainer}>
                <Text style={styles.scanInstruction}>
                    {isResetMode ? "Scan QR to Reset Password" : "Align QR Code within the frame"}
                </Text>
            </View>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setScanning(false);
            setScanned(false);
            setIsResetMode(false);
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
        <View style={styles.iconCircle}>
          <Ionicons name="medical" size={60} color="#0056D2" />
        </View>
        <Text style={styles.appTitle}>HealthMate</Text>
        <Text style={styles.appSubtitle}>Patient Portal</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>User ID</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="1001"
            keyboardType="numeric"
            value={userId}
            onChangeText={setUserId}
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="******"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

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
            setIsResetMode(false);
            setScanned(false);
            setScanning(true);
          }}
        >
          <Ionicons name="qr-code-outline" size={20} color="#0056D2" style={{ marginRight: 10 }} />
          <Text style={styles.qrText}>Scan QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
            setIsResetMode(true);
            setScanned(false);
            setScanning(true);
        }}>
          <Text style={styles.forgotText}>Forgot/Reset Password?</Text>
        </TouchableOpacity>
      </View>

      {/* RESET PASSWORD MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <View style={[styles.inputContainer, { borderWidth: 1, borderColor: "#ddd", backgroundColor: '#f0f0f0' }]}>
              <Ionicons name="id-card-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: '#666' }]}
                placeholder="User ID"
                value={resetId}
                editable={false}
              />
            </View>
            <View style={[styles.inputContainer, { borderWidth: 1, borderColor: "#ddd" }]}>
              <Ionicons name="key-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
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

const overlayColor = "rgba(0,0,0,0.5)";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F9FF", justifyContent: "center" },
  centerText: { marginTop: 50, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  unfocusedContainer: { flex: 1, backgroundColor: overlayColor, justifyContent: 'center', alignItems: 'center' },
  middleContainer: { flexDirection: 'row', height: 250 },
  focusedContainer: { width: 250, borderColor: 'transparent' },
  scanInstruction: { color: 'white', fontSize: 16, marginBottom: 100, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5, overflow: 'hidden' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#0056D2', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  logoContainer: { alignItems: "center", marginBottom: 30 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#E1F0FF", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  appTitle: { fontSize: 32, fontWeight: "bold", color: "#0056D2" },
  appSubtitle: { fontSize: 16, color: "#666" },
  form: { paddingHorizontal: 30 },
  label: { marginBottom: 5, color: "#333", fontWeight: "600" },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 10 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16 },
  loginBtn: { backgroundColor: "#0056D2", padding: 15, borderRadius: 10, alignItems: "center", marginBottom: 10, marginTop: 10 },
  loginText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  qrBtn: { backgroundColor: "#fff", padding: 15, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#0056D2", flexDirection: "row", justifyContent: "center" },
  qrText: { color: "#0056D2", fontWeight: "bold" },
  forgotText: { textAlign: "center", marginTop: 20, color: "#666" },
  cancelButton: { position: "absolute", bottom: 50, alignSelf: "center", backgroundColor: "red", padding: 20, borderRadius: 10 },
  buttonText: { color: "white", fontWeight: "bold" },
  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalView: { margin: 20, backgroundColor: "white", borderRadius: 20, padding: 35, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  modalBtn: { padding: 10, borderRadius: 5, width: "45%", alignItems: "center" },
});