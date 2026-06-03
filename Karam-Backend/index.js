require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 1. هيكل قاعدة البيانات
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    botSettings: { 
        autoLikeEnabled: { type: Boolean, default: false },
        autoCommentEnabled: { type: Boolean, default: false }
    }
});
const User = mongoose.model('User', userSchema);

// 2. الربط مع الواجهة
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. تشغيل السيرفر وقاعدة البيانات
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
    } catch (error) {
        console.error("❌ فشل الاتصال بقاعدة البيانات:", error.message);
        process.exit(1);
    }
};

const PORT = process.env.PORT || 3000;
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 منصة "كرم" تعمل بكامل طاقتها على المنفذ ${PORT}`);
    });
};

startServer();
