const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. FIREBASE ADMIN SDK SETUP ---
// Apni serviceAccountKey.json file isi folder mein rakhein
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sd-e-sports-default-rtdb.firebaseio.com"
});

const db = admin.database();
const SECRET_KEY = process.env.JWT_SECRET || "SD_ESPORTS_MASTER_TOKEN_2026";

// --- 2. MIDDLEWARE: TOKEN VERIFICATION ALGORITHM ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ success: false, message: "Security Breach: No Token Provided" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, message: "Invalid Token: Access Denied" });
        req.userId = decoded.id;
        next();
    });
};

// --- 3. LOGIN & TOKEN GENERATION ---
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const userRef = db.ref('users/' + phone);
        const snapshot = await userRef.once('value');

        if (snapshot.exists() && snapshot.val().pass === password) {
            const token = jwt.sign({ id: phone }, SECRET_KEY, { expiresIn: '24h' });
            res.json({ success: true, token, userData: snapshot.val() });
        } else {
            res.status(401).json({ success: false, message: "Authentication Failed" });
        }
    } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
});

// --- 4. FEATURE 2: RIVAL CHALLENGE ALGORITHM ---
app.post('/api/challenge', verifyToken, async (req, res) => {
    const { rivalId, amount } = req.body;
    const senderId = req.userId;

    const senderRef = db.ref('users/' + senderId);
    const snap = await senderRef.once('value');
    
    if (snap.val().balance < amount) {
        return res.json({ success: false, message: "Insufficient Wallet Balance" });
    }

    const challengeId = "RIVAL_" + Date.now();
    await db.ref('challenges/' + challengeId).set({
        sender: senderId,
        rival: rivalId,
        amount: amount,
        status: "pending",
        timestamp: admin.database.ServerValue.TIMESTAMP
    });

    res.json({ success: true, message: "Challenge Logged & Verified" });
});

// --- 5. FEATURE 1: AI INSTANT REFUND MONITOR ---
// Yeh function admin panel ya cron job se trigger hoga
app.post('/api/admin/auto-refund', verifyToken, async (req, res) => {
    const { matchId, roomIdLate } = req.body;
    if (!roomIdLate) return res.json({ message: "Match is On-Time" });

    const participantsRef = db.ref(`match_participants/${matchId}`);
    const participants = await participantsRef.once('value');

    participants.forEach(child => {
        const userId = child.key;
        const entryFee = child.val().entryFee;
        db.ref(`users/${userId}/balance`).transaction(current => (current || 0) + entryFee);
    });

    res.json({ success: true, message: "AI Algorithm: Instant Refund Processed" });
});

// --- 6. FEATURE 9: VIDEO PROMO VERIFICATION ---
app.post('/api/promo-submit', verifyToken, async (req, res) => {
    const { videoLink } = req.body;
    await db.ref('video_promo_requests').push({
        userId: req.userId,
        link: videoLink,
        status: "pending_verification"
    });
    res.json({ success: true, message: "Algorithm: Promotion link queued for audit" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend Algorithm Active on Port ${PORT}`));
                                             
