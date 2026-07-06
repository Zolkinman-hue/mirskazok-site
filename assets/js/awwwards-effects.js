/**
 * Awwwards 2026 Effects для МирСказок
 * Кинематографичные эффекты, scroll-storytelling, 3D transforms
 */

const AwwwardsEffects = {
    init() {
        if (window.prefersReducedMotion) {
            console.log('[A11Y] Reduced motion mode: advanced effects disabled');
            return;
        }

        this.initCustomCursor();
        this.initHeroCinematic();
        // initBeforeAfterSlider handled by wave2-interactive.js
        // initScrollStory - not implemented yet (for future pinned sections)
        this.init3DTiltCards();
        // initTextRevealEffects - skip to avoid conflicts with existing animations
        this.initScrollProgress();
        this.initMarquee();
        this.initNoiseTexture();
        this.initTouchRipple();
        this.initReviewsNudge();
        this.initHeroParallaxLayers();
    },

    // 1. Custom Cursor с хвостом-шлейфом (desktop only)
    initCustomCursor() {
        if (window.innerWidth <= 768) return;

        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        cursor.innerHTML = '<div class="cursor-inner"></div>';
        document.body.appendChild(cursor);

        const cursorInner = cursor.querySelector('.cursor-inner');
        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            const dx = mouseX - cursorX;
            const dy = mouseY - cursorY;
            cursorX += dx * 0.5;
            cursorY += dy * 0.5;
            cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover states
        document.querySelectorAll('a, button, .catalog-card, .style-chip').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });

        // CSS для кастомного курсора
        const style = document.createElement('style');
        style.textContent = `
            .custom-cursor {
                position: fixed;
                pointer-events: none;
                z-index: 9999;
                mix-blend-mode: difference;
                top: -8px;
                left: -8px;
                opacity: 0.35;
            }
            .cursor-inner {
                width: 16px;
                height: 16px;
                border: 1.5px solid var(--color-gold-light);
                border-radius: 50%;
                transition: transform 0.2s ease, border-color 0.2s ease;
            }
            .custom-cursor.hover .cursor-inner {
                transform: scale(1.5);
                border-color: var(--color-gold);
            }
            .custom-cursor::before {
                content: '';
                position: absolute;
                top: 6px;
                left: 6px;
                width: 4px;
                height: 4px;
                background: var(--color-gold-light);
                border-radius: 50%;
            }
            @media (max-width: 768px) {
                .custom-cursor { display: none; }
            }
        `;
        document.head.appendChild(style);
    },

    // 2. Кинематографичное вступление Hero
    initHeroCinematic() {
        // Панорама фон с scale scrub
        const heroBg = document.querySelector('.hero-panorama-bg');
        if (heroBg) {
            gsap.to(heroBg, {
                scale: 1.1,
                scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1
                }
            });
        }

        // Пульсирующее свечение CTA (мягкое, не перебивает существующее)
        const cta = document.querySelector('.hero .cta-btn');
        if (cta) {
            gsap.to(cta, {
                boxShadow: '0 12px 50px rgba(212, 168, 83, 0.5)',
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        }
    },

    // 3. До/После слайдер с интерактивной шторкой
    initBeforeAfterSlider() {
        const container = document.querySelector('.before-after-container');
        if (!container) return;

        const slider = container.querySelector('.before-after-slider');
        const handle = container.querySelector('.slider-handle');
        const beforeImg = container.querySelector('.before-img');

        let isDragging = false;

        // Автоплей-подсказка при появлении в вьюпорте
        ScrollTrigger.create({
            trigger: container,
            start: 'top 60%',
            once: true,
            onEnter: () => {
                gsap.to(slider, {
                    left: '30%',
                    duration: 0.8,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        beforeImg.style.clipPath = `inset(0 ${100 - parseFloat(slider.style.left)}% 0 0)`;
                    }
                });
                gsap.to(slider, {
                    left: '70%',
                    duration: 0.8,
                    delay: 0.9,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        beforeImg.style.clipPath = `inset(0 ${100 - parseFloat(slider.style.left)}% 0 0)`;
                    }
                });
            }
        });

        function updateSlider(clientX) {
            const rect = container.getBoundingClientRect();
            const percent = ((clientX - rect.left) / rect.width) * 100;
            const clampedPercent = Math.max(0, Math.min(100, percent));
            slider.style.left = clampedPercent + '%';
            beforeImg.style.clipPath = `inset(0 ${100 - clampedPercent}% 0 0)`;
        }

        handle.addEventListener('mousedown', () => isDragging = true);
        document.addEventListener('mouseup', () => isDragging = false);
        document.addEventListener('mousemove', (e) => {
            if (isDragging) updateSlider(e.clientX);
        });

        // Touch support
        handle.addEventListener('touchstart', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        document.addEventListener('touchend', () => isDragging = false);
        document.addEventListener('touchmove', (e) => {
            if (isDragging) updateSlider(e.touches[0].clientX);
        });
    },

    // 4. Pinned-секция "Как это работает" со scrub-анимацией
    initScrollStory() {
        const stepsContainer = document.querySelector('.steps-scroll-container');
        if (!stepsContainer) return;

        const steps = gsap.utils.toArray('.step-horizontal');

        gsap.to(steps, {
            xPercent: -100 * (steps.length - 1),
            ease: 'none',
            scrollTrigger: {
                trigger: stepsContainer,
                pin: true,
                start: 'top top',
                end: () => `+=${stepsContainer.offsetWidth * 0.8}`,
                scrub: 1,
                snap: {
                    snapTo: 1 / (steps.length - 1),
                    duration: 0.3,
                    ease: 'power1.inOut'
                }
            }
        });

        // Прогресс-линия
        const progressLine = stepsContainer.querySelector('.steps-progress-line');
        if (progressLine) {
            gsap.to(progressLine, {
                scaleX: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: stepsContainer,
                    start: 'top top',
                    end: () => `+=${stepsContainer.offsetWidth * 0.8}`,
                    scrub: 1
                }
            });
        }
    },

    // 5. 3D Tilt эффект на карточках
    init3DTiltCards() {
        const cards = document.querySelectorAll('.catalog-card, .style-showcase-card');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -10;
                const rotateY = ((x - centerX) / centerX) * 10;

                gsap.to(card, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    duration: 0.3,
                    ease: 'power2.out',
                    transformPerspective: 1000
                });

                // Блик (glare)
                const glare = card.querySelector('.card-glare') || (() => {
                    const g = document.createElement('div');
                    g.className = 'card-glare';
                    g.style.cssText = `
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(135deg,
                            rgba(255,255,255,0) 0%,
                            rgba(255,255,255,0.3) 50%,
                            rgba(255,255,255,0) 100%);
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.3s ease;
                    `;
                    card.appendChild(g);
                    return g;
                })();

                glare.style.opacity = '0.4';
                glare.style.transform = `translate(${(x - centerX) * 0.5}px, ${(y - centerY) * 0.5}px)`;
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    duration: 0.5,
                    ease: 'power2.out'
                });
                const glare = card.querySelector('.card-glare');
                if (glare) glare.style.opacity = '0';
            });
        });
    },

    // 6. Reveal заголовков масками + анимированный градиент
    initTextRevealEffects() {
        const headers = document.querySelectorAll('.section-header h2, .magic-transform h2');

        headers.forEach(h => {
            // Разбиваем на строки для маски clip-path
            const lines = h.textContent.split('\n').filter(l => l.trim());
            if (lines.length > 1) {
                h.innerHTML = lines.map((line, i) =>
                    `<span class="line-mask" style="display:block;clip-path:inset(100% 0 0 0)">${line}</span>`
                ).join('');
            } else {
                h.innerHTML = `<span class="line-mask" style="display:block;clip-path:inset(100% 0 0 0)">${h.textContent}</span>`;
            }

            gsap.to(h.querySelectorAll('.line-mask'), {
                clipPath: 'inset(0% 0 0 0)',
                duration: 1,
                stagger: 0.2,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: h,
                    start: 'top 80%'
                }
            });

            // Анимированный золотой градиент на ключевых словах
            if (h.classList.contains('text-gradient') || h.querySelector('.text-gradient')) {
                const gradientEl = h.classList.contains('text-gradient') ? h : h.querySelector('.text-gradient');
                gsap.to(gradientEl, {
                    backgroundPosition: '200% center',
                    duration: 3,
                    repeat: -1,
                    ease: 'linear',
                    backgroundSize: '200% 100%'
                });
            }
        });
    },

    // 7. Scroll progress indicator
    initScrollProgress() {
        const progress = document.createElement('div');
        progress.className = 'scroll-progress';
        progress.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, var(--color-gold), var(--color-gold-light));
            z-index: 9998;
            transform-origin: left;
            transform: scaleX(0);
            box-shadow: 0 0 10px rgba(212, 168, 83, 0.5);
        `;
        document.body.appendChild(progress);

        gsap.to(progress, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.3
            }
        });
    },

    // 8. Marquee-лента между секциями
    initMarquee() {
        const marquees = document.querySelectorAll('.marquee');
        marquees.forEach(marquee => {
            const content = marquee.querySelector('.marquee-content');
            if (!content) return;
            const text = content.textContent;
            // Дублируем для бесшовного loop
            content.innerHTML = (text + ' ').repeat(10);

            gsap.to(content, {
                x: '-50%',
                duration: 40,
                repeat: -1,
                ease: 'none'
            });
        });
    },

    // 10. Touch ripple — золотое свечение в точке касания (мобильная тактильность 2026)
    initTouchRipple() {
        const targets = document.querySelectorAll('.pricing-card, .catalog-card, .cta-btn, .pricing-cta');
        targets.forEach(el => {
            el.classList.add('ripple-host');
            el.addEventListener('pointerdown', (e) => {
                const rect = el.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const r = document.createElement('span');
                r.className = 'touch-ripple';
                r.style.width = r.style.height = size + 'px';
                r.style.left = (e.clientX - rect.left - size / 2) + 'px';
                r.style.top = (e.clientY - rect.top - size / 2) + 'px';
                el.appendChild(r);
                r.addEventListener('animationend', () => r.remove());
            }, { passive: true });
        });
    },

    // 11. Свайп-подсказка в отзывах: лента чуть сдвигается и упруго возвращается
    initReviewsNudge() {
        const strip = document.querySelector('.reviews .marquee');
        if (!strip) return;
        let done = false;
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting && !done && strip.scrollLeft === 0) {
                    done = true;
                    gsap.to(strip, {
                        scrollLeft: 70, duration: 0.5, delay: 0.4, ease: 'power2.out',
                        onComplete: () => gsap.to(strip, { scrollLeft: 0, duration: 0.7, ease: 'back.out(1.6)' })
                    });
                    io.disconnect();
                }
            });
        }, { threshold: 0.5 });
        io.observe(strip);
    },

    // 12. Многослойный параллакс hero: туман и орбы едут с разной скоростью
    initHeroParallaxLayers() {
        const fog = document.querySelector('.hero-fog-layer');
        if (fog) {
            gsap.to(fog, {
                yPercent: 15, ease: 'none',
                scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 }
            });
        }
        gsap.utils.toArray('.hero-float').forEach(f => {
            gsap.to(f, {
                yPercent: -25, ease: 'none',
                scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 }
            });
        });
    },

    // 9. Noise-текстура overlay
    initNoiseTexture() {
        const noise = document.createElement('div');
        noise.className = 'noise-overlay';
        noise.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 9997;
            opacity: 0.03;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E");
            mix-blend-mode: overlay;
        `;
        document.body.appendChild(noise);
    }
};

// Auto-init when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => AwwwardsEffects.init(), 100);
    });
} else {
    setTimeout(() => AwwwardsEffects.init(), 100);
}
