// تأثيرات عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // إضافة تأثيرات للعناصر عند الظهور
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);

    // مراقبة العناصر
    document.querySelectorAll('.feature-card').forEach(el => {
        observer.observe(el);
    });
});