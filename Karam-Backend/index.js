const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // إضافة مكتبة المسارات للتعرف على ملف الـ html
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. هيكل بيانات المستخدم (Schema)
// ==========================================
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    botSettings: { 
        autoLikeEnabled: { type: Boolean, default: false },
        autoCommentEnabled: { type: Boolean, default: false }
    }
});
const User = mongoose.model('User', userSchema);

// ==========================================
// 2. مسارات الـ API للربط مع الواجهة
// ==========================================

// مسار تسجيل الدخول (Login)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        
        // إرجاع بيانات المستخدم بنجاح للواجهة
        res.json({ success: true, userId: user._id, username: user.username });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// مسار تحديث إعدادات البوت (Settings)
app.put('/api/dashboard/settings', async (req, res) => {
    const { userId, autoLikeEnabled } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            userId, 
            { 'botSettings.autoLikeEnabled': autoLikeEnabled }, 
            { new: true }
        );
        if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
        
        res.json({ success: true, botSettings: user.botSettings });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// 3. الربط وتوجيه السيرفر لعرض الواجهة الأمامية تلقائياً
// ==========================================
// السيرفر سيقرأ ملف الـ index.html من مجلد اسمه public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة البيانات ثم تشغيل السيرفر
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ تم الاتصال بقاعدة البيانات");
        app.listen(PORT, () => {
            console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
        });
    })
    .catch(err => {
        console.error("❌ خطأ في الاتصال:", err);
    });
