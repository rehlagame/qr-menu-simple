const express = require('express');
const router = express.Router();
const { upload, handleUpload } = require('../middleware/upload');

module.exports = (db, requireAuth) => {
    // تسجيل للتأكد من تحميل الملف
    console.log('✅ Products routes loaded successfully');

    // صفحة عرض المنتجات
    router.get('/', requireAuth, (req, res) => {
        const restaurantId = req.session.restaurantId;
        
        // جلب المنتجات مع أسماء الأقسام
        db.all(`SELECT p.*, c.name as category_name 
                FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE c.restaurant_id = ?
                ORDER BY c.order_index, p.order_index, p.id`,
            [restaurantId], (err, products) => {
                if (err) {
                    console.error('Error fetching products:', err);
                    products = [];
                }

                // جلب الأقسام للفلترة
                db.all('SELECT * FROM categories WHERE restaurant_id = ? ORDER BY order_index',
                    [restaurantId], (err, categories) => {
                        if (err) {
                            console.error('Error fetching categories:', err);
                            categories = [];
                        }

                        res.render('admin/products', {
                            title: 'إدارة المنتجات',
                            products: products || [],
                            categories: categories || [],
                            restaurantName: req.session.restaurantName,
                            success: req.session.success,
                            error: req.session.error,
                            lang: res.locals.lang,
                            t: res.locals.t,
                            isRTL: res.locals.isRTL
                        });
                        
                        // مسح الرسائل بعد العرض
                        req.session.success = null;
                        req.session.error = null;
                    });
            });
    });

    // إضافة منتج جديد - GET (عرض النموذج)
    router.get('/add', requireAuth, (req, res) => {
        const restaurantId = req.session.restaurantId;
        
        // جلب الأقسام للقائمة المنسدلة
        db.all('SELECT * FROM categories WHERE restaurant_id = ? ORDER BY order_index',
            [restaurantId], (err, categories) => {
                if (err || !categories || categories.length === 0) {
                    req.session.error = 'يجب إضافة قسم أولاً قبل إضافة المنتجات';
                    return res.redirect('/admin/categories');
                }

                res.render('admin/add-product', {
                    title: 'إضافة منتج جديد',
                    categories: categories,
                    restaurantName: req.session.restaurantName,
                    lang: res.locals.lang,
                    t: res.locals.t,
                    isRTL: res.locals.isRTL
                });
            });
    });

    // إضافة منتج جديد - POST (معالجة النموذج)
    router.post('/add', requireAuth, upload.single('image'), handleUpload('products'), async (req, res) => {
        console.log('=== ADD PRODUCT REQUEST ===');
        console.log('Body:', req.body);
        console.log('File:', req.file);
        console.log('Uploaded Image URL:', req.uploadedImageUrl);

        try {
            const { name, name_en, description, description_en, price, category_id } = req.body;
            const restaurantId = req.session.restaurantId;

            // التحقق من البيانات المطلوبة
            if (!name || !price || !category_id) {
                req.session.error = 'يرجى ملء جميع الحقول المطلوبة';
                return res.redirect('/admin/products/add');
            }

            // التحقق من أن القسم ينتمي للمطعم
            db.get('SELECT * FROM categories WHERE id = ? AND restaurant_id = ?',
                [category_id, restaurantId], (err, category) => {
                    if (err || !category) {
                        console.error('Invalid category:', err);
                        req.session.error = 'القسم المحدد غير صالح';
                        return res.redirect('/admin/products/add');
                    }

                    // إعداد بيانات المنتج
                    const productData = {
                        category_id: parseInt(category_id),
                        name: name.trim(),
                        name_en: name_en ? name_en.trim() : null,
                        description: description ? description.trim() : null,
                        description_en: description_en ? description_en.trim() : null,
                        price: parseFloat(price),
                        image: req.uploadedImageUrl || null,
                        is_available: 1,
                        is_new: req.body.is_new ? 1 : 0,
                        order_index: parseInt(req.body.order_index) || 0
                    };

                    console.log('Inserting product:', productData);

                    // إدخال المنتج في قاعدة البيانات
                    db.run(`INSERT INTO products (
                            category_id, name, name_en, description, description_en, 
                            price, image, is_available, is_new, order_index, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [
                            productData.category_id,
                            productData.name,
                            productData.name_en,
                            productData.description,
                            productData.description_en,
                            productData.price,
                            productData.image,
                            productData.is_available,
                            productData.is_new,
                            productData.order_index
                        ],
                        function(err) {
                            if (err) {
                                console.error('Database error:', err);
                                req.session.error = 'حدث خطأ في إضافة المنتج: ' + err.message;
                                return res.redirect('/admin/products/add');
                            }

                            console.log('Product added successfully with ID:', this.lastID);
                            req.session.success = 'تم إضافة المنتج بنجاح';
                            res.redirect('/admin/products');
                        }
                    );
                });
        } catch (error) {
            console.error('Unexpected error:', error);
            req.session.error = 'حدث خطأ غير متوقع';
            res.redirect('/admin/products/add');
        }
    });

    // عرض بيانات المنتج للتعديل (API)
    router.get('/get/:id', requireAuth, (req, res) => {
        const productId = req.params.id;
        const restaurantId = req.session.restaurantId;

        // التأكد من أن المنتج ينتمي للمطعم
        db.get(`SELECT p.* FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE p.id = ? AND c.restaurant_id = ?`,
            [productId, restaurantId], (err, product) => {
                if (err) {
                    console.error('Error fetching product:', err);
                    return res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
                }
                
                if (!product) {
                    return res.status(404).json({ error: 'المنتج غير موجود' });
                }
                
                res.json(product);
            });
    });

    // تحديث المنتج
    router.post('/update/:id', requireAuth, upload.single('image'), handleUpload('products'), (req, res) => {
        const productId = req.params.id;
        const restaurantId = req.session.restaurantId;
        const { name, name_en, description, description_en, price, category_id } = req.body;

        console.log('=== UPDATE PRODUCT REQUEST ===');
        console.log('Product ID:', productId);
        console.log('Body:', req.body);

        // التحقق من أن المنتج ينتمي للمطعم
        db.get(`SELECT p.* FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE p.id = ? AND c.restaurant_id = ?`,
            [productId, restaurantId], (err, product) => {
                if (err || !product) {
                    req.session.error = 'المنتج غير موجود';
                    return res.redirect('/admin/products');
                }

                // بناء استعلام التحديث
                let updateFields = [
                    'name = ?',
                    'name_en = ?',
                    'description = ?',
                    'description_en = ?',
                    'price = ?',
                    'category_id = ?',
                    'updated_at = CURRENT_TIMESTAMP'
                ];
                
                let params = [
                    name.trim(),
                    name_en ? name_en.trim() : null,
                    description ? description.trim() : null,
                    description_en ? description_en.trim() : null,
                    parseFloat(price),
                    parseInt(category_id)
                ];

                // إضافة الصورة إذا تم رفع صورة جديدة
                if (req.uploadedImageUrl) {
                    updateFields.push('image = ?');
                    params.push(req.uploadedImageUrl);
                }

                // إضافة معرف المنتج في النهاية
                params.push(productId);

                const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;

                db.run(query, params, (err) => {
                    if (err) {
                        console.error('Update error:', err);
                        req.session.error = 'حدث خطأ في تحديث المنتج';
                    } else {
                        req.session.success = 'تم تحديث المنتج بنجاح';
                    }
                    res.redirect('/admin/products');
                });
            });
    });

    // حذف منتج
    router.post('/delete/:id', requireAuth, (req, res) => {
        const productId = req.params.id;
        const restaurantId = req.session.restaurantId;

        // التحقق من أن المنتج ينتمي للمطعم
        db.get(`SELECT p.*, c.restaurant_id FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE p.id = ? AND c.restaurant_id = ?`,
            [productId, restaurantId], (err, product) => {
                if (err || !product) {
                    req.session.error = 'المنتج غير موجود';
                    return res.redirect('/admin/products');
                }

                // حذف المنتج
                db.run('DELETE FROM products WHERE id = ?', [productId], (err) => {
                    if (err) {
                        console.error('Delete error:', err);
                        req.session.error = 'حدث خطأ في حذف المنتج';
                    } else {
                        req.session.success = 'تم حذف المنتج بنجاح';
                        
                        // حذف الصورة من التخزين إذا كانت موجودة
                        if (product.image) {
                            // يمكنك إضافة كود حذف الصورة هنا
                            console.log('Image to delete:', product.image);
                        }
                    }
                    res.redirect('/admin/products');
                });
            });
    });

    // تبديل حالة المنتج (متوفر/غير متوفر)
    router.post('/toggle/:id', requireAuth, (req, res) => {
        const productId = req.params.id;
        const restaurantId = req.session.restaurantId;

        // التحقق والتبديل
        db.get(`SELECT p.*, c.restaurant_id FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE p.id = ? AND c.restaurant_id = ?`,
            [productId, restaurantId], (err, product) => {
                if (err || !product) {
                    req.session.error = 'المنتج غير موجود';
                    return res.redirect('/admin/products');
                }

                const newStatus = product.is_available ? 0 : 1;
                const statusText = newStatus ? 'متوفر' : 'غير متوفر';

                db.run('UPDATE products SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newStatus, productId], (err) => {
                        if (err) {
                            console.error('Toggle error:', err);
                            req.session.error = 'حدث خطأ في تحديث حالة المنتج';
                        } else {
                            req.session.success = `تم تحديث حالة المنتج إلى: ${statusText}`;
                        }
                        res.redirect('/admin/products');
                    });
            });
    });

    // مسار اختباري للتحقق من عمل routes
    router.get('/test', (req, res) => {
        res.json({ 
            status: 'Products routes working!',
            authenticated: !!req.session.restaurantId,
            restaurantId: req.session.restaurantId
        });
    });

    return router;
};
