const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// إنشاء أو فتح قاعدة البيانات
const db = new sqlite3.Database(path.join(__dirname, 'qrmenu.db'), (err) => {
    if (err) {
        console.error('❌ خطأ في فتح قاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    }
});

// تفعيل Foreign Keys
db.run('PRAGMA foreign_keys = ON');

// إنشاء الجداول والبيانات
db.serialize(() => {
    // جدول المطاعم
    db.run(`CREATE TABLE IF NOT EXISTS restaurants (
                                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                       name TEXT NOT NULL,
                                                       slug TEXT UNIQUE NOT NULL,
                                                       email TEXT UNIQUE NOT NULL,
                                                       password TEXT NOT NULL,
                                                       phone TEXT,
                                                       address TEXT,
                                                       logo TEXT,
                                                       is_active INTEGER DEFAULT 1,
                                                       last_login DATETIME,
                                                       last_logout DATETIME,
                                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
        if (err) {
            console.error('❌ خطأ في إنشاء جدول المطاعم:', err.message);
        } else {
            console.log('✅ جدول المطاعم جاهز');

            // إضافة الأعمدة الجديدة للجداول الموجودة
            db.run(`ALTER TABLE restaurants ADD COLUMN last_login DATETIME`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // العمود موجود بالفعل أو خطأ آخر
                }
            });

            db.run(`ALTER TABLE restaurants ADD COLUMN last_logout DATETIME`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // العمود موجود بالفعل أو خطأ آخر
                }
            });
        }
    });

    // جدول الأقسام
    db.run(`CREATE TABLE IF NOT EXISTS categories (
                                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                      restaurant_id INTEGER NOT NULL,
                                                      name TEXT NOT NULL,
                                                      name_en TEXT,
                                                      order_index INTEGER DEFAULT 0,
                                                      is_active INTEGER DEFAULT 1,
                                                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                      FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
        )`, (err) => {
        if (err) {
            console.error('❌ خطأ في إنشاء جدول الأقسام:', err.message);
        } else {
            console.log('✅ جدول الأقسام جاهز');
        }
    });

    // جدول المنتجات
    db.run(`CREATE TABLE IF NOT EXISTS products (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    category_id INTEGER NOT NULL,
                                                    name TEXT NOT NULL,
                                                    name_en TEXT,
                                                    description TEXT,
                                                    description_en TEXT,
                                                    price REAL NOT NULL,
                                                    image TEXT,
                                                    is_available INTEGER DEFAULT 1,
                                                    is_new INTEGER DEFAULT 0,
                                                    order_index INTEGER DEFAULT 0,
                                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        )`, (err) => {
        if (err) {
            console.error('❌ خطأ في إنشاء جدول المنتجات:', err.message);
        } else {
            console.log('✅ جدول المنتجات جاهز');

            // إضافة عمود is_new للجداول الموجودة
            db.run(`ALTER TABLE products ADD COLUMN is_new INTEGER DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // العمود موجود بالفعل أو خطأ آخر
                }
            });
        }
    });

    // جدول الإحصائيات
    db.run(`CREATE TABLE IF NOT EXISTS statistics (
                                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                      restaurant_id INTEGER NOT NULL,
                                                      date DATE NOT NULL,
                                                      views INTEGER DEFAULT 0,
                                                      scans INTEGER DEFAULT 0,
                                                      UNIQUE(restaurant_id, date),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
        )`, (err) => {
        if (err) {
            console.error('❌ خطأ في إنشاء جدول الإحصائيات:', err.message);
        } else {
            console.log('✅ جدول الإحصائيات جاهز');
        }
    });

    // إنشاء الفهارس لتحسين الأداء
    db.run('CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug)');
    db.run('CREATE INDEX IF NOT EXISTS idx_restaurants_email ON restaurants(email)');
    db.run('CREATE INDEX IF NOT EXISTS idx_statistics_restaurant_date ON statistics(restaurant_id, date)');

    // إضافة البيانات التجريبية
    setTimeout(() => {
        seedDemoData();
    }, 1000);
});

