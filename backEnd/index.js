require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sql = require("./dbconnect"); // Importing your existing connection
const axios=require("axios");
const app = express();
const port = process.env.PORT || 5000;

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
app.post('/users/push-token', async (req, res) => {
    const { id, token } = req.body;
    try {
        await sql`UPDATE users SET push_token = ${token} WHERE id = ${id}`;
        res.json({ success: true, message: "Token saved" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error saving token" });
    }
});

// ... (Your other Login/Medical routes) ...


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
            
            console.log(`New Alert: ${currentAlert.type} at timestamp ${currentAlert.timestamp}`);
            
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
        timeZone: "Asia/Kolkata"
    });

    try {
        // B. Insert into 'pastalerts' DB
        await sql`
            INSERT INTO pastalerts (user_id, alert_type, alert_value, alert_time, gps_lat, gps_lon)
            VALUES (
                ${PATIENT_ID}, 
                ${alertObj.type}, 
                ${alertObj.value.toString()}, 
                ${istDate}, 
                ${alertObj.gps.lat}, 
                ${alertObj.gps.lon}
            )
        `;

        // C. Fetch User's Push Token
        const userResult = await sql`SELECT push_token FROM users WHERE id = ${PATIENT_ID}`;
        
        if (userResult.length > 0 && userResult[0].push_token) {
            await sendPushNotification(userResult[0].push_token, alertObj.type, alertObj.value, istDate);
        }

    } catch (dbError) {
        console.error("Database Insert Error:", dbError);
    }
}

async function sendPushNotification(token, type, value, time) {
    if (!Expo.isExpoPushToken(token)) return;

    const messageBody = `${type.replace('_', ' ')} detected! Value: ${value}. Time: ${time}`;

    const messages = [{
        to: token,
        sound: 'default',
        title: '⚠️ Health Alert',
        body: messageBody,
        data: { type, value, time },
    }];

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

// ==========================================
// 3. START
// ==========================================

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
    
    // Poll every 5 seconds
    setInterval(pollFirebase, 5000);
});