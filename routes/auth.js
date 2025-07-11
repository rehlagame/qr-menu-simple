const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const {
    validateLogin,
    validateRegister,
    handleValidationErrors,
    csrfProtection
} = require('../middleware/validators');
const { loginLimiter } = require('../middleware/security');

module.exports = (db) => {
    // صفحة تسجيل الدخول
    router.get('/login', csrfProtection, (req, res) => {
        res.render('admin/login', {
            title: 'تسجيل الدخول',
            error: req.session.error,
            csrfToken: req.csrfToken()
        });
        req.session.error = null;
    });

    // معالجة تسجيل الدخول مع الحماية
    router.post('/login',
        loginLimiter, // حد المحاولات
        csrfProtection, // حماية CSRF
        validateLogin, // التحقق من المدخلات
        handleValidationErrors, // معالجة أخطاء التحقق
        (req, res) => {
            const { email, password } = req.body;

            db.get('SELECT * FROM restaurants WHERE email = ?', [email], (err, restaurant) => {
                if (err) {
                    console.error('Database error:', err);
                    req.session.error = 'حدث خطأ في النظام';
                    return res.redirect('/admin/login');
                }

                if (!restaurant) {
                    req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
                    return res.redirect('/admin/login');
                }

                // التحقق من كلمة المرور
                bcrypt.compare(password, restaurant.password, (err, isMatch) => {
                    if (err) {
                        console.error('Bcrypt error:', err);
                        req.session.error = 'حدث خطأ في التحقق';
                        return res.redirect('/admin/login');
                    }

                    if (isMatch) {
                        // تسجيل دخول ناجح
                        req.session.restaurantId = restaurant.id;
                        req.session.restaurantName = restaurant.name;
                        req.session.restaurantSlug = restaurant.slug;

                        // تسجيل آخر دخول
                        db.run('UPDATE restaurants SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                            [restaurant.id], (err) => {
                                if (err) console.error('Error updating last login:', err);
                            }
                        );

                        res.redirect('/admin/dashboard');
                    } else {
                        req.session.error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
                        res.redirect('/admin/login');
                    }
                });
            });
        }
    );

    // صفحة التسجيل
    router.get('/register', csrfProtection, (req, res) => {
        res.render('auth/register', {
            title: 'إنشاء حساب جديد',
            error: req.session.error,
            csrfToken: req.csrfToken()
        });
        req.session.error = null;
    });

    // معالجة التسجيل مع الحماية
    router.post('/register',
        csrfProtection, // حماية CSRF
        validateRegister, // التحقق من المدخلات
        handleValidationErrors, // معالجة أخطاء التحقق
        async (req, res) => {
            const { name, slug, email, password, phone } = req.body;

            try {
                // التحقق من عدم تكرار البريد الإلكتروني
                db.get('SELECT id FROM restaurants WHERE email = ?', [email], async (err, existing) => {
                    if (err) {
                        console.error('Database error:', err);
                        req.session.error = 'حدث خطأ في النظام';
                        return res.redirect('/auth/register');
                    }

                    if (existing) {
                        req.session.error = 'البريد الإلكتروني مستخدم بالفعل';
                        return res.redirect('/auth/register');
                    }

                    // التحقق من عدم تكرار المعرف
                    db.get('SELECT id FROM restaurants WHERE slug = ?', [slug], async (err, existingSlug) => {
                        if (err) {
                            console.error('Database error:', err);
                            req.session.error = 'حدث خطأ في النظام';
                            return res.redirect('/auth/register');
                        }

                        if (existingSlug) {
                            req.session.error = 'المعرف مستخدم بالفعل، اختر معرف آخر';
                            return res.redirect('/auth/register');
                        }

                        try {
                            // تشفير كلمة المرور بشكل آمن
                            const hashedPassword = await bcrypt.hash(password, 12);

                            // إنشاء الحساب
                            db.run(`INSERT INTO restaurants (name, slug, email, password, phone, created_at) 
                                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                                [name, slug.toLowerCase(), email.toLowerCase(), hashedPassword, phone || null],
                                function(err) {
                                    if (err) {
                                        console.error('Insert error:', err);
                                        req.session.error = 'حدث خطأ في إنشاء الحساب';
                                        return res.redirect('/auth/register');
                                    }

                                    const restaurantId = this.lastID;

                                    // إنشاء أقسام افتراضية للمطعم الجديد
                                    const defaultCategories = [
                                        { name: 'المقبلات', name_en: 'Appetizers', order: 1 },
                                        { name: 'الأطباق الرئيسية', name_en: 'Main Dishes', order: 2 },
                                        { name: 'المشروبات', name_en: 'Beverages', order: 3 },
                                        { name: 'الحلويات', name_en: 'Desserts', order: 4 }
                                    ];

                                    let categoriesCreated = 0;
                                    defaultCategories.forEach(cat => {
                                        db.run(`INSERT INTO categories (restaurant_id, name, name_en, order_index) 
                                                VALUES (?, ?, ?, ?)`,
                                            [restaurantId, cat.name, cat.name_en, cat.order],
                                            (err) => {
                                                if (err) console.error('Error creating category:', err);
                                                categoriesCreated++;

                                                // بعد إنشاء جميع الأقسام
                                                if (categoriesCreated === defaultCategories.length) {
                                                    // تسجيل الدخول مباشرة
                                                    req.session.restaurantId = restaurantId;
                                                    req.session.restaurantName = name;
                                                    req.session.restaurantSlug = slug;

                                                    // إرسال بريد ترحيبي (اختياري)
                                                    // sendWelcomeEmail(email, name);

                                                    res.redirect('/admin/dashboard');
                                                }
                                            }
                                        );
                                    });
                                }
                            );
                        } catch (hashError) {
                            console.error('Hashing error:', hashError);
                            req.session.error = 'حدث خطأ في معالجة كلمة المرور';
                            res.redirect('/auth/register');
                        }
                    });
                });
            } catch (error) {
                console.error('Registration error:', error);
                req.session.error = 'حدث خطأ غير متوقع';
                res.redirect('/auth/register');
            }
        }
    );

    // تسجيل الخروج
    router.get('/logout', (req, res) => {
        const restaurantId = req.session.restaurantId;

        // تسجيل آخر خروج
        if (restaurantId) {
            db.run('UPDATE restaurants SET last_logout = CURRENT_TIMESTAMP WHERE id = ?',
                [restaurantId], (err) => {
                    if (err) console.error('Error updating last logout:', err);
                }
            );
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.redirect('/');
        });
    });

    // نسيت كلمة المرور (صفحة)
    router.get('/forgot-password', csrfProtection, (req, res) => {
        res.render('auth/forgot-password', {
            title: 'نسيت كلمة المرور',
            error: req.session.error,
            success: req.session.success,
            csrfToken: req.csrfToken()
        });
        req.session.error = null;
        req.session.success = null;
    });

    // معالجة نسيت كلمة المرور
    router.post('/forgot-password',
        csrfProtection,
        loginLimiter, // استخدام نفس الحد للحماية
        (req, res) => {
            const { email } = req.body;

            if (!email) {
                req.session.error = 'البريد الإلكتروني مطلوب';
                return res.redirect('/auth/forgot-password');
            }

            db.get('SELECT id, name FROM restaurants WHERE email = ?', [email.toLowerCase()], (err, restaurant) => {
                // لا نكشف إن كان البريد موجود أم لا (أمان)
                req.session.success = 'إذا كان البريد الإلكتروني موجود، سيتم إرسال رابط إعادة تعيين كلمة المرور';
                res.redirect('/auth/forgot-password');

                if (restaurant) {
                    // هنا يمكن إرسال بريد إلكتروني
                    // sendPasswordResetEmail(email, restaurant.name, resetToken);
                    console.log('Password reset requested for:', email);
                }
            });
        }
    );

    return router;
};
