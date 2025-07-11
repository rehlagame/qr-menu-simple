const multer = require('multer');
const path = require('path');
const { uploadImage } = require('../utils/storage');

// استخدام الذاكرة بدلاً من الملفات المؤقتة - حل نهائي لـ Vercel
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('فقط الصور مسموح بها (JPG, PNG, GIF, WebP)'));
        }
    }
});

// Middleware لمعالجة الرفع
const handleUpload = (folder = 'products') => {
    return async (req, res, next) => {
        if (!req.file) return next();

        try {
            // تعديل الملف ليعمل مع storage.js
            // نمرر الملف كما هو مع buffer
            const fileToUpload = {
                buffer: req.file.buffer,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype
            };

            // رفع إلى السحابة
            const imageUrl = await uploadImage(fileToUpload, folder);

            // حفظ الرابط في req
            req.uploadedImageUrl = imageUrl;

            next();
        } catch (error) {
            console.error('Upload error:', error);
            return res.status(500).json({ error: 'فشل رفع الصورة' });
        }
    };
};

module.exports = { upload, handleUpload };
