const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// إنشاء عميل Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// دالة رفع الصورة
async function uploadImage(file, folder = 'products') {
    try {
        // إنشاء اسم فريد
        const fileExt = path.extname(file.originalname);
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;

        // استخدام buffer مباشرة
        const fileBuffer = file.buffer || file.path;

        // رفع إلى Supabase Storage
        const { data, error } = await supabase.storage
            .from('restaurant-images')
            .upload(fileName, fileBuffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) throw error;

        // إرجاع الرابط العام
        const { data: publicUrl } = supabase.storage
            .from('restaurant-images')
            .getPublicUrl(fileName);

        return publicUrl.publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// دالة حذف الصورة
async function deleteImage(imageUrl) {
    try {
        // استخراج مسار الملف من الرابط
        const urlParts = imageUrl.split('/');
        const fileName = urlParts.slice(-2).join('/');

        const { error } = await supabase.storage
            .from('restaurant-images')
            .remove([fileName]);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}

module.exports = {
    uploadImage,
    deleteImage
};
