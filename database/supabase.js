const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// بيانات الاتصال - ضعها في ملف .env
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

// محاكاة دوال SQLite
const db = {
    // دالة get للاستعلام عن صف واحد
    get: async (query, params, callback) => {
        try {
            const sqlQuery = convertToPostgreSQL(query, params);
            const { data, error } = await executeQuery(sqlQuery);

            if (error) {
                callback(error, null);
            } else {
                callback(null, data[0] || null);
            }
        } catch (err) {
            callback(err, null);
        }
    },

    // دالة all للاستعلام عن عدة صفوف
    all: async (query, params, callback) => {
        try {
            const sqlQuery = convertToPostgreSQL(query, params);
            const { data, error } = await executeQuery(sqlQuery);

            if (error) {
                callback(error, null);
            } else {
                callback(null, data);
            }
        } catch (err) {
            callback(err, null);
        }
    },

    // دالة run للإدراج والتحديث والحذف
    run: async function(query, params, callback) {
        try {
            const sqlQuery = convertToPostgreSQL(query, params);
            const { data, error } = await executeQuery(sqlQuery);

            if (error) {
                callback(error);
            } else {
                // محاكاة lastID للإدراج
                this.lastID = data[0]?.id || null;
                callback(null);
            }
        } catch (err) {
            callback(err);
        }
    },

    // دالة إضافة إحصائية
    addStatistic: async function(restaurantId, type) {
        const today = new Date().toISOString().split('T')[0];

        try {
            // محاولة التحديث أولاً
            const { data: existing } = await supabase
                .from('statistics')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('date', today)
                .single();

            if (existing) {
                await supabase
                    .from('statistics')
                    .update({ [type]: existing[type] + 1 })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('statistics')
                    .insert({
                        restaurant_id: restaurantId,
                        date: today,
                        [type]: 1
                    });
            }
        } catch (err) {
            console.error('Error adding statistic:', err);
        }
    },

    // دالة تحديث timestamp
    updateTimestamp: async function(table, id) {
        try {
            await supabase
                .from(table)
                .update({ updated_at: new Date().toISOString() })
                .eq('id', id);
        } catch (err) {
            console.error('Error updating timestamp:', err);
        }
    }
};

// تحويل استعلامات SQLite إلى PostgreSQL
function convertToPostgreSQL(query, params) {
    // استبدال ? بـ $1, $2, etc
    let pgQuery = query;
    let paramIndex = 1;

    while (pgQuery.includes('?')) {
        pgQuery = pgQuery.replace('?', `$${paramIndex}`);
        paramIndex++;
    }

    // تحويلات أخرى
    pgQuery = pgQuery.replace(/AUTOINCREMENT/g, 'SERIAL');
    pgQuery = pgQuery.replace(/DATETIME/g, 'TIMESTAMP');
    pgQuery = pgQuery.replace(/REAL/g, 'DECIMAL');

    return { query: pgQuery, params };
}

// تنفيذ الاستعلام
async function executeQuery({ query, params }) {
    // تحديد نوع العملية
    const operation = query.trim().toUpperCase().split(' ')[0];

    try {
        switch (operation) {
            case 'SELECT':
                return await executeSelect(query, params);
            case 'INSERT':
                return await executeInsert(query, params);
            case 'UPDATE':
                return await executeUpdate(query, params);
            case 'DELETE':
                return await executeDelete(query, params);
            default:
                throw new Error('Unsupported operation');
        }
    } catch (error) {
        console.error('Query execution error:', error);
        return { data: null, error };
    }
}

// تنفيذ SELECT
async function executeSelect(query, params) {
    // تحليل الاستعلام لاستخراج الجدول والشروط
    const tableName = extractTableName(query, 'FROM');

    let supabaseQuery = supabase.from(tableName).select('*');

    // إضافة الشروط WHERE
    const whereConditions = extractWhereConditions(query, params);
    whereConditions.forEach(condition => {
        supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
    });

    // إضافة ORDER BY
    const orderBy = extractOrderBy(query);
    if (orderBy) {
        supabaseQuery = supabaseQuery.order(orderBy.column, { ascending: orderBy.ascending });
    }

    const { data, error } = await supabaseQuery;
    return { data, error };
}

// تنفيذ INSERT
async function executeInsert(query, params) {
    const tableName = extractTableName(query, 'INTO');
    const columns = extractInsertColumns(query);

    const insertData = {};
    columns.forEach((col, index) => {
        insertData[col] = params[index];
    });

    const { data, error } = await supabase
        .from(tableName)
        .insert(insertData)
        .select();

    return { data, error };
}

// تنفيذ UPDATE
async function executeUpdate(query, params) {
    const tableName = extractTableName(query, 'UPDATE');
    const updates = extractUpdateFields(query, params);
    const whereConditions = extractWhereConditions(query, params);

    let supabaseQuery = supabase.from(tableName).update(updates.data);

    whereConditions.forEach(condition => {
        supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
    });

    const { data, error } = await supabaseQuery.select();
    return { data, error };
}

