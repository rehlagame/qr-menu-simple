# QR Menu System 🍽️

نظام قوائم رقمية احترافي للمطاعم باستخدام رموز QR

## المميزات ✨

- 📱 **تصميم متجاوب** - يعمل على جميع الأجهزة
- 🌐 **ثنائي اللغة** - عربي / English
- 🎨 **لوحة تحكم سهلة** - إدارة القوائم والمنتجات
- 📸 **رفع الصور** - دعم الصور للمنتجات والشعار
- 🔒 **آمن** - حماية CSRF وتشفير كلمات المرور
- 📊 **إحصائيات** - تتبع المشاهدات والمسح الضوئي
- 🚀 **سريع** - أداء محسّن مع Supabase

## التقنيات المستخدمة 🛠️

- **Backend:** Node.js, Express.js
- **Database:** SQLite (تطوير) / Supabase (إنتاج)
- **Frontend:** EJS, Bootstrap 5
- **Storage:** Supabase Storage
- **Security:** Helmet, CSRF, bcrypt
- **Deployment:** Vercel

## التثبيت 🚀

### 1. استنساخ المشروع
```bash
git clone https://github.com/yourusername/qr-menu-simple.git
cd qr-menu-simple
```

### 2. تثبيت الحزم
```bash
npm install
```

### 3. إعداد البيئة
```bash
# انسخ ملف المتغيرات
cp .env.example .env

# عدّل الملف بمعلوماتك
nano .env
```

### 4. تشغيل التطبيق
```bash
# تطوير
npm run dev

# إنتاج
npm start
```

### 5. فتح المتصفح
```
http://localhost:3000
```

## البيانات التجريبية 🧪

- **رابط القائمة:** `/menu/demo`
- **لوحة التحكم:** `/admin/login`
- **البريد:** `demo@qrmenu.com`
- **كلمة المرور:** `demo123`

## إعداد Supabase 🗄️

### 1. إنشاء مشروع في [Supabase](https://supabase.com)

### 2. تنفيذ SQL للجداول:
```sql
-- جدول المطاعم
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    slug TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    address_en TEXT,
    logo TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- جدول الأقسام
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- جدول المنتجات
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    price DECIMAL NOT NULL,
    image TEXT,
    is_available BOOLEAN DEFAULT true,
    is_new BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- جدول الإحصائيات
CREATE TABLE statistics (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    scans INTEGER DEFAULT 0,
    UNIQUE(restaurant_id, date)
);
```

### 3. إنشاء Storage Bucket:
1. اذهب إلى Storage في Supabase
2. أنشئ bucket باسم `restaurant-images`
3. اجعله Public

### 4. نسخ المفاتيح:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## النشر على Vercel 🚀

### 1. ربط GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. استيراد في Vercel
1. اذهب إلى [Vercel](https://vercel.com)
2. Import Git Repository
3. اختر مشروعك من GitHub

### 3. إضافة متغيرات البيئة
أضف جميع المتغيرات من `.env` في Vercel Dashboard

### 4. النشر
سيتم النشر تلقائياً!

## هيكل المشروع 📂

```
qr-menu-simple/
├── 📁 database/      # ملفات قاعدة البيانات
├── 📁 middleware/    # وسطاء Express
├── 📁 public/        # الملفات الثابتة
│   ├── 📁 css/
│   ├── 📁 js/
│   └── 📁 images/
├── 📁 routes/        # مسارات التطبيق
├── 📁 uploads/       # الصور المرفوعة
├── 📁 utils/         # دوال مساعدة
├── 📁 views/         # قوالب EJS
├── 📄 app.js         # نقطة البداية
├── 📄 package.json   # معلومات المشروع
└── 📄 vercel.json    # إعدادات Vercel
```

## المساهمة 🤝

نرحب بالمساهمات! يرجى:
1. Fork المشروع
2. إنشاء فرع جديد (`git checkout -b feature/amazing`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للفرع (`git push origin feature/amazing`)
5. فتح Pull Request

## الترخيص 📄

MIT License - انظر ملف [LICENSE](LICENSE) للتفاصيل

## الدعم 💬

- **البريد:** info@olosolutions.cc
- **الموقع:** [olosolutions.cc](https://www.olosolutions.cc)
- **Issues:** [GitHub Issues](https://github.com/yourusername/qr-menu-simple/issues)

## الشكر 🙏

شكر خاص لجميع المساهمين والمكتبات المستخدمة.

---

صُنع بـ ❤️ بواسطة [Olosolutions](https://www.olosolutions.cc)