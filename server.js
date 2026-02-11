const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. FIREBASE CONNECTION ---
// Render par 'FIREBASE_SERVICE_ACCOUNT' naam ka Environment Variable banayein
// Aur usme apni JSON file ka sara text paste kar dein.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://brandflow-9c883-default-rtdb.firebaseio.com"
});

const db = admin.database();
const SECRET_KEY = process.env.JWT_SECRET || "SD_ESPORTS_SECRET_2026";

// --- 2. MIDDLEWARE: TOKEN VERIFY ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ message: "No Token Provided" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(401).json({ message: "Invalid Token" });
        req.user = user;
        next();
    });
};

// --- 3. ROUTES ---
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    const snapshot = await db.ref('users/' + phone).once('value');
    if (snapshot.exists() && snapshot.val().pass === password) {
        const token = jwt.sign({ id: phone }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ success: true, token, userData: snapshot.val() });
    } else {
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

// Rival Challenge Logic
app.post('/api/challenge-rival', verifyToken, async (req, res) => {
    const { rivalUid, amount } = req.body;
    const senderRef = db.ref('users/' + req.user.id);
    const snap = await senderRef.once('value');
    
    if (snap.val().balance < amount) return res.json({ success: false, message: "Low Balance" });

    const challengeId = "CH_" + Date.now();
    await db.ref('challenges/' + challengeId).set({
        from: req.user.id, to: rivalUid, amt: amount, status: "pending"
    });
    res.json({ success: true, message: "Challenge Sent!" });
});

// --- 4. START SERVER ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend Live on Port ${PORT}`);
});
