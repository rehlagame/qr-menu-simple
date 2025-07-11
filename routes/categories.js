const express = require('express');
const router = express.Router();

module.exports = (db, requireAuth) => {
    // عرض الأقسام مع عدد المنتجات
    router.get('/', requireAuth, (req, res) => {
        db.all(`SELECT c.*, COUNT(p.id) as product_count 
                FROM categories c 
                LEFT JOIN products p ON c.id = p.category_id 
                WHERE c.restaurant_id = ? 
                GROUP BY c.id 
                ORDER BY c.order_index`,
            [req.session.restaurantId], (err, categories) => {
                res.render('admin/categories', {
                    title: 'إدارة الأقسام',
                    categories: categories || [],
                    restaurantName: req.session.restaurantName,
                    success: req.session.success,
                    error: req.session.error
                });
                req.session.success = req.session.error = null;
            });
    });

    // إضافة قسم جديد
    router.post('/add', requireAuth, (req, res) => {
        const { name, order_index } = req.body;

        db.run('INSERT INTO categories (restaurant_id, name, order_index) VALUES (?, ?, ?)',
            [req.session.restaurantId, name, order_index || 0], (err) => {
                if (err) {
                    req.session.error = 'حدث خطأ في إضافة القسم';
                } else {
                    req.session.success = 'تم إضافة القسم بنجاح';
                }
                res.redirect('/admin/categories');
            });
    });

    // حذف قسم
    router.post('/delete/:id', requireAuth, (req, res) => {
        db.run('DELETE FROM categories WHERE id = ? AND restaurant_id = ?',
            [req.params.id, req.session.restaurantId], (err) => {
                if (err) {
                    req.session.error = 'حدث خطأ في حذف القسم';
                } else {
                    req.session.success = 'تم حذف القسم بنجاح';
                }
                res.redirect('/admin/categories');
            });
    });

    // جلب بيانات القسم للتعديل
    router.get('/get/:id', requireAuth, (req, res) => {
        db.get(`SELECT * FROM categories WHERE id = ? AND restaurant_id = ?`,
            [req.params.id, req.session.restaurantId], (err, category) => {
                if (err || !category) {
                    return res.status(404).json({ error: 'القسم غير موجود' });
                }
                res.json(category);
            });
    });

    // تحديث القسم
    router.post('/update/:id', requireAuth, (req, res) => {
        const { name, order_index } = req.body;
        const categoryId = req.params.id;

        db.run(`UPDATE categories SET name = ?, order_index = ? 
                WHERE id = ? AND restaurant_id = ?`,
            [name, order_index || 0, categoryId, req.session.restaurantId], (err) => {
                if (err) {
                    req.session.error = 'حدث خطأ في تحديث القسم';
                } else {
                    req.session.success = 'تم تحديث القسم بنجاح';
                }
                res.redirect('/admin/categories');
            });
    });

    return router;
};