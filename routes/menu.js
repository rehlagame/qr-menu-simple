const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // عرض القائمة للزبائن
    router.get('/:slug', async (req, res) => {
        const { slug } = req.params;
        const lang = res.locals.lang || 'ar';

        try {
            // جلب بيانات المطعم
            db.get(
                'SELECT * FROM restaurants WHERE slug = ?',
                [slug],
                (err, restaurant) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).render('error', {
                            title: 'خطأ',
                            message: 'حدث خطأ في قاعدة البيانات',
                            error: err,
                            lang,
                            t: res.locals.t,
                            isRTL: res.locals.isRTL
                        });
                    }

                    if (!restaurant) {
                        return res.status(404).render('404', {
                            title: 'المطعم غير موجود',
                            lang,
                            t: res.locals.t,
                            isRTL: res.locals.isRTL
                        });
                    }

                    // جلب الأقسام مع عدد المنتجات
                    db.all(
                        `SELECT c.*, 
                         (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_available = 1) as products_count
                         FROM categories c 
                         WHERE c.restaurant_id = ? 
                         ORDER BY c.order_index`,
                        [restaurant.id],
                        (err, categories) => {
                            if (err) {
                                console.error('Error fetching categories:', err);
                                return res.status(500).render('error', {
                                    title: 'خطأ',
                                    message: 'حدث خطأ في جلب الأقسام',
                                    error: err,
                                    lang,
                                    t: res.locals.t,
                                    isRTL: res.locals.isRTL
                                });
                            }

                            // جلب المنتجات
                            if (categories && categories.length > 0) {
                                const categoryIds = categories.map(c => c.id);
                                const placeholders = categoryIds.map(() => '?').join(',');

                                db.all(
                                    `SELECT * FROM products 
                                     WHERE category_id IN (${placeholders}) 
                                     AND is_available = 1 
                                     ORDER BY category_id, id`,
                                    categoryIds,
                                    (err, products) => {
                                        if (err) {
                                            console.error('Error fetching products:', err);
                                            products = [];
                                        }

                                        // تنظيم المنتجات حسب القسم
                                        const productsByCategory = {};
                                        if (products) {
                                            products.forEach(product => {
                                                if (!productsByCategory[product.category_id]) {
                                                    productsByCategory[product.category_id] = [];
                                                }
                                                productsByCategory[product.category_id].push(product);
                                            });
                                        }

                                        // إضافة إحصائية الزيارة
                                        db.addStatistic(restaurant.id, 'menu_views');

                                        res.render('menu/index', {
                                            title: restaurant.name,
                                            restaurant,
                                            categories,
                                            productsByCategory,
                                            lang,
                                            t: res.locals.t,
                                            isRTL: res.locals.isRTL,
                                            switchLanguageUrl: res.locals.switchLanguageUrl,
                                            layout: 'layouts/main'
                                        });
                                    }
                                );
                            } else {
                                // لا توجد أقسام
                                res.render('menu/index', {
                                    title: restaurant.name,
                                    restaurant,
                                    categories: [],
                                    productsByCategory: {},
                                    lang,
                                    t: res.locals.t,
                                    isRTL: res.locals.isRTL,
                                    switchLanguageUrl: res.locals.switchLanguageUrl,
                                    layout: 'layouts/main'
                                });
                            }
                        }
                    );
                }
            );
        } catch (error) {
            console.error('Error in menu route:', error);
            res.status(500).render('error', {
                title: 'خطأ',
                message: 'حدث خطأ في النظام',
                error: error,
                lang,
                t: res.locals.t,
                isRTL: res.locals.isRTL
            });
        }
    });

    // إعادة توجيه /demo إلى /menu/demo
    router.get('/demo', (req, res) => {
        res.redirect('/menu/demo');
    });

    return router;
};