// دالة لإضافة البيانات التجريبية
function seedDemoData() {
    // التحقق من وجود المطعم التجريبي
    db.get("SELECT id FROM restaurants WHERE slug = 'demo'", (err, restaurant) => {
        if (!restaurant) {
            const demoPassword = bcrypt.hashSync('demo123', 10);

            // إضافة مطعم تجريبي
            db.run(`INSERT INTO restaurants (name, slug, email, password, phone, address, logo)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['مطعم الوجبات السريعة', 'demo', 'demo@qrmenu.com', demoPassword, '+965 12345678', 'الكويت - حولي', '/images/demo-logo.png'],
                function(err) {
                    if (err) {
                        console.error('❌ خطأ في إضافة المطعم التجريبي:', err.message);
                        return;
                    }

                    console.log('✅ تم إضافة المطعم التجريبي');
                    const restaurantId = this.lastID;

                    // إضافة الأقسام التجريبية
                    const categories = [
                        { name: 'المقبلات', name_en: 'Appetizers', order: 1 },
                        { name: 'البرجر', name_en: 'Burgers', order: 2 },
                        { name: 'البيتزا', name_en: 'Pizza', order: 3 },
                        { name: 'المشروبات', name_en: 'Beverages', order: 4 },
                        { name: 'الحلويات', name_en: 'Desserts', order: 5 }
                    ];

                    categories.forEach((cat, index) => {
                        db.run(`INSERT INTO categories (restaurant_id, name, name_en, order_index)
                                VALUES (?, ?, ?, ?)`,
                            [restaurantId, cat.name, cat.name_en, cat.order],
                            function(err) {
                                if (!err) {
                                    // إضافة منتجات تجريبية لكل قسم
                                    addDemoProducts(this.lastID, index + 1);
                                }
                            }
                        );
                    });
                }
            );
        } else {
            console.log('ℹ️ المطعم التجريبي موجود بالفعل');
        }
    });
}

// دالة لإضافة المنتجات التجريبية
function addDemoProducts(categoryId, categoryIndex) {
    const products = {
        1: [ // المقبلات
            { name: 'سلطة سيزر', price: 2.500, desc: 'خس طازج مع صلصة السيزر والخبز المحمص', isNew: true },
            { name: 'حلقات البصل', price: 1.750, desc: 'حلقات بصل مقرمشة مع صلصة خاصة' },
            { name: 'أصابع الموزاريلا', price: 2.250, desc: '6 قطع من الموزاريلا المقلية' },
            { name: 'سمبوسة خضار', price: 1.500, desc: 'سمبوسة محشوة بالخضار الطازجة', isNew: true }
        ],
        2: [ // البرجر
            { name: 'برجر كلاسيك', price: 3.500, desc: 'لحم بقري، خس، طماطم، مخلل، صلصة خاصة' },
            { name: 'تشيز برجر', price: 3.750, desc: 'برجر مع جبنة شيدر مضاعفة' },
            { name: 'برجر الدجاج', price: 3.250, desc: 'صدر دجاج مقرمش مع الخس والمايونيز' },
            { name: 'برجر مشروم سويس', price: 4.250, desc: 'برجر مع الفطر السويسري والجبنة', isNew: true }
        ],
        3: [ // البيتزا
            { name: 'بيتزا مارجريتا', price: 4.000, desc: 'صلصة طماطم، جبنة موزاريلا، ريحان' },
            { name: 'بيتزا بيبروني', price: 4.500, desc: 'بيبروني، جبنة موزاريلا، صلصة طماطم' },
            { name: 'بيتزا الخضار', price: 4.250, desc: 'فطر، فلفل، زيتون، بصل، طماطم' },
            { name: 'بيتزا دجاج باربكيو', price: 5.000, desc: 'دجاج، صلصة باربكيو، بصل، فلفل', isNew: true }
        ],
        4: [ // المشروبات
            { name: 'كوكاكولا', price: 0.500, desc: 'مشروب غازي 330 مل' },
            { name: 'عصير البرتقال', price: 1.000, desc: 'عصير طبيعي طازج' },
            { name: 'ماء', price: 0.250, desc: 'زجاجة ماء 500 مل' },
            { name: 'موخيتو', price: 1.500, desc: 'موخيتو بالنعناع والليمون', isNew: true },
            { name: 'قهوة مثلجة', price: 1.750, desc: 'قهوة باردة مع الحليب والثلج' }
        ],
        5: [ // الحلويات
            { name: 'تشيز كيك', price: 2.000, desc: 'تشيز كيك بالفراولة' },
            { name: 'براوني', price: 1.750, desc: 'براوني الشوكولاتة مع الآيس كريم' },
            { name: 'آيس كريم', price: 1.500, desc: '3 كرات آيس كريم متنوعة' },
            { name: 'تيراميسو', price: 2.250, desc: 'حلوى إيطالية بالقهوة والماسكاربوني', isNew: true }
        ]
    };

    const categoryProducts = products[categoryIndex] || [];

    categoryProducts.forEach((product, index) => {
        db.run(`INSERT INTO products (category_id, name, description, price, order_index, is_available, is_new)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [categoryId, product.name, product.desc, product.price, index + 1, 1, product.isNew ? 1 : 0],
            (err) => {
                if (err) {
                    console.error('❌ خطأ في إضافة منتج:', err.message);
                }
            }
        );
    });
}

// دالة مساعدة لتحديث وقت التعديل
db.updateTimestamp = function(table, id) {
    this.run(`UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
};

// دالة لإضافة إحصائية
db.addStatistic = function(restaurantId, type) {
    const today = new Date().toISOString().split('T')[0];

    this.run(`INSERT INTO statistics (restaurant_id, date, ${type})
              VALUES (?, ?, 1)
                  ON CONFLICT(restaurant_id, date) 
              DO UPDATE SET ${type} = ${type} + 1`,
        [restaurantId, today],
        (err) => {
            if (err) {
                console.error('❌ خطأ في إضافة الإحصائية:', err.message);
            }
        }
    );
};

// دالة للحصول على إحصائيات المطعم
db.getRestaurantStats = function(restaurantId, callback) {
    const queries = {
        today: `SELECT SUM(views) as views, SUM(scans) as scans 
                FROM statistics 
                WHERE restaurant_id = ? AND date = date('now')`,
        month: `SELECT SUM(views) as views, SUM(scans) as scans 
                FROM statistics 
                WHERE restaurant_id = ? AND date >= date('now', 'start of month')`,
        total: `SELECT SUM(views) as views, SUM(scans) as scans 
                FROM statistics 
                WHERE restaurant_id = ?`
    };

    const stats = {};

    db.get(queries.today, [restaurantId], (err, today) => {
        stats.today = today || { views: 0, scans: 0 };

        db.get(queries.month, [restaurantId], (err, month) => {
            stats.month = month || { views: 0, scans: 0 };

            db.get(queries.total, [restaurantId], (err, total) => {
                stats.total = total || { views: 0, scans: 0 };
                callback(null, stats);
            });
        });
    });
};

// معالجة إغلاق قاعدة البيانات
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('🔒 تم إغلاق اتصال قاعدة البيانات');
        process.exit(0);
    });
});

module.exports = db;