// نظام تعدد اللغات
const translations = {
    ar: {
        // عام
        appName: 'QR Menu',
        welcome: 'مرحباً',
        search: 'بحث',
        searchPlaceholder: 'ابحث عن منتج...',
        all: 'الكل',
        new: 'جديد',
        unavailable: 'غير متوفر',
        currency: 'د.ك',

        // القائمة
        menu: 'القائمة',
        allCategories: 'جميع الأصناف',
        noProducts: 'لا توجد منتجات حالياً',
        noProductsDesc: 'سيتم إضافة المنتجات قريباً',
        noResults: 'لا توجد نتائج',
        noResultsDesc: 'لم نجد أي منتجات تطابق بحثك',
        items: 'صنف',

        // الأقسام
        appetizers: 'المقبلات',
        mainDishes: 'الأطباق الرئيسية',
        beverages: 'المشروبات',
        desserts: 'الحلويات',
        burgers: 'البرجر',
        pizza: 'البيتزا',

        // لوحة التحكم
        dashboard: 'لوحة التحكم',
        categories: 'الأقسام',
        products: 'المنتجات',
        settings: 'الإعدادات',
        logout: 'تسجيل الخروج',

        // النماذج
        login: 'تسجيل الدخول',
        register: 'إنشاء حساب جديد',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور',
        restaurantName: 'اسم المطعم',
        phone: 'رقم الهاتف',
        address: 'العنوان',
        optional: 'اختياري',

        // الأزرار
        save: 'حفظ',
        cancel: 'إلغاء',
        add: 'إضافة',
        edit: 'تعديل',
        delete: 'حذف',
        update: 'تحديث',

        // الرسائل
        success: 'تمت العملية بنجاح',
        error: 'حدث خطأ',
        loading: 'جاري التحميل...',

        // Footer
        poweredBy: 'مدعوم من',
        rights: 'جميع الحقوق محفوظة'
    },

    en: {
        // General
        appName: 'QR Menu',
        welcome: 'Welcome',
        search: 'Search',
        searchPlaceholder: 'Search for a product...',
        all: 'All',
        new: 'New',
        unavailable: 'Unavailable',
        currency: 'KWD',

        // Menu
        menu: 'Menu',
        allCategories: 'All Categories',
        noProducts: 'No products available',
        noProductsDesc: 'Products will be added soon',
        noResults: 'No results found',
        noResultsDesc: 'We couldn\'t find any products matching your search',
        items: 'items',

        // Categories
        appetizers: 'Appetizers',
        mainDishes: 'Main Dishes',
        beverages: 'Beverages',
        desserts: 'Desserts',
        burgers: 'Burgers',
        pizza: 'Pizza',

        // Dashboard
        dashboard: 'Dashboard',
        categories: 'Categories',
        products: 'Products',
        settings: 'Settings',
        logout: 'Logout',

        // Forms
        login: 'Login',
        register: 'Create New Account',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        restaurantName: 'Restaurant Name',
        phone: 'Phone Number',
        address: 'Address',
        optional: 'Optional',

        // Buttons
        save: 'Save',
        cancel: 'Cancel',
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete',
        update: 'Update',

        // Messages
        success: 'Operation successful',
        error: 'An error occurred',
        loading: 'Loading...',

        // Footer
        poweredBy: 'Powered by',
        rights: 'All rights reserved'
    }
};

// Middleware للغة
const languageMiddleware = (req, res, next) => {
    // الحصول على اللغة من: 1. Query parameter 2. Cookie 3. Session 4. Default
    let lang = req.query.lang || req.cookies?.lang || req.session?.lang || 'ar';

    // التحقق من صحة اللغة
    if (!['ar', 'en'].includes(lang)) {
        lang = 'ar';
    }

    // حفظ اللغة في الجلسة والكوكيز
    if (req.session) {
        req.session.lang = lang;
    }

    if (res.cookie) {
        res.cookie('lang', lang, {
            maxAge: 365 * 24 * 60 * 60 * 1000, // سنة واحدة
            httpOnly: true
        });
    }

    // إضافة اللغة والترجمات للـ locals
    res.locals.lang = lang;
    res.locals.t = translations[lang];
    res.locals.isRTL = lang === 'ar';

    // دالة مساعدة للترجمة
    res.locals.translate = (key, defaultValue) => {
        const keys = key.split('.');
        let value = translations[lang];

        for (const k of keys) {
            value = value?.[k];
            if (!value) break;
        }

        return value || defaultValue || key;
    };

    // دالة لتبديل اللغة
    res.locals.switchLanguageUrl = (newLang) => {
        const url = new URL(req.originalUrl, `http://${req.headers.host}`);
        url.searchParams.set('lang', newLang);
        return url.pathname + url.search;
    };

    next();
};

// دالة للحصول على الترجمة
const getTranslation = (lang, key, defaultValue) => {
    const keys = key.split('.');
    let value = translations[lang] || translations['ar'];

    for (const k of keys) {
        value = value?.[k];
        if (!value) break;
    }

    return value || defaultValue || key;
};

// دالة لترجمة الأقسام
const translateCategory = (category, lang) => {
    const categoryTranslations = {
        'المقبلات': { en: 'Appetizers', ar: 'المقبلات' },
        'الأطباق الرئيسية': { en: 'Main Dishes', ar: 'الأطباق الرئيسية' },
        'المشروبات': { en: 'Beverages', ar: 'المشروبات' },
        'الحلويات': { en: 'Desserts', ar: 'الحلويات' },
        'البرجر': { en: 'Burgers', ar: 'البرجر' },
        'البيتزا': { en: 'Pizza', ar: 'البيتزا' }
    };

    const translation = categoryTranslations[category.name];
    if (translation) {
        return lang === 'en' ? translation.en : translation.ar;
    }

    // إذا كان هناك اسم إنجليزي في قاعدة البيانات
    if (lang === 'en' && category.name_en) {
        return category.name_en;
    }

    return category.name;
};

// دالة لترجمة المنتجات
const translateProduct = (product, lang) => {
    if (lang === 'en') {
        return {
            ...product,
            name: product.name_en || product.name,
            description: product.description_en || product.description
        };
    }
    return product;
};

module.exports = {
    languageMiddleware,
    translations,
    getTranslation,
    translateCategory,
    translateProduct
};