const { body, validationResult } = require('express-validator');

// Middleware للتحقق من أخطاء التحقق
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.error = errors.array()[0].msg;
        return res.redirect('back');
    }
    next();
};

// التحقق من بيانات تسجيل الدخول
const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('كلمة المرور مطلوبة')
];

// التحقق من بيانات التسجيل
const validateRegister = [
    body('name')
        .trim()
        .isLength({ min: 3 })
        .withMessage('اسم المطعم يجب أن يكون 3 أحرف على الأقل'),
    body('slug')
        .trim()
        .isLength({ min: 3 })
        .withMessage('المعرف يجب أن يكون 3 أحرف على الأقل')
        .matches(/^[a-zA-Z0-9-]+$/)
        .withMessage('المعرف يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط'),
    body('email')
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('رقم الهاتف غير صحيح')
];

// CSRF Protection - مؤقت (بدون وظيفة حقيقية)
const csrfProtection = (req, res, next) => {
    req.csrfToken = () => 'dummy-token'; // رمز وهمي
    next();
};

module.exports = {
    handleValidationErrors,
    validateLogin,
    validateRegister,
    csrfProtection
};


