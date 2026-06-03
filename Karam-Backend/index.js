const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // إضافة مكتبة axios للتعامل مع طلبات فيسبوك وGemini
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// جلب مفتاح Gemini API من متغيرات البيئة بـ Render
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "ضع_مفتاح_Gemini_الخاص_بك_هنا";

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
// وظائف محرك الذكاء الاصطناعي والأتمتة المستقلة (Gemini & Facebook)
// ==========================================

// دالة توليد رد ذكي واحترافي عبر Gemini API بناءً على تعليق الزبون
async function generateAiReply(commentText) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{
                parts: [{
                    text: `أنت مساعد مبيعات وخدمة عملاء ذكي لبق لمنصة تجارية. اكتب رداً قصيراً ومناسباً جداً على تعليق الزبون التالي على الفيسبوك دون استخدام رموز تعبيرية مبالغ فيها وبطريقة ودية ومحفزة للشراء. نص التعليق: "${commentText}"`
                }]
            }]
        });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("❌ خطأ في الاتصال بمحرك Gemini AI:", error.message);
        return "أهلاً بك يا غالي، يسعدنا تواصلك معنا! أرسل لنا رسالة خاصة لتزويدك بكافة التفاصيل الحالية.";
    }
}

// محرك الفحص الدائري التلقائي المستقل (Automation Engine)
async function startAutomationEngine() {
    console.log("🔄 تم تشغيل محرك الفحص التلقائي المستقل في الخلفية...");
    
    setInterval(async () => {
        try {
            // جلب كافة الزبائن المفعّلين لنظام الردود والذين لديهم بيانات ربط صحيحة
            const activeUsers = await User.find({
                'botSettings.autoCommentEnabled': true,
                pageId: { $ne: "" },
                pageAccessToken: { $ne: "" }
            });

            for (let user of activeUsers) {
                console.log(`🔍 جاري فحص صفحة المستخدم: ${user.username}...`);
                
                // 1. جلب آخر 3 منشورات من تغذية الصفحة للتخفيف وضمان السرعة
                const postsUrl = `https://graph.facebook.com/v18.0/${user.pageId}/feed?access_token=${user.pageAccessToken}&limit=3`;
                const postsRes = await axios.get(postsUrl);
                const posts = postsRes.data.data || [];

                for (let post of posts) {
                    // 2. جلب التعليقات على كل منشور
                    const commentsUrl = `https://graph.facebook.com/v18.0/${post.id}/comments?access_token=${user.pageAccessToken}`;
                    const commentsRes = await axios.get(commentsUrl);
                    const comments = commentsRes.data.data || [];

                    for (let comment of comments) {
                        // تخطي تعليقات الصفحة نفسها لعدم الدخول في حلقة ردود لا نهائية
                        if (comment.from && comment.from.id === user.pageId) continue;

                        // التحقق مما إذا كان السيرفر قد رد على هذا التعليق سابقاً لمنع تكرار الردود
                        const repliesUrl = `https://graph.facebook.com/v18.0/${comment.id}/comments?access_token=${user.pageAccessToken}`;
                        const repliesRes = await axios.get(repliesUrl);
                        const replies = repliesRes.data.data || [];
                        const alreadyReplied = replies.some(r => r.from && r.from.id === user.pageId);

                        if (!alreadyReplied) {
                            console.log(`📩 تعليق جديد من [${comment.from ? comment.from.name : 'زبون'}]: ${comment.message}`);
                            
                            // أ. توليد الرد الاحترافي عبر ذكاء Gemini
                            const aiReply = await generateAiReply(comment.message);

                            // ب. نشر الرد التلقائي مباشرة على فيسبوك
                            const replyPublishUrl = `https://graph.facebook.com/v18.0/${comment.id}/comments`;
                            await axios.post(replyPublishUrl, {
                                message: aiReply,
                                access_token: user.pageAccessToken
                            });
                            console.log(`🚀 تم نشر الرد بنجاح: ${aiReply}`);

                            // ج. الإعجاب التلقائي بالتعليق (Like) إذا كان الخيار مفعلاً لدى الزبون
                            if (user.botSettings.autoLikeEnabled) {
                                const likeUrl = `https://graph.facebook.com/v18.0/${comment.id}/likes`;
                                await axios.post(likeUrl, { access_token: user.pageAccessToken });
                                console.log(`👍 تم وضع لايك تلقائي على تعليق الزبون.`);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("⚠️ خطأ دوري في محرك الأتمتة:", err.message);
        }
    }, 60000); // الفحص يتكرر تلقائياً وبأمان كل 60 ثانية (دقيقة واحدة)
}

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

// الاتصال بقاعدة البيانات ثم تشغيل السيرفر والمحرك التلقائي
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ تم الاتصال بقاعدة البيانات");
        app.listen(PORT, () => {
            console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
            // إقلاع محرك الأتمتة والردود فور بدء عمل السيرفر بنجاح
            startAutomationEngine();
        });
    })
    .catch(err => {
        console.error("❌ خطأ في الاتصال:", err);
    });
