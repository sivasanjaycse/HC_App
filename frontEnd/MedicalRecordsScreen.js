import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
// 1. FIX: Import from safe-area-context
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

export default function MedicalRecordsScreen({ route, navigation }) {
  const { username, userId } = route.params;
  const API_BASE = "https://calycine-flexile-sumiko.ngrok-free.dev"; // CHECK YOUR URL

  const [records, setRecords] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRecord, setNewRecord] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_BASE}/medical-records/${userId}`);
      if (response.data.success) {
        setRecords(response.data.records);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveRecord = async () => {
    if (!newRecord.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/medical-records/add`, {
        id: userId,
        record: newRecord,
      });

      if (response.data.success) {
        setNewRecord("");
        setModalVisible(false);
        fetchRecords();
      } else {
        Alert.alert("Error", "Could not save record");
      }
    } catch (error) {
      Alert.alert("Error", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: DELETE FUNCTION ---
  const confirmDelete = (recordText) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to remove this record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(recordText),
        },
      ]
    );
  };

  const handleDelete = async (recordText) => {
    try {
      // Axios delete requests need 'data' key for body content
      const response = await axios.delete(
        `${API_BASE}/medical-records/delete`,
        {
          data: { id: userId, record: recordText },
        }
      );

      if (response.data.success) {
        fetchRecords(); // Refresh list
      } else {
        Alert.alert("Error", "Could not delete record");
      }
    } catch (error) {
      Alert.alert("Error", "Network Error during deletion");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* 2. FIX: Use Safe Area Edges */}
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text style={styles.logoText}> Medical Records</Text>
            </TouchableOpacity>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Patient</Text>
              <Text style={styles.usernameText}>{username}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.recordCard}>
            <View style={styles.blueBar} />

            {/* Record Text */}
            <Text style={styles.recordText}>{item.record}</Text>

            {/* Delete Button */}
            <TouchableOpacity
              onPress={() => confirmDelete(item.record)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No records found. Add one below.</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>New Medical Record</Text>

            <TextInput
              style={styles.bigInput}
              placeholder="Enter details (e.g., Fever 102°F, Prescribed Paracetamol)"
              multiline
              textAlignVertical="top"
              value={newRecord}
              onChangeText={setNewRecord}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={handleSaveRecord}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnTextSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // List Styles
  recordCard: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 15,
    padding: 20,
    flexDirection: "row",
    elevation: 2,
    alignItems: "center",
  },
  blueBar: {
    width: 5,
    height: "100%",
    backgroundColor: "#0056D2",
    marginRight: 15,
    borderRadius: 5,
  },
  recordText: { fontSize: 16, color: "#333", flex: 1, marginRight: 10 },
  deleteBtn: { padding: 5 }, // Touch area for delete
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
    fontSize: 16,
  },

  // FAB Styles
  fab: {
    position: "absolute",
    right: 25,
    bottom: 30,
    backgroundColor: "#0056D2",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  bigInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 15,
    height: 150,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  btn: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  btnCancel: { backgroundColor: "#ddd" },
  btnSave: { backgroundColor: "#0056D2" },
  btnTextCancel: { color: "#333", fontWeight: "bold" },
  btnTextSave: { color: "#fff", fontWeight: "bold" },
});
