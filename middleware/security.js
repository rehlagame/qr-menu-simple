const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const { body, validationResult } = require('express-validator');

// حماية الهيدرز
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'", "https://ujcurkkwxkfyflyhhuzd.supabase.co"]
        }
    }
});

// حد المحاولات لتسجيل الدخول
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 5, // 5 محاولات
    message: 'تم تجاوز عدد المحاولات المسموح، حاول بعد 15 دقيقة',
    standardHeaders: true,
    legacyHeaders: false,
});

// حد عام للطلبات
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // 100 طلب
    message: 'تم تجاوز عدد الطلبات المسموح',
    standardHeaders: true,
    legacyHeaders: false,
});

// حماية CSRF
const csrfProtection = csrf({ cookie: true });

// قواعد التحقق من البيانات

// تسجيل الدخول
const validateLogin = [
    body('email')
        .isEmail().withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('كلمة المرور مطلوبة')
        .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
];

// التسجيل
const validateRegister = [
    body('name')
        .notEmpty().withMessage('اسم المطعم مطلوب')
        .isLength({ min: 3 }).withMessage('اسم المطعم يجب أن يكون 3 أحرف على الأقل')
        .trim(),
    body('slug')
        .notEmpty().withMessage('معرف المطعم مطلوب')
        .matches(/^[a-z0-9-]+$/).withMessage('المعرف يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط')
        .isLength({ min: 3 }).withMessage('المعرف يجب أن يكون 3 أحرف على الأقل'),
    body('email')
        .isEmail().withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        .matches(/\d/).withMessage('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('كلمة المرور غير متطابقة'),
    body('phone')
        .optional()
        .isMobilePhone('ar-KW').withMessage('رقم الهاتف غير صحيح')
];

// إضافة منتج
const validateProduct = [
    body('name')
        .notEmpty().withMessage('اسم المنتج مطلوب')
        .isLength({ min: 2 }).withMessage('اسم المنتج يجب أن يكون حرفين على الأقل')
        .trim(),
    body('price')
        .isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقم موجب')
        .toFloat(),
    body('category_id')
        .notEmpty().withMessage('القسم مطلوب')
        .isInt().withMessage('القسم غير صحيح')
        .toInt(),
    body('description')
        .optional()
        .isLength({ max: 500 }).withMessage('الوصف يجب ألا يتجاوز 500 حرف')
        .trim()
];

// إضافة قسم
const validateCategory = [
    body('name')
        .notEmpty().withMessage('اسم القسم مطلوب')
        .isLength({ min: 2 }).withMessage('اسم القسم يجب أن يكون حرفين على الأقل')
        .trim(),
    body('order_index')
        .optional()
        .isInt({ min: 0 }).withMessage('الترتيب يجب أن يكون رقم موجب')
        .toInt()
];

// تحديث الإعدادات
const validateSettings = [
    body('name')
        .notEmpty().withMessage('اسم المطعم مطلوب')
        .isLength({ min: 3 }).withMessage('اسم المطعم يجب أن يكون 3 أحرف على الأقل')
        .trim(),
    body('phone')
        .optional()
        .isMobilePhone('ar-KW').withMessage('رقم الهاتف غير صحيح'),
    body('address')
        .optional()
        .isLength({ max: 200 }).withMessage('العنوان يجب ألا يتجاوز 200 حرف')
        .trim()
];

// تغيير كلمة المرور
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
        .matches(/\d/).withMessage('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('كلمة المرور غير متطابقة')
];

// دالة للتحقق من الأخطاء
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.error = errors.array()[0].msg;
        return res.redirect('back');
    }
    next();
};

module.exports = {
    helmetConfig,
    loginLimiter,
    generalLimiter,
    csrfProtection,
    validateLogin,
    validateRegister,
    validateProduct,
    validateCategory,
    validateSettings,
    validatePasswordChange,
    handleValidationErrors
};