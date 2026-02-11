const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. FIREBASE ADMIN SDK SETUP ---
// Aapko Firebase Console > Settings > Service Accounts se 'Private Key' download karke yahan link karni hogi
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sd-e-sports-default-rtdb.firebaseio.com"
});

const db = admin.database();
const SECRET_KEY = "SD_ESPORTS_ULTRA_SECRET_TOKEN_KEY"; // Ise badal dena

// --- 2. BACKEND ALGORITHM: TOKEN VERIFICATION ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send({ message: "No Token Provided" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).send({ message: "Failed to authenticate token" });
        req.userId = decoded.id;
        next();
    });
};

// --- 3. LOGIN ALGORITHM (Token Generator) ---
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    const userRef = db.ref('users/' + phone);
    const snapshot = await userRef.once('value');

    if (snapshot.exists() && snapshot.val().pass === password) {
        // Backend ek secure token generate karta hai
        const token = jwt.sign({ id: phone }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ success: true, token: token, userData: snapshot.val() });
    } else {
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

// --- 4. FEATURE 1 & 2: RIVAL CHALLENGE & JOIN LOGIC ---
app.post('/api/challenge', verifyToken, async (req, res) => {
    const { rivalId, amount } = req.body;
    const senderId = req.userId;

    // Backend Verification: Balance Check
    const userRef = db.ref('users/' + senderId);
    const userSnap = await userRef.once('value');
    const balance = userSnap.val().balance;

    if (balance < amount) {
        return res.json({ success: false, message: "Insufficient Balance" });
    }

    // Algorithm: Challenge Create karna aur match lock karna
    const challengeId = "CHALLENGE_" + Date.now();
    await db.ref('challenges/' + challengeId).set({
        sender: senderId,
        rival: rivalId,
        amount: amount,
        status: "pending"
    });

    res.json({ success: true, message: "Challenge Sent & Verified by Backend" });
});

// --- 5. FEATURE 9: VIDEO PROMO ALGORITHM ---
app.post('/api/submit-video', verifyToken, async (req, res) => {
    const { videoLink } = req.body;
    const userId = req.userId;

    // Backend AI Logic: Link verify karna (Dummy Logic)
    if (!videoLink.includes("youtube.com") && !videoLink.includes("instagram.com")) {
        return res.json({ success: false, message: "Invalid Link Format" });
    }

    await db.ref('promo_requests/' + userId).push({
        link: videoLink,
        status: "under_review",
        timestamp: admin.database.ServerValue.TIMESTAMP
    });

    res.json({ success: true, message: "Video Link Submitted for AI Verification" });
});

// Port Setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend Algorithm Running on Port ${PORT}`));
                 
