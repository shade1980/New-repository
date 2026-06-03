const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// نقطة الاتصال الأساسية
app.get('/', (req, res) => {
    res.send('🚀 منصة "كرم" تعمل بنجاح!');
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
