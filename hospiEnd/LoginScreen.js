import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";

export default function LoginScreen({ navigation }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // REPLACE WITH YOUR ACTUAL NGROK URL
  const API_BASE = "https://calycine-flexile-sumiko.ngrok-free.dev";

  const handleLogin = async () => {
    if (!id || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/hospital/login`, {
        id,
        password,
      });

      if (response.data.success) {
        // --- UPDATED: NOW PASSING 'id' TO HOME SCREEN ---
        navigation.replace("Home", {
          id: response.data.id, // <--- THIS WAS ADDED
          inchargeName: response.data.incharge_name,
          hospitalName: response.data.hospital_name,
        });
      }
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Network Error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HospiEnd Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Hospital ID"
        keyboardType="numeric"
        value={id}
        onChangeText={setId}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.btn}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.linkText}>New Hospital? Register Here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#0056D2",
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  btn: {
    backgroundColor: "#0056D2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  linkText: { marginTop: 20, textAlign: "center", color: "#0056D2" },
});
