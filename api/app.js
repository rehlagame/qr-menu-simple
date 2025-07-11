
require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieSession = require('cookie-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const { helmetConfig, generalLimiter } = require('../middleware/security');
const { languageMiddleware } = require('../middleware/language');

// اختيار قاعدة البيانات حسب البيئة
const dbType = process.env.DB_TYPE || 'sqlite';
const db = dbType === 'supabase'
    ? require('../database/supabase')
    : require('../database/db');

console.log(`📊 Using ${dbType} database`);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Vercel (enhanced for multiple proxies)
app.set('trust proxy', true);

// إعدادات الأمان
app.use(helmetConfig);
app.use(generalLimiter);

// إعدادات التطبيق
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('views', path.join(__dirname, '../views'));

// Middleware - الترتيب مهم!
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'  // 'none' for cross-site on Vercel
}));

// Middleware للغة - مهم أن يكون بعد الجلسة والكوكيز
app.use(languageMiddleware);

// Middleware للتحقق من تسجيل الدخول
const requireAuth = (req, res, next) => {
    if (!req.session.restaurantId) {
        return res.redirect('/auth/login');
    }
    next();
};

// استيراد Routes
const routes = require('../routes');

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.render('index', {
        title: res.locals.t.appName || 'QR Menu',
        lang: res.locals.lang || 'ar',
        t: res.locals.t || {},
        isRTL: res.locals.isRTL !== false,
        switchLanguageUrl: res.locals.switchLanguageUrl || '#'
    });
});

// Health check endpoint لـ Vercel
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: dbType,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// صفحة العرض التجريبي
app.get('/demo', (req, res) => {
    res.redirect('/menu/demo');
});

// ====================================
// Routes - الترتيب مهم جداً!
// ====================================

// 1. Auth routes (للتسجيل وتسجيل الدخول)
app.use('/auth', routes.auth(db));

// 2. Admin sub-routes (يجب أن تكون قبل /admin العام)
app.use('/admin/categories', requireAuth, routes.categories(db));
app.use('/admin/products', requireAuth, routes.products(db));

// 3. Admin general routes (يجب أن يكون آخر admin route)
app.use('/admin', requireAuth, routes.admin(db));

// 4. Menu routes (للزوار)
app.use('/menu', routes.menu(db));

// ====================================
// معالجة الأخطاء
// ====================================

// معالجة أخطاء multer
app.use((error, req, res, next) => {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
        req.session.error = res.locals.t?.fileTooLarge || 'حجم الملف كبير جداً (الحد الأقصى 5MB)';
        return res.redirect('back');
    }

    if (error && error.message) {
        console.error('Application Error:', error);
        req.session.error = error.message || res.locals.t?.error || 'حدث خطأ في النظام';
        return res.redirect('back');
    }
    
    next();
});

// صفحة 404
app.use((req, res) => {
    console.log('404 - Page not found:', req.originalUrl);
    
    res.status(404).render('404', {
        title: res.locals.t?.pageNotFound || 'الصفحة غير موجودة',
        lang: res.locals.lang || 'ar',
        t: res.locals.t || {},
        isRTL: res.locals.isRTL !== false,
        switchLanguageUrl: res.locals.switchLanguageUrl || '#'
    });
});

// معالجة أخطاء الخادم 500
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    
    // في حالة الإنتاج، لا نظهر تفاصيل الخطأ
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(500).render('error', {
        title: 'خطأ في الخادم',
        message: isDevelopment ? err.message : 'عذراً، حدث خطأ في الخادم',
        error: isDevelopment ? err : {},
        lang: res.locals.lang || 'ar',
        t: res.locals.t || {},
        isRTL: res.locals.isRTL !== false
    });
});

// ====================================
// تشغيل الخادم
// ====================================

// للتطوير المحلي
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('================================================');
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📱 Demo menu: http://localhost:${PORT}/menu/demo`);
        console.log(`👤 Admin panel: http://localhost:${PORT}/admin`);
        console.log(`📧 Demo login: demo@qrmenu.com / demo123`);
        console.log(`📊 Database: ${dbType.toUpperCase()}`);
        console.log(`🌐 Language support: AR/EN`);
        console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('================================================');
        
        // اختبار الاتصال بقاعدة البيانات
        if (db && db.get) {
            db.get('SELECT 1', (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err.message);
                } else {
                    console.log('✅ Database connection successful');
                }
            });
        }
    });
} else {
    // للإنتاج على Vercel
    console.log('🚀 Running in production mode on Vercel');
    console.log(`📊 Database: ${dbType.toUpperCase()}`);
}

// تصدير التطبيق لـ Vercel - مرة واحدة فقط
module.exports = app;
