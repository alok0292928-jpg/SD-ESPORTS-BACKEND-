const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. FIREBASE ADMIN SDK CONNECTION ---
// Aapki upload ki hui key yahan link ho rahi hai
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Aapka specific database URL
  databaseURL: "https://brandflow-9c883-default-rtdb.firebaseio.com" 
});

const db = admin.database();
const SECRET_KEY = "SD_ESPORTS_SECRET_2026"; // Ise secure rakhein

// --- 2. BACKEND ALGORITHM: TOKEN VERIFY ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).json({ message: "Access Denied: No Token" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(401).json({ message: "Invalid Token" });
        req.user = user;
        next();
    });
};

// --- 3. DYNAMIC FEATURES ALGORITHMS ---

// A. Registration/Login with Token Generation
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    const userRef = db.ref('users/' + phone);
    const snapshot = await userRef.once('value');

    if (snapshot.exists() && snapshot.val().pass === password) {
        const token = jwt.sign({ id: phone }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ success: true, token, userData: snapshot.val() });
    } else {
        res.status(401).json({ success: false, message: "Ghalat Details!" });
    }
});

// B. Feature 2: Rival Challenge (Verification Algorithm)
app.post('/api/challenge-rival', verifyToken, async (req, res) => {
    const { rivalUid, amount } = req.body;
    const senderId = req.user.id;

    // Backend checking sender balance
    const senderRef = db.ref('users/' + senderId);
    const snap = await senderRef.once('value');
    
    if (snap.val().balance < amount) {
        return res.json({ success: false, message: "Balance Kam Hai!" });
    }

    // Creating Challenge in Database
    const challengeId = "CHALLENGE_" + Date.now();
    await db.ref('challenges/' + challengeId).set({
        from: senderId,
        to: rivalUid,
        amt: amount,
        status: "pending"
    });

    res.json({ success: true, message: "Challenge Sent Successfully!" });
});

// --- 4. START SERVER ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend Algorithm Live: http://localhost:${PORT}`);
    console.log(`🔗 Database Connected: brandflow-9c883`);
});
    
