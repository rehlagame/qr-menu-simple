const multer = require('multer');
const path = require('path');
const { uploadImage } = require('../utils/storage');

// إعدادات multer للحفظ المؤقت
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
    const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : 'temp/';
    cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

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
            // رفع إلى السحابة
            const imageUrl = await uploadImage(req.file, folder);

            // حفظ الرابط في req
            req.uploadedImageUrl = imageUrl;

            next();
        } catch (error) {
            return res.status(500).json({ error: 'فشل رفع الصورة' });
        }
    };
};

module.exports = { upload, handleUpload };
