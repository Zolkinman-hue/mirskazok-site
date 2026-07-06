/**
 * Интерактивность волны 2
 * До/После слайдер, смена сцен, шоукейс стилей
 */

const Wave2Interactive = {
    init() {
        this.initBeforeAfterSlider();
        this.initTransformGallery();
        this.initStylesShowcase();
    },

    // До/После слайдер с drag
    initBeforeAfterSlider() {
        const container = document.querySelector('.before-after-wrapper');
        if (!container) return;

        const slider = container.querySelector('.before-after-slider');
        const beforeImg = container.querySelector('.before-img');
        let isDragging = false;

        const updateSlider = (clientX) => {
            const rect = container.getBoundingClientRect();
            const percent = ((clientX - rect.left) / rect.width) * 100;
            const clampedPercent = Math.max(0, Math.min(100, percent));
            slider.style.left = clampedPercent + '%';
            beforeImg.style.clipPath = `inset(0 ${100 - clampedPercent}% 0 0)`;
        };

        // Mouse events
        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            updateSlider(e.clientX);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateSlider(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Touch events
        container.addEventListener('touchstart', (e) => {
            isDragging = true;
            updateSlider(e.touches[0].clientX);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                updateSlider(e.touches[0].clientX);
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });

        // Автоплей-подсказка при первом появлении
        const hasPlayedDemo = sessionStorage.getItem('beforeAfterDemo');
        if (!hasPlayedDemo && !window.prefersReducedMotion) {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    setTimeout(() => {
                        this.playBeforeAfterDemo(slider, beforeImg);
                        sessionStorage.setItem('beforeAfterDemo', 'true');
                    }, 500);
                    observer.disconnect();
                }
            }, { threshold: 0.5 });
            observer.observe(container);
        }
    },

    playBeforeAfterDemo(slider, beforeImg) {
        // Качнуть шторку 30% -> 70% -> 50%
        const animate = (target, duration) => {
            return new Promise(resolve => {
                const start = parseFloat(slider.style.left);
                const startTime = performance.now();

                const step = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3); // easeOut cubic
                    const current = start + (target - start) * eased;
                    slider.style.left = current + '%';
                    beforeImg.style.clipPath = `inset(0 ${100 - current}% 0 0)`;

                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(step);
            });
        };

        (async () => {
            await animate(30, 600);
            await new Promise(r => setTimeout(r, 200));
            await animate(70, 600);
            await new Promise(r => setTimeout(r, 200));
            await animate(50, 400);
        })();
    },

    // Галерея превращений (смена пары портретов)
    initTransformGallery() {
        const thumbs = document.querySelectorAll('.transform-thumb');
        const beforeImg = document.querySelector('.before-after-wrapper .before-img');
        const afterImg = document.querySelector('.before-after-wrapper .after-img');
        if (!thumbs.length || !beforeImg || !afterImg) return;

        const pairs = {
            boy_knight: {
                before: 'assets/wave2/before_portrait_boy_knight.jpg',
                after: 'assets/wave2/after_boy_knight_v2.jpg'
            },
            girl_fairy: {
                before: 'assets/wave2/before_portrait_girl_fairy.jpg',
                after: 'assets/wave2/after_girl_fairy_v2.jpg'
            }
        };

        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const pair = thumb.dataset.pair;
                if (!pairs[pair]) return;

                // Обновить активную кнопку
                thumbs.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');

                // Сменить ОБЕ картинки с fade
                beforeImg.style.transition = 'opacity 0.3s ease';
                afterImg.style.transition = 'opacity 0.3s ease';
                beforeImg.style.opacity = '0';
                afterImg.style.opacity = '0';

                setTimeout(() => {
                    beforeImg.src = pairs[pair].before;
                    afterImg.src = pairs[pair].after;
                    beforeImg.alt = pair === 'boy_knight' ? 'Реальное фото мальчика' : 'Реальное фото девочки';
                    afterImg.alt = pair === 'boy_knight' ? 'Мальчик-рыцарь в Pixar-стиле' : 'Девочка-фея в Pixar-стиле';
                    beforeImg.style.opacity = '1';
                    afterImg.style.opacity = '1';
                }, 300);
            });
        });
    },

    // Шоукейс стилей (смена активного стиля)
    initStylesShowcase() {
        const buttons = document.querySelectorAll('.style-switch-btn');
        const activeImage = document.querySelector('.showcase-active-image');
        if (!buttons.length || !activeImage) return;

        const styles = {
            pixar: 'assets/wave2/showcase_pixar.jpg',
            watercolor: 'assets/wave2/showcase_watercolor.jpg',
            disney: 'assets/wave2/showcase_disney.jpg',
            anime: 'assets/wave2/showcase_anime_soft.jpg'
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.style;
                if (!styles[style]) return;

                // Обновить активную кнопку
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Сменить изображение с fade
                activeImage.style.transition = 'opacity 0.4s ease';
                activeImage.style.opacity = '0';

                setTimeout(() => {
                    activeImage.src = styles[style];
                    activeImage.style.opacity = '1';
                }, 400);
            });
        });
    }
};

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => Wave2Interactive.init(), 200);
    });
} else {
    setTimeout(() => Wave2Interactive.init(), 200);
}
