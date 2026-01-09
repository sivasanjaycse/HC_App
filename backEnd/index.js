require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sql = require("./dbconnect"); // Importing your existing connection

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// ROUTES
// ==========================================

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

// Start Server
app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
