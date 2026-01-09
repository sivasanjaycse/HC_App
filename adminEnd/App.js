import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export default function App() {
  // State for form fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // --- CONFIGURATION ---
  // REPLACE THIS with your computer's local IP address (e.g., 192.168.1.5)
  // Do not use 'localhost' for physical Android/iOS devices
  const API_URL =
    "https://calycine-flexile-sumiko.ngrok-free.dev/admin/add-user";

  const handleAddUser = async () => {
    if (!name || !age || !password) {
      Alert.alert("Error", "Please fill in at least Name, Age, and Password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          age: parseInt(age),
          address,
          gender,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // SUCCESS: Show the Auto-Generated ID
        Alert.alert(
          "Success!",
          `User Added Successfully.\n\nGENERATED ID: ${data.userId}`,
          [{ text: "OK", onPress: () => clearForm() }]
        );
      } else {
        Alert.alert("Error", data.error || "Failed to add user");
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Network Error",
        "Could not connect to backend. Check IP address."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setName("");
    setAge("");
    setAddress("");
    setGender("");
    setPassword("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HealthMate Admin</Text>
        <Text style={styles.headerSubtitle}>Add New User</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Gender</Text>
            <TextInput
              style={styles.input}
              placeholder="M / F"
              value={gender}
              onChangeText={setGender}
            />
          </View>
        </View>

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter full address"
          multiline
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>Assign Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleAddUser}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>CREATE USER</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF", // Very light blue background
  },
  header: {
    backgroundColor: "#0056D2", // Main Blue
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    elevation: 5,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#E1F0FF",
    fontSize: 16,
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#0056D2",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
