const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// إعدادات Helmet محسنة لـ Vercel
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'", 
                "https://fonts.gstatic.com",
                "data:"
            ],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net"
            ],
            imgSrc: [
                "'self'", 
                "data:", 
                "blob:",
                "https:",
                process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace('/auth/v1', '') : '*'
            ],
            connectSrc: [
                "'self'",
                "https:",
                process.env.SUPABASE_URL || '*'
            ]
        }
    },
    crossOriginEmbedderPolicy: false
});

// Rate Limiters
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // حد أقصى 100 طلب
    message: 'تم تجاوز الحد المسموح من الطلبات، حاول مرة أخرى لاحقاً',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 5, // 5 محاولات تسجيل دخول
    message: 'تم تجاوز الحد المسموح من محاولات تسجيل الدخول',
    skipSuccessfulRequests: true
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 20, // 20 رفعة كحد أقصى
    message: 'تم تجاوز الحد المسموح من رفع الملفات'
});

// تصدير loginLimiter باسم مختلف
const loginLimiter = authLimiter;

module.exports = {
    helmetConfig,
    generalLimiter,
    authLimiter,
    uploadLimiter,
    loginLimiter
};
