require('dotenv').config();

const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const { helmetConfig, generalLimiter } = require('./middleware/security');
const { languageMiddleware } = require('./middleware/language');

// اختيار قاعدة البيانات حسب البيئة
const dbType = process.env.DB_TYPE || 'sqlite';
const db = dbType === 'supabase'
    ? require('./database/supabase')
    : require('./database/db');

console.log(`📊 Using ${dbType} database`);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Vercel
app.set('trust proxy', 1);

// إعدادات الأمان
app.use(helmetConfig);
app.use(generalLimiter);

// إعدادات التطبيق
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// إعدادات الجلسة محسنة لـ Vercel
app.use(cookieSession({
    name: 'qrmenu_session',
    keys: [process.env.SESSION_SECRET || 'qr-menu-olosolutions-2025'],
    maxAge: 24 * 60 * 60 * 1000, // 24 ساعة
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
}));

// Middleware للغة - مهم أن يكون بعد الجلسة والكوكيز
app.use(languageMiddleware);

// Middleware للتحقق من تسجيل الدخول
const requireAuth = (req, res, next) => {
    if (!req.session.restaurantId) {
        return res.redirect('/admin/login');
    }
    next();
};

// استيراد Routes
const routes = require('./routes');

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.render('index', {
        title: res.locals.t.appName,
        lang: res.locals.lang,
        t: res.locals.t,
        isRTL: res.locals.isRTL,
        switchLanguageUrl: res.locals.switchLanguageUrl
    });
});

// Health check endpoint لـ Vercel
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: dbType,
        timestamp: new Date().toISOString()
    });
});

// استخدام Routes
app.use('/admin', routes.auth(db));
app.use('/auth', routes.auth(db)); // للتسجيل
app.use('/admin', routes.admin(db, requireAuth));
app.use('/admin/categories', routes.categories(db, requireAuth));
app.use('/admin/products', routes.products(db, requireAuth));
app.use('/menu', routes.menu(db));

// صفحة العرض التجريبي
app.get('/demo', (req, res) => {
    res.redirect('/menu/demo');
});

// معالجة أخطاء multer
app.use((error, req, res, next) => {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
        req.session.error = res.locals.t.fileTooLarge || 'حجم الملف كبير جداً (الحد الأقصى 5MB)';
        return res.redirect('back');
    }

    if (error) {
        console.error('Application Error:', error);
        req.session.error = error.message || res.locals.t.error || 'حدث خطأ في النظام';
        return res.redirect('back');
    }
    next();
});

// صفحة 404
app.use((req, res) => {
    res.status(404).render('404', {
        title: res.locals.t.pageNotFound || 'الصفحة غير موجودة',
        lang: res.locals.lang,
        t: res.locals.t,
        isRTL: res.locals.isRTL,
        switchLanguageUrl: res.locals.switchLanguageUrl
    });
});

// معالجة أخطاء الخادم 500
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).render('error', {
        title: 'خطأ في الخادم',
        message: process.env.NODE_ENV === 'production'
            ? 'عذراً، حدث خطأ في الخادم'
            : err.message,
        error: process.env.NODE_ENV === 'production' ? {} : err,
        lang: res.locals.lang || 'ar',
        t: res.locals.t || {},
        isRTL: res.locals.isRTL !== false
    });
});

// تشغيل الخادم للتطوير فقط
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📱 Demo menu: http://localhost:${PORT}/menu/demo`);
        console.log(`👤 Demo login: demo@qrmenu.com / demo123`);
        console.log(`📊 Database: ${dbType.toUpperCase()}`);
        console.log(`🌐 Language support: AR/EN`);
        console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
} else {
    // للإنتاج - لا نستخدم listen
    console.log('🚀 Running in production mode on Vercel');
}

// مهم جداً - تصدير التطبيق لـ Vercel
<<<<<<< HEAD
module.exports = app;
=======
module.exports = app;
>>>>>>> e3bc304c6d0896aec8406577e763e5b93eb64011
