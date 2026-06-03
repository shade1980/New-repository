const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // مكتبة معالجة المسارات في النظام
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
// 3. توجيه السيرفر لعرض الواجهة من مجلد public الجديد
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ==========================================
// 4. مسارات Meta Webhook (التحقق والاستقبال)
// ==========================================

// رمز تحقق سري من اختيارك لربطه بـ Meta Developers
const VERIFY_TOKEN = 'KaramToken2026';

// مسار التحقق (GET) الذي يطلبه فيسبوك عند الربط لأول مرة
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ تم التحقق من الـ Webhook بنجاح بواسطة Meta');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
});

// مسار استقبال البيانات الحية (POST) عند حدوث تعليق أو رسالة
app.post('/webhook', (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        // هنا ستصل تفاصيل التعليقات والرسائل الحية
        console.log('📩 تفاصيل الحدث القادم من فيسبوك:', JSON.stringify(body, null, 2));
        
        // إشعار فيسبوك باستلام البيانات بنجاح لكي لا يكرر إرسالها
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
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