// تنفيذ DELETE
async function executeDelete(query, params) {
    const tableName = extractTableName(query, 'FROM');
    const whereConditions = extractWhereConditions(query, params);

    let supabaseQuery = supabase.from(tableName).delete();

    whereConditions.forEach(condition => {
        supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
    });

    const { data, error } = await supabaseQuery;
    return { data, error };
}

// دوال مساعدة لتحليل SQL
function extractTableName(query, keyword) {
    const regex = new RegExp(`${keyword}\\s+(\\w+)`, 'i');
    const match = query.match(regex);
    return match ? match[1] : null;
}

function extractWhereConditions(query, params) {
    const conditions = [];
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|$)/i);

    if (whereMatch) {
        const whereClause = whereMatch[1];
        const parts = whereClause.split(/\s+AND\s+/i);

        parts.forEach((part, index) => {
            let column = part.split(/\s*=\s*/)[0].trim();

            // إزالة الـ alias إذا وُجد (مثل c.restaurant_id -> restaurant_id)
            if (column.includes('.')) {
                column = column.split('.').pop();
            }

            conditions.push({
                column: column,
                value: params[index]
            });
        });
    }

    return conditions;
}

function extractOrderBy(query) {
    const match = query.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (match) {
        let column = match[1];

        // إزالة الـ alias من ORDER BY أيضاً
        if (column.includes('.')) {
            column = column.split('.').pop();
        }

        return {
            column: column,
            ascending: !match[2] || match[2].toUpperCase() === 'ASC'
        };
    }
    return null;
}

function extractInsertColumns(query) {
    const match = query.match(/\(([^)]+)\)\s+VALUES/i);
    if (match) {
        return match[1].split(',').map(col => col.trim());
    }
    return [];
}

function extractUpdateFields(query, params) {
    const match = query.match(/SET\s+(.+?)\s+WHERE/i);
    if (!match) return { data: {}, usedParams: 0 };

    const setPart = match[1];
    const fields = setPart.split(',').map(f => f.trim());
    const data = {};

    fields.forEach((field, index) => {
        const [column] = field.split(/\s*=\s*/);
        data[column.trim()] = params[index];
    });

    return { data, usedParams: fields.length };
}

// إضافة بيانات تجريبية
async function seedDemoData() {
    try {
        // التحقق من وجود المطعم التجريبي
        const { data: existing } = await supabase
            .from('restaurants')
            .select('id')
            .eq('slug', 'demo')
            .single();

        if (!existing) {
            const demoPassword = await bcrypt.hash('demo123', 10);

            // إضافة مطعم تجريبي
            const { data: restaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .insert({
                    name: 'مطعم الوجبات السريعة',
                    slug: 'demo',
                    email: 'demo@qrmenu.com',
                    password: demoPassword,
                    phone: '+965 12345678',
                    address: 'الكويت - حولي',
                    description: 'مطعم تجريبي لعرض النظام',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (restaurantError) {
                console.error('❌ خطأ في إضافة المطعم التجريبي:', restaurantError);
                return;
            }

            if (restaurant) {
                // إضافة أقسام تجريبية
                const categories = [
                    { name: 'المقبلات', name_en: 'Appetizers', order_index: 1 },
                    { name: 'البرجر', name_en: 'Burgers', order_index: 2 },
                    { name: 'البيتزا', name_en: 'Pizza', order_index: 3 },
                    { name: 'المشروبات', name_en: 'Beverages', order_index: 4 },
                    { name: 'الحلويات', name_en: 'Desserts', order_index: 5 }
                ];

                for (const cat of categories) {
                    const { data: category, error: catError } = await supabase
                        .from('categories')
                        .insert({
                            restaurant_id: restaurant.id,
                            ...cat,
                            created_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (catError) {
                        console.error('❌ خطأ في إضافة القسم:', catError);
                        continue;
                    }

                    // إضافة منتجات تجريبية لكل قسم
                    if (category && cat.name === 'البرجر') {
                        const products = [
                            {
                                name: 'برجر كلاسيك',
                                name_en: 'Classic Burger',
                                description: 'برجر لحم بقري مع الخضار الطازجة',
                                description_en: 'Beef burger with fresh vegetables',
                                price: 2.5,
                                is_available: true
                            },
                            {
                                name: 'برجر الجبن',
                                name_en: 'Cheese Burger',
                                description: 'برجر لحم بقري مع جبن الشيدر',
                                description_en: 'Beef burger with cheddar cheese',
                                price: 3.0,
                                is_available: true
                            }
                        ];

                        for (const product of products) {
                            await supabase
                                .from('products')
                                .insert({
                                    restaurant_id: restaurant.id,
                                    category_id: category.id,
                                    ...product,
                                    created_at: new Date().toISOString()
                                });
                        }
                    }
                }

                console.log('✅ تم إضافة البيانات التجريبية بنجاح');
            }
        } else {
            console.log('ℹ️ المطعم التجريبي موجود بالفعل');
        }
    } catch (error) {
        console.error('❌ خطأ في إضافة البيانات التجريبية:', error);
    }
}

// تشغيل البيانات التجريبية عند بدء التطبيق
setTimeout(seedDemoData, 2000);

module.exports = db;