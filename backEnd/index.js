require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sql = require("./dbconnect"); // Importing your existing connection
const axios = require("axios");
const app = express();
const port = process.env.PORT || 5000;
const { Expo } = require("expo-server-sdk");
let expo = new Expo();
app.use(cors());
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================
app.get("/a", async (req, res) => {
  res.send("Server Running Healthy");
});
// 1. ADMIN: Add User
// Logic: Uses the DB sequence to auto-generate ID starting at 1001
app.post("/admin/add-user", async (req, res) => {
  const { name, age, address, gender, password } = req.body;

  try {
    // Postgres.js syntax uses template literals
    const result = await sql`
            INSERT INTO users (name, age, address, gender, password)
            VALUES (${name}, ${age}, ${address}, ${gender}, ${password})
            RETURNING id
        `;

    res.status(201).json({
      message: "User created successfully",
      userId: result[0].id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error while adding user" });
  }
});

// 2. USER: Login (ID + Password)
app.post("/login", async (req, res) => {
  const { id, password } = req.body;

  try {
    // Changed: Now selecting id AND name
    const result = await sql`
            SELECT id, name FROM users 
            WHERE id = ${id} AND password = ${password}
        `;

    if (result.length > 0) {
      // Changed: Returning id in the response
      res.json({
        success: true,
        id: result[0].id,
        name: result[0].name,
      });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid ID or Password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login server error" });
  }
});

// 3. USER: Login (QR Code - ID Only)
app.post("/login-qr", async (req, res) => {
  const { id } = req.body;

  try {
    // Changed: Now selecting id AND name
    const result = await sql`
            SELECT id, name FROM users 
            WHERE id = ${id}
        `;

    if (result.length > 0) {
      // Changed: Returning id in the response
      res.json({
        success: true,
        id: result[0].id,
        name: result[0].name,
      });
    } else {
      res.status(404).json({ success: false, message: "User ID not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "QR Login server error" });
  }
});

// 4. USER/ADMIN: Reset Password
app.put("/reset-password", async (req, res) => {
  const { id, newPassword } = req.body;

  try {
    const result = await sql`
            UPDATE users 
            SET password = ${newPassword} 
            WHERE id = ${id} 
            RETURNING id
        `;

    if (result.length > 0) {
      res.json({ success: true, message: "Password updated successfully" });
    } else {
      res.status(404).json({ success: false, message: "User ID not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Reset password error" });
  }
});

// 5. MEDICAL: Add Record
app.post("/medical-records/add", async (req, res) => {
  const { id, record } = req.body;
  try {
    await sql`INSERT INTO medicalrecord (id, record) VALUES (${id}, ${record})`;
    res.json({ success: true, message: "Record added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error adding record" });
  }
});

// 6. MEDICAL: Get Records
app.get("/medical-records/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await sql`SELECT record FROM medicalrecord WHERE id = ${id}`;
    res.json({ success: true, records: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error fetching records" });
  }
});
// 7. MEDICAL: Delete Record
app.delete("/medical-records/delete", async (req, res) => {
  const { id, record } = req.body;
  try {
    // Since Primary Key is (id, record), we need both to identify the row
    await sql`DELETE FROM medicalrecord WHERE id = ${id} AND record = ${record}`;
    res.json({ success: true, message: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error deleting record" });
  }
});

// Save Push Token Route
app.post("/users/push-token", async (req, res) => {
  const { id, token } = req.body;
  try {
    await sql`UPDATE users SET push_token = ${token} WHERE id = ${id}`;
    res.json({ success: true, message: "Token saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving token" });
  }
});

// ==========================================
// 2. BACKGROUND WORKER (Updated for Single Object)
// ==========================================

const PATIENT_ID = 1001;
const FIREBASE_URL = `https://healthcarebandtech-72c66-default-rtdb.firebaseio.com/patient${PATIENT_ID}/alerts.json`;

let lastProcessedTime = 0;

async function pollFirebase() {
  try {
    const response = await axios.get(FIREBASE_URL);
    const currentAlert = response.data;

    if (!currentAlert || !currentAlert.timestamp) return;

    // LOGIC CHANGE: Check if this single object is newer than the last one we saw
    if (currentAlert.timestamp > lastProcessedTime) {
      console.log(
        `New Alert: ${currentAlert.type} at timestamp ${currentAlert.timestamp}`
      );

      // Update tracker
      lastProcessedTime = currentAlert.timestamp;

      // Process
      await processAlert(currentAlert);
    }
  } catch (error) {
    console.error("Polling Error:", error.message);
  }
}

async function processAlert(alertObj) {
  // A. Format Time to IST
  const istDate = new Date(alertObj.timestamp * 1000).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  try {
    // B. Insert into 'pastalerts' DB AND GET THE ID
    const insertResult = await sql`
        INSERT INTO pastalerts (user_id, alert_type, alert_value, alert_time, gps_lat, gps_lon)
        VALUES (
            ${PATIENT_ID}, 
            ${alertObj.type}, 
            ${alertObj.value.toString()}, 
            ${istDate}, 
            ${alertObj.gps.lat}, 
            ${alertObj.gps.lon}
        )
        RETURNING id
    `;

    const newAlertId = insertResult[0].id;
    console.log("New Alert Saved. ID:", newAlertId);

    // C. Notify User (Patient Family)
    const userResult =
      await sql`SELECT push_token FROM users WHERE id = ${PATIENT_ID}`;
    if (userResult.length > 0 && userResult[0].push_token) {
      await sendPushNotification(
        userResult[0].push_token,
        alertObj.type,
        alertObj.value,
        istDate
      );
    }

    // ==========================================================
    // D. FIND NEAREST HOSPITAL & ASSIGN
    // ==========================================================

    // 1. Fetch all hospitals with location
    const hospitals =
      await sql`SELECT id, latitude, longitude, push_token FROM hospitals`;

    if (hospitals.length > 0) {
      let nearestHospital = null;
      let minDistance = Infinity;

      // 2. Find closest
      for (const hospital of hospitals) {
        if (hospital.latitude && hospital.longitude) {
          const dist = getDistanceFromLatLonInKm(
            alertObj.gps.lat,
            alertObj.gps.lon,
            parseFloat(hospital.latitude),
            parseFloat(hospital.longitude)
          );

          if (dist < minDistance) {
            minDistance = dist;
            nearestHospital = hospital;
          }
        }
      }

      // 3. Assign and Notify
      if (nearestHospital) {
        console.log(
          `Assigning Alert ${newAlertId} to Hospital ${
            nearestHospital.id
          } (Dist: ${minDistance.toFixed(2)}km)`
        );

        // Add to 'assigned' table
        await sql`
                INSERT INTO assigned (alert_id, user_id, hospital_id)
                VALUES (${newAlertId}, ${PATIENT_ID}, ${nearestHospital.id})
            `;

        // Notify Hospital
        if (nearestHospital.push_token) {
          await sendPushNotification(
            nearestHospital.push_token,
            "EMERGENCY ASSIGNMENT",
            `Patient Nearby! Type: ${alertObj.type}`,
            istDate
          );
        }
      }
    }
  } catch (dbError) {
    if (dbError.code === "23505") {
      console.log(`Duplicate skipped: Alert at ${istDate} already exists.`);
    } else {
      console.error("Database Insert Error:", dbError);
    }
  }
}

async function sendPushNotification(token, type, value, time) {
  if (!Expo.isExpoPushToken(token)) return;

  const messageBody = `Warning !!! ${type.replace(
    "_",
    " "
  )} detected! Value: ${value}. The Patient need immediate Assistance`;

  const messages = [
    {
      to: token,
      sound: "default",
      title: "⚠️ CRITICAL HEALTH ALERT",
      body: messageBody,
      data: { type, value, time },
      priority: "high",
      channelId: "critical_alerts",
    },
  ];

  try {
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log("Notification sent!");
  } catch (error) {
    console.error("Notification Error:", error);
  }
}

app.get("/alerts/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await sql`
      SELECT * FROM pastalerts 
      WHERE user_id = ${userId}
      ORDER BY id DESC
    `;

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
});
// ==========================================
// HOSPI-END ROUTES
// ==========================================

// 1. HOSPITAL: Register
app.post("/hospital/register", async (req, res) => {
  const {
    hospital_name,
    incharge_name,
    address,
    contact_number,
    latitude,
    longitude,
    password,
  } = req.body;

  try {
    const result = await sql`
      INSERT INTO hospitals (hospital_name, incharge_name, address, contact_number, latitude, longitude, password)
      VALUES (${hospital_name}, ${incharge_name}, ${address}, ${contact_number}, ${latitude}, ${longitude}, ${password})
      RETURNING id
    `;

    res.status(201).json({
      success: true,
      message: "Hospital Registered Successfully",
      id: result[0].id,
    });
  } catch (err) {
    console.error("Hospital Register Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Database error during registration" });
  }
});

// 2. HOSPITAL: Login
app.post("/hospital/login", async (req, res) => {
  const { id, password } = req.body;

  try {
    const result = await sql`
      SELECT id, incharge_name, hospital_name 
      FROM hospitals 
      WHERE id = ${id} AND password = ${password}
    `;

    if (result.length > 0) {
      res.json({
        success: true,
        id: result[0].id,
        incharge_name: result[0].incharge_name,
        hospital_name: result[0].hospital_name,
      });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Invalid Hospital ID or Password" });
    }
  } catch (err) {
    console.error("Hospital Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Helper: Haversine Distance Calculation (in km)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// --- HOSPITAL ROUTES ---

// 1. Save Hospital Push Token
app.post("/hospital/push-token", async (req, res) => {
  const { id, token } = req.body;
  try {
    await sql`UPDATE hospitals SET push_token = ${token} WHERE id = ${id}`;
    res.json({ success: true, message: "Hospital Token saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving token" });
  }
});

// 2. Get Live Assignments (Joined with User and Alert details)
app.get("/hospital/live-alerts/:hospitalId", async (req, res) => {
  const { hospitalId } = req.params;
  try {
    const result = await sql`
            SELECT 
                assigned.id as assignment_id,
                users.name as user_name,
                pastalerts.alert_type,
                pastalerts.alert_value,
                pastalerts.alert_time,
                pastalerts.gps_lat,
                pastalerts.gps_lon
            FROM assigned
            JOIN pastalerts ON assigned.alert_id = pastalerts.id
            JOIN users ON assigned.user_id = users.id
            WHERE assigned.hospital_id = ${hospitalId}
            ORDER BY assigned.assigned_at DESC
        `;
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// 3. Serve Alert (Move from Assigned -> Served)
app.post("/hospital/serve", async (req, res) => {
  const { assignment_id, hospital_id } = req.body;

  try {
    // Transaction-like steps
    // A. Get details from assigned before deleting
    const assignment =
      await sql`SELECT * FROM assigned WHERE id = ${assignment_id}`;

    if (assignment.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });
    }

    const { alert_id, user_id } = assignment[0];

    // B. Insert into served
    await sql`
            INSERT INTO served (alert_id, user_id, hospital_id)
            VALUES (${alert_id}, ${user_id}, ${hospital_id})
        `;

    // C. Delete from assigned
    await sql`DELETE FROM assigned WHERE id = ${assignment_id}`;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. Get Served History
app.get("/hospital/served-alerts/:hospitalId", async (req, res) => {
  const { hospitalId } = req.params;
  try {
    const result = await sql`
            SELECT 
                served.id,
                users.name as user_name,
                pastalerts.alert_type,
                pastalerts.alert_time
            FROM served
            JOIN pastalerts ON served.alert_id = pastalerts.id
            JOIN users ON served.user_id = users.id
            WHERE served.hospital_id = ${hospitalId}
            ORDER BY served.served_at DESC
        `;
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});
// GET PAST ALERTS (With Hospital & Status Info)
app.get("/alerts/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // We use COALESCE to check 'served' first, then 'assigned' to determine the current hospital
    // We determine status based on which table the alert is found in
    const result = await sql`
      SELECT 
        pa.*,
        
        -- Determine Status
        CASE 
            WHEN s.id IS NOT NULL THEN 'Served'
            WHEN a.id IS NOT NULL THEN 'Assigned'
            ELSE 'Pending' 
        END as status,

        -- Get Hospital Details (from either table)
        h.hospital_name,
        h.latitude as hosp_lat,
        h.longitude as hosp_lon,
        h.contact_number as hosp_contact

      FROM pastalerts pa
      LEFT JOIN served s ON pa.id = s.alert_id
      LEFT JOIN assigned a ON pa.id = a.alert_id
      LEFT JOIN hospitals h ON h.id = COALESCE(s.hospital_id, a.hospital_id)
      
      WHERE pa.user_id = ${userId}
      ORDER BY pa.alert_time DESC
    `;

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  setInterval(pollFirebase, 5000);
});
