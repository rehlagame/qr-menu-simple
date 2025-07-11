const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { upload, handleUpload } = require('../middleware/upload');

module.exports = (db, requireAuth) => {
    // لوحة التحكم
    router.get('/dashboard', requireAuth, (req, res) => {
        // جلب الإحصائيات الحقيقية
        const restaurantId = req.session.restaurantId;

        // جلب عدد الأقسام
        db.get('SELECT COUNT(*) as count FROM categories WHERE restaurant_id = ?',
            [restaurantId], (err, categoryCount) => {

                // جلب عدد المنتجات
                db.get(`SELECT COUNT(*) as count FROM products p 
                        JOIN categories c ON p.category_id = c.id 
                        WHERE c.restaurant_id = ?`,
                    [restaurantId], (err, productCount) => {

                        // جلب الإحصائيات إذا كانت الدالة موجودة
                        let stats = {
                            categories: categoryCount ? categoryCount.count : 0,
                            products: productCount ? productCount.count : 0,
                            views: 0,
                            scans: 0
                        };

                        if (typeof db.getRestaurantStats === 'function') {
                            db.getRestaurantStats(restaurantId, (err, restaurantStats) => {
                                if (!err && restaurantStats) {
                                    stats.views = restaurantStats.total.views || 0;
                                    stats.scans = restaurantStats.total.scans || 0;
                                }

                                renderDashboard();
                            });
                        } else {
                            renderDashboard();
                        }

                        function renderDashboard() {
                            res.render('admin/dashboard', {
                                title: res.locals.t.dashboard,
                                restaurantName: req.session.restaurantName,
                                stats: stats,
                                lang: res.locals.lang,
                                t: res.locals.t,
                                isRTL: res.locals.isRTL
                            });
                        }
                    });
            });
    });

    // صفحة QR Code
    router.get('/qr', requireAuth, (req, res) => {
        db.get('SELECT * FROM restaurants WHERE id = ?', [req.session.restaurantId], (err, restaurant) => {
            if (err || !restaurant) {
                return res.redirect('/admin/dashboard');
            }

            const menuUrl = `${req.protocol}://${req.get('host')}/menu/${restaurant.slug}`;

            res.render('admin/qr', {
                title: 'كود QR',
                restaurantName: req.session.restaurantName,
                restaurant: restaurant,
                menuUrl: menuUrl,
                lang: res.locals.lang,
                t: res.locals.t,
                isRTL: res.locals.isRTL,
                switchLanguageUrl: res.locals.switchLanguageUrl
            });
        });
    });

    // صفحة الإعدادات - إزالة التكرار وإصلاح الكود
    router.get('/settings', requireAuth, (req, res) => {
        db.get('SELECT * FROM restaurants WHERE id = ?', [req.session.restaurantId], (err, restaurant) => {
            if (err || !restaurant) {
                console.error('Error fetching restaurant:', err);
                return res.redirect('/admin/dashboard');
            }

            // إضافة الحقول الناقصة إذا لم تكن موجودة
            restaurant.name_en = restaurant.name_en || '';
            restaurant.address_en = restaurant.address_en || '';

            res.render('admin/settings', {
                title: res.locals.t.settings,
                restaurant: restaurant,
                restaurantName: req.session.restaurantName,
                success: req.session.success,
                error: req.session.error,
                menuUrl: `${req.protocol}://${req.get('host')}/menu/${restaurant.slug}`,
                lang: res.locals.lang,
                t: res.locals.t,
                isRTL: res.locals.isRTL,
                switchLanguageUrl: res.locals.switchLanguageUrl,
                req: req // تمرير req للاستخدام في الـ view
            });

            req.session.success = null;
            req.session.error = null;
        });
    });

    // تحديث إعدادات المطعم
    router.post('/settings/update', requireAuth, upload.single('logo'), handleUpload('logos'), async (req, res) => {
        const { name, name_en, phone, address, address_en } = req.body;

        try {
            let updateQuery = `UPDATE restaurants SET 
                              name = ?, name_en = ?, phone = ?, address = ?, address_en = ?, 
                              updated_at = CURRENT_TIMESTAMP`;
            let params = [name, name_en || null, phone || null, address || null, address_en || null];

            // إذا تم رفع شعار جديد
            if (req.uploadedImageUrl) {
                updateQuery += ', logo = ?';
                params.push(req.uploadedImageUrl);
            }

            updateQuery += ' WHERE id = ?';
            params.push(req.session.restaurantId);

            db.run(updateQuery, params, (err) => {
                if (err) {
                    console.error('Error updating restaurant:', err);
                    req.session.error = res.locals.t.error || 'حدث خطأ في تحديث البيانات';
                } else {
                    req.session.success = res.locals.t.success || 'تم تحديث البيانات بنجاح';
                    req.session.restaurantName = name; // تحديث اسم المطعم في الجلسة
                }
                res.redirect('/admin/settings');
            });
        } catch (error) {
            console.error('Update error:', error);
            req.session.error = res.locals.t.error || 'حدث خطأ في تحديث البيانات';
            res.redirect('/admin/settings');
        }
    });

    // تغيير كلمة المرور
    router.post('/settings/change-password', requireAuth, (req, res) => {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // التحقق من تطابق كلمة المرور الجديدة
        if (newPassword !== confirmPassword) {
            req.session.error = 'كلمة المرور الجديدة غير متطابقة';
            return res.redirect('/admin/settings');
        }

        // التحقق من طول كلمة المرور
        if (newPassword.length < 6) {
            req.session.error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
            return res.redirect('/admin/settings');
        }

        // جلب كلمة المرور الحالية
        db.get('SELECT password FROM restaurants WHERE id = ?',
            [req.session.restaurantId], (err, restaurant) => {
                if (err || !restaurant) {
                    req.session.error = 'حدث خطأ في النظام';
                    return res.redirect('/admin/settings');
                }

                // التحقق من كلمة المرور الحالية
                bcrypt.compare(currentPassword, restaurant.password, (err, isMatch) => {
                    if (err || !isMatch) {
                        req.session.error = 'كلمة المرور الحالية غير صحيحة';
                        return res.redirect('/admin/settings');
                    }

                    // تشفير كلمة المرور الجديدة
                    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                        if (err) {
                            req.session.error = 'حدث خطأ في تشفير كلمة المرور';
                            return res.redirect('/admin/settings');
                        }

                        // تحديث كلمة المرور
                        db.run('UPDATE restaurants SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [hashedPassword, req.session.restaurantId], (err) => {
                                if (err) {
                                    req.session.error = 'حدث خطأ في تغيير كلمة المرور';
                                } else {
                                    req.session.success = 'تم تغيير كلمة المرور بنجاح';
                                }
                                res.redirect('/admin/settings');
                            });
                    });
                });
            });
    });

    // صفحة الإحصائيات التفصيلية
    router.get('/statistics', requireAuth, (req, res) => {
        const period = req.query.period || 'month'; // day, week, month, year

        if (typeof db.getRestaurantStats === 'function') {
            db.getRestaurantStats(req.session.restaurantId, (err, stats) => {
                res.render('admin/statistics', {
                    title: 'الإحصائيات',
                    restaurantName: req.session.restaurantName,
                    stats: stats || { today: {}, month: {}, total: {} },
                    period: period,
                    lang: res.locals.lang,
                    t: res.locals.t,
                    isRTL: res.locals.isRTL
                });
            });
        } else {
            res.render('admin/statistics', {
                title: 'الإحصائيات',
                restaurantName: req.session.restaurantName,
                stats: { today: { views: 0, scans: 0 }, month: { views: 0, scans: 0 }, total: { views: 0, scans: 0 } },
                period: period,
                lang: res.locals.lang,
                t: res.locals.t,
                isRTL: res.locals.isRTL
            });
        }
    });

    // API endpoint للإحصائيات
    router.get('/api/stats', requireAuth, (req, res) => {
        if (typeof db.getRestaurantStats === 'function') {
            db.getRestaurantStats(req.session.restaurantId, (err, stats) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json(stats);
            });
        } else {
            res.json({
                today: { views: 0, scans: 0 },
                month: { views: 0, scans: 0 },
                total: { views: 0, scans: 0 }
            });
        }
    });

    return router;
};