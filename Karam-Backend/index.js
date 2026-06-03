const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// 1. هيكل بيانات المستخدم المطوّر (Schema)
// ==========================================
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    pageId: { type: String, default: "" },          // معرف صفحة الفيسبوك للزبون
    pageAccessToken: { type: String, default: "" }, // مفتاح الوصول الخاص بالصفحة
    botSettings: { 
        autoLikeEnabled: { type: Boolean, default: false },
        autoCommentEnabled: { type: Boolean, default: false }
    }
});
const User = mongoose.model('User', userSchema);

// ==========================================
// 2. مسارات الـ API للربط والتحكم
// ==========================================

// مسار تسجيل الدخول والإنشاء التلقائي الآمن
app.post('/api/auth/login', async (req, res) => {
    const { email, password, username, isRegistering } = req.body;
    try {
        if (isRegistering) {
            const newUser = new User({ username, email, password });
            await newUser.save();
            return res.json({ success: true });
        }

        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        
        // إرجاع كافة بيانات العميل الحالية للواجهة
        res.json({ 
            success: true, 
            userId: user._id, 
            username: user.username,
            pageId: user.pageId,
            pageAccessToken: user.pageAccessToken,
            botSettings: user.botSettings
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// مسار تحديث إعدادات البوت والربط المستقل للزبون
app.put('/api/dashboard/settings', async (req, res) => {
    const { userId, autoLikeEnabled, autoCommentEnabled, pageId, pageAccessToken } = req.body;
    try {
        // تحديث البيانات ديناميكياً حسب ما يرسله العميل من الواجهة
        const updateData = {};
        if (autoLikeEnabled !== undefined) updateData['botSettings.autoLikeEnabled'] = autoLikeEnabled;
        if (autoCommentEnabled !== undefined) updateData['botSettings.autoCommentEnabled'] = autoCommentEnabled;
        if (pageId !== undefined) updateData.pageId = pageId;
        if (pageAccessToken !== undefined) updateData.pageAccessToken = pageAccessToken;

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
        if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
        
        res.json({ 
            success: true, 
            botSettings: user.botSettings,
            pageId: user.pageId,
            pageAccessToken: user.pageAccessToken
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// 3. توجيه السيرفر لعرض الواجهة الأمامية
// ==========================================
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
