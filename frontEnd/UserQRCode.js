import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

// --- THE FIX IS HERE ---
// We import from 'legacy' to keep using writeAsStringAsync
import * as FileSystem from "expo-file-system/legacy";

import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";

export default function UserQRCode({ userId }) {
  const [loading, setLoading] = useState(false);
  const qrRef = useRef();

  const handleShareOrSave = async () => {
    setLoading(true);

    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Sharing is not available on this device");
        setLoading(false);
        return;
      }

      qrRef.current.toDataURL(async (base64Code) => {
        try {
          const filename =
            FileSystem.cacheDirectory + `healthmate_qr_${userId}.png`;

          // usage with the 'legacy' import works exactly like before
          await FileSystem.writeAsStringAsync(filename, base64Code, {
            encoding: "base64",
          });

          await Sharing.shareAsync(filename);
        } catch (error) {
          console.error(error);
          Alert.alert("Error", "Could not generate share file.");
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your Digital ID</Text>

      <View style={styles.qrContainer}>
        <QRCode
          value={userId ? userId.toString() : "0000"}
          size={180}
          color="black"
          backgroundColor="white"
          quietZone={10}
          getRef={(c) => (qrRef.current = c)}
        />
      </View>

      <Text style={styles.idText}>ID: {userId}</Text>

      <TouchableOpacity
        style={styles.downloadBtn}
        onPress={handleShareOrSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons
              name="share-outline"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.btnText}>Share / Save QR</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: "90%",
    marginVertical: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0056D2",
    marginBottom: 15,
  },
  qrContainer: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 10,
    overflow: "hidden",
  },
  idText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 15,
    letterSpacing: 2,
  },
  downloadBtn: {
    backgroundColor: "#0056D2",
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
