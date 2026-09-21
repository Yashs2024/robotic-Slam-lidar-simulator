/* src/ui_enhancements.js */

// Force HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cookie Consent Banner
    const cookieBanner = document.getElementById('vectra-cookie-banner');
    const scrollTopBtn = document.getElementById('vectra-scroll-top');
    
    if (cookieBanner) {
        const consent = localStorage.getItem('vectrasim_cookie_consent');
        if (!consent) {
            // Show banner after a short delay for dramatic effect
            setTimeout(() => {
                cookieBanner.classList.add('show');
                if (scrollTopBtn) scrollTopBtn.classList.add('offset');
            }, 1000);
        }

        const acceptBtn = document.getElementById('cookie-accept-btn');
        const essentialBtn = document.getElementById('cookie-essential-btn');

        const dismissBanner = (type) => {
            localStorage.setItem('vectrasim_cookie_consent', type);
            cookieBanner.classList.remove('show');
            if (scrollTopBtn) scrollTopBtn.classList.remove('offset');
        };

        if (acceptBtn) acceptBtn.addEventListener('click', () => dismissBanner('all'));
        if (essentialBtn) essentialBtn.addEventListener('click', () => dismissBanner('essential'));
    }

    // 2 & 3. Scroll to Top & Progress Bar
    const progressBar = document.getElementById('vectra-progress-bar');
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        
        // Progress Bar
        if (progressBar && scrollHeight > 0) {
            const progress = (scrollTop / scrollHeight) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Scroll to Top Button visibility
        if (scrollTopBtn) {
            if (scrollTop > 400) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        }
    }, { passive: true });

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 4. FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if(question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all others
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                });

                // Toggle current
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });
});
