const express = require('express');
const router = express.Router();
const { translateCategory, translateProduct } = require('../middleware/language');

module.exports = (db) => {
    // عرض القائمة العامة
    router.get('/:slug', (req, res) => {
        // سطور التشخيص لمعرفة مصدر المشكلة
        console.log('=== Language Debug Info ===');
        console.log('Current language:', res.locals.lang);
        console.log('Language from query:', req.query.lang);
        console.log('Language from cookie:', req.cookies?.lang);
        console.log('Language from session:', req.session?.lang);
        console.log('Is RTL:', res.locals.isRTL);
        console.log('==========================');

        db.get('SELECT * FROM restaurants WHERE slug = ?', [req.params.slug], (err, restaurant) => {
            if (err || !restaurant) {
                return res.status(404).render('404', {
                    title: res.locals.t?.pageNotFound || 'الصفحة غير موجودة',
                    lang: res.locals.lang || 'ar',
                    t: res.locals.t || {},
                    isRTL: res.locals.isRTL !== false
                });
            }

            // إضافة إحصائية مشاهدة
            if (typeof db.addStatistic === 'function') {
                db.addStatistic(restaurant.id, 'views');
            }

            // جلب الأقسام والمنتجات
            db.all(`SELECT c.*,
                           (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_available = 1) as product_count
                    FROM categories c
                    WHERE c.restaurant_id = ?
                    ORDER BY c.order_index`,
                [restaurant.id], (err, categories) => {

                    if (err) {
                        console.error('Error fetching categories:', err);
                        return res.status(500).render('404', {
                            title: res.locals.t?.error || 'حدث خطأ',
                            lang: res.locals.lang || 'ar',
                            t: res.locals.t || {},
                            isRTL: res.locals.isRTL !== false
                        });
                    }

                    // جلب المنتجات لكل قسم
                    let categoriesProcessed = 0;
                    const categoriesWithProducts = [];

                    if (!categories || categories.length === 0) {
                        return res.render('menu/view', {
                            title: restaurant.name,
                            restaurant: restaurant,
                            categories: [],
                            lang: res.locals.lang || 'ar',
                            t: res.locals.t || {},
                            isRTL: res.locals.isRTL !== false,
                            switchLanguageUrl: res.locals.switchLanguageUrl || ((newLang) => `?lang=${newLang}`)
                        });
                    }

                    categories.forEach((category, index) => {
                        db.all(`SELECT * FROM products
                                WHERE category_id = ? AND is_available = 1
                                ORDER BY order_index, id`,
                            [category.id], (err, products) => {

                                // ترجمة اسم القسم
                                const translatedCategory = {
                                    ...category,
                                    displayName: translateCategory(category, res.locals.lang || 'ar'),
                                    products: []
                                };

                                // ترجمة المنتجات
                                if (products && products.length > 0) {
                                    translatedCategory.products = products.map(product =>
                                        translateProduct(product, res.locals.lang || 'ar')
                                    );
                                }

                                categoriesWithProducts[index] = translatedCategory;
                                categoriesProcessed++;

                                // عندما تكتمل جميع الاستعلامات
                                if (categoriesProcessed === categories.length) {
                                    // ترتيب الأقسام حسب order_index
                                    categoriesWithProducts.sort((a, b) => a.order_index - b.order_index);

                                    // ترجمة معلومات المطعم إذا كانت متوفرة
                                    const currentLang = res.locals.lang || 'ar';
                                    const translatedRestaurant = {
                                        ...restaurant,
                                        displayName: currentLang === 'en' && restaurant.name_en
                                            ? restaurant.name_en
                                            : restaurant.name,
                                        displayAddress: currentLang === 'en' && restaurant.address_en
                                            ? restaurant.address_en
                                            : restaurant.address
                                    };

                                    // تسجيل معلومات الترجمة للتشخيص
                                    console.log('Restaurant name:', restaurant.name);
                                    console.log('Restaurant name_en:', restaurant.name_en);
                                    console.log('Display name:', translatedRestaurant.displayName);
                                    console.log('Using language:', currentLang);

                                    res.render('menu/view', {
                                        title: translatedRestaurant.displayName,
                                        restaurant: translatedRestaurant,
                                        categories: categoriesWithProducts,
                                        lang: currentLang,
                                        t: res.locals.t || {},
                                        isRTL: currentLang === 'ar',
                                        switchLanguageUrl: res.locals.switchLanguageUrl || ((newLang) => `?lang=${newLang}`),
                                        translate: res.locals.translate || ((key) => key)
                                    });
                                }
                            });
                    });
                });
        });
    });

    // معالج خاص للغة - طريقة بديلة
    router.get('/:slug/lang/:lang', (req, res) => {
        const { slug, lang } = req.params;

        console.log('Language switch requested:', lang);

        // التحقق من صحة اللغة
        if (['ar', 'en'].includes(lang)) {
            // تعيين اللغة في الجلسة والكوكيز
            req.session.lang = lang;
            res.cookie('lang', lang, {
                maxAge: 365 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: 'lax'
            });

            console.log('Language set to:', lang);
            console.log('Cookie set:', res.getHeaders()['set-cookie']);
        }

        // إعادة التوجيه للقائمة مع معامل اللغة
        res.redirect(`/menu/${slug}?lang=${lang}`);
    });

    // API endpoint للحصول على القائمة بصيغة JSON
    router.get('/api/:slug', (req, res) => {
        const lang = req.query.lang || req.cookies?.lang || req.session?.lang || 'ar';

        console.log('API Language:', lang);

        db.get('SELECT * FROM restaurants WHERE slug = ?', [req.params.slug], (err, restaurant) => {
            if (err || !restaurant) {
                return res.status(404).json({ error: 'Restaurant not found' });
            }

            db.all(`SELECT c.*,
                           (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_available = 1) as product_count
                    FROM categories c
                    WHERE c.restaurant_id = ?
                    ORDER BY c.order_index`,
                [restaurant.id], (err, categories) => {

                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }

                    let categoriesProcessed = 0;
                    const categoriesWithProducts = [];

                    if (!categories || categories.length === 0) {
                        return res.json({
                            restaurant: restaurant,
                            categories: [],
                            language: lang
                        });
                    }

                    categories.forEach((category, index) => {
                        db.all(`SELECT * FROM products
                                WHERE category_id = ? AND is_available = 1
                                ORDER BY order_index, id`,
                            [category.id], (err, products) => {

                                const translatedCategory = {
                                    ...category,
                                    name: translateCategory(category, lang),
                                    displayName: translateCategory(category, lang),
                                    products: products ? products.map(p => translateProduct(p, lang)) : []
                                };

                                categoriesWithProducts[index] = translatedCategory;
                                categoriesProcessed++;

                                if (categoriesProcessed === categories.length) {
                                    categoriesWithProducts.sort((a, b) => a.order_index - b.order_index);

                                    res.json({
                                        restaurant: {
                                            ...restaurant,
                                            name: lang === 'en' && restaurant.name_en
                                                ? restaurant.name_en
                                                : restaurant.name,
                                            displayName: lang === 'en' && restaurant.name_en
                                                ? restaurant.name_en
                                                : restaurant.name
                                        },
                                        categories: categoriesWithProducts,
                                        language: lang
                                    });
                                }
                            });
                    });
                });
        });
    });

    // صفحة العرض التجريبي - إزالة التكرار
    router.get('/demo', (req, res) => {
        res.redirect('/menu/demo');
    });

    return router;
};