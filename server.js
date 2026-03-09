require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const twilio = require("twilio");
const cors = require("cors");

const PORT = process.env.PORT || 7000;

const app = express();

// Enable CORS for Netlify frontend
app.use(cors({
  origin: "https://clever-travesseiro-8f4af8.netlify.app"
}));

app.use(express.json());

// MongoDB Client
const mongoClient = new MongoClient(process.env.MONGO_URI);

// Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

let db;

// Connect MongoDB
async function connectMongo() {
  try {
    await mongoClient.connect();
    db = mongoClient.db("TechNovaX");
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed", err);
    process.exit(1);
  }
}

connectMongo();

// Test Route
app.get("/", (req, res) => {
  res.send("TechNovaX Backend Running ✅");
});

// Feedback API
app.post("/feedback", async (req, res) => {
  try {

    const data = req.body;

    console.log("📩 Received Feedback:", data);

    if (
      !data.clientName ||
      data.quality < 1 ||
      data.value < 1 ||
      data.requirement < 1 ||
      data.timeliness < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Data"
      });
    }

    // Save to MongoDB
    await db.collection("Clients").insertOne({
      ...data,
      createdAt: new Date()
    });

    console.log("✅ Data Stored in MongoDB");

    // Send WhatsApp Notification
    await twilioClient.messages.create({
      from: "whatsapp:+14155238886",
      to: process.env.WHATSAPP_TO,
      body: `
📩 TechNovaX - New Feedback

👤 Client: ${data.clientName}

⭐ Service Quality: ${data.quality}/5
⭐ Price Satisfaction: ${data.value}/5
⭐ Met Requirement: ${data.requirement}/5
⭐ Delivery Time: ${data.timeliness}/5

💬 Suggestion:
${data.suggestions || "No comments"}
`
    });

    console.log("✅ WhatsApp Message Sent");

    res.json({ success: true });

  } catch (err) {

    console.error("❌ Feedback Error:", err);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});