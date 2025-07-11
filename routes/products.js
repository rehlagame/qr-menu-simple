const express = require('express');
const router = express.Router();
const { upload, handleUpload } = require('../middleware/upload');

module.exports = (db, requireAuth) => {
    // عرض المنتجات
    router.get('/', requireAuth, (req, res) => {
        db.all(`SELECT p.*, c.name as category_name 
                FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE c.restaurant_id = ?`,
            [req.session.restaurantId], (err, products) => {

                db.all('SELECT * FROM categories WHERE restaurant_id = ?',
                    [req.session.restaurantId], (err, categories) => {
                        res.render('admin/products', {
                            title: 'إدارة المنتجات',
                            products: products || [],
                            categories: categories || [],
                            restaurantName: req.session.restaurantName,
                            success: req.session.success,
                            error: req.session.error
                        });
                        req.session.success = req.session.error = null;
                    });
            });
    });

    // إضافة منتج جديد
    router.post('/add', requireAuth, upload.single('image'), handleUpload('products'), (req, res) => {
        const { name, description, price, category_id } = req.body;
        const image = req.uploadedImageUrl || null;

        db.run(`INSERT INTO products (category_id, name, description, price, image, is_available) 
                VALUES (?, ?, ?, ?, ?, 1)`,
            [category_id, name, description, price, image], (err) => {
                if (err) {
                    req.session.error = 'حدث خطأ في إضافة المنتج';
                } else {
                    req.session.success = 'تم إضافة المنتج بنجاح';
                }
                res.redirect('/admin/products');
            });
    });

    // عرض بيانات المنتج للتعديل
    router.get('/get/:id', requireAuth, (req, res) => {
        db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, product) => {
            if (err || !product) {
                return res.status(404).json({ error: 'المنتج غير موجود' });
            }
            res.json(product);
        });
    });

    // تحديث المنتج
    router.post('/update/:id', requireAuth, upload.single('image'), handleUpload('products'), (req, res) => {
        const { name, description, price, category_id } = req.body;
        const productId = req.params.id;

        // التحقق من وجود المنتج أولاً
        db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
            if (err || !product) {
                req.session.error = 'المنتج غير موجود';
                return res.redirect('/admin/products');
            }

            let query = 'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?';
            let params = [name, description, price, category_id];

            // إذا تم رفع صورة جديدة
            if (req.uploadedImageUrl) {
                query += ', image = ?';
                params.push(req.uploadedImageUrl);
            }

            query += ' WHERE id = ?';
            params.push(productId);

            db.run(query, params, (err) => {
                if (err) {
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
        db.run('DELETE FROM products WHERE id = ?', [req.params.id], (err) => {
            if (err) {
                req.session.error = 'حدث خطأ في حذف المنتج';
            } else {
                req.session.success = 'تم حذف المنتج بنجاح';
            }
            res.redirect('/admin/products');
        });
    });

    // تبديل حالة المنتج (متوفر/غير متوفر)
    router.post('/toggle/:id', requireAuth, (req, res) => {
        db.run(`UPDATE products SET is_available = CASE 
                WHEN is_available = 1 THEN 0 ELSE 1 END 
                WHERE id = ?`, [req.params.id], (err) => {
            if (err) {
                req.session.error = 'حدث خطأ في تحديث حالة المنتج';
            } else {
                req.session.success = 'تم تحديث حالة المنتج بنجاح';
            }
            res.redirect('/admin/products');
        });
    });

    return router;
};