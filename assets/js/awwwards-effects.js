/**
 * Awwwards 2026 Effects для МирСказок
 * Кинематографичные эффекты, scroll-storytelling, 3D transforms
 */

const AwwwardsEffects = {
    init() {
        if (window.prefersReducedMotion) {
            console.log('[A11Y] Reduced motion mode: advanced effects disabled');
            // Счётчики без анимации — сразу финальные значения
            document.querySelectorAll('[data-count]').forEach(el => {
                el.textContent = parseFloat(el.dataset.count).toFixed(parseInt(el.dataset.dec || 0));
            });
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
        this.initKineticHeadings();
        this.initFairyDust();
        this.initSpringCounters();
        this.initAmbientDust();
        this.initAmbientOrbs();
        this.initIdleFloat();
        this.initHeroDome();
        this.initMorphScrub();
        this.initXXLWord();
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
        const cards = document.querySelectorAll('.catalog-card, .style-showcase-card, .pricing-card');

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

    // 13. Kinetic-заголовки: слова проявляются из blur при скролле
    initKineticHeadings() {
        document.querySelectorAll('.section-header h2').forEach(h => {
            const hadGradient = h.classList.contains('text-gradient');
            const words = h.textContent.trim().split(/\s+/);
            if (!words.length) return;
            // Градиент переносим на слова: transform на детях ломает background-clip родителя
            if (hadGradient) h.classList.remove('text-gradient');
            h.innerHTML = words.map(w =>
                `<span class="kin-word" style="opacity:0">${w}</span>`
            ).join(' ');

            gsap.to(h.querySelectorAll('.kin-word'), {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.7,
                stagger: 0.09,
                ease: 'power3.out',
                startAt: { opacity: 0, y: 22, filter: 'blur(8px)' },
                scrollTrigger: { trigger: h, start: 'top 85%' }
            });
        });
    },

    // 14. Волшебная пыльца за пальцем/курсором в hero
    initFairyDust() {
        const hero = document.querySelector('.hero');
        if (!hero) return;
        let last = 0;
        let alive = 0;
        const MAX_ALIVE = 40; // потолок частиц для слабых телефонов
        hero.addEventListener('pointermove', (e) => {
            const now = performance.now();
            if (now - last < 30 || alive >= MAX_ALIVE) return;
            last = now;
            const rect = hero.getBoundingClientRect();
            for (let i = 0; i < 2; i++) {
                const d = document.createElement('span');
                d.className = 'fairy-dust';
                const size = 4 + Math.random() * 6;
                d.style.width = d.style.height = size + 'px';
                d.style.left = (e.clientX - rect.left + (Math.random() - 0.5) * 18) + 'px';
                d.style.top = (e.clientY - rect.top + (Math.random() - 0.5) * 18) + 'px';
                hero.appendChild(d);
                alive++;
                d.addEventListener('animationend', () => { d.remove(); alive--; });
            }
        }, { passive: true });
    },

    // 15. Пружинные счётчики цифр (stats-row в каталоге)
    initSpringCounters() {
        const els = document.querySelectorAll('[data-count]');
        if (!els.length) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                const el = en.target;
                io.unobserve(el);
                const target = parseFloat(el.dataset.count);
                const dec = parseInt(el.dataset.dec || 0);
                const start = performance.now();
                const dur = 1400;
                (function tick(t) {
                    const p = Math.min(1, (t - start) / dur);
                    const s = 1 - Math.pow(1 - p, 3) * Math.cos(p * 4);
                    el.textContent = (target * Math.min(s, 1)).toFixed(dec);
                    if (p < 1) requestAnimationFrame(tick);
                    else el.textContent = target.toFixed(dec);
                })(start);
            });
        }, { threshold: 0.6 });
        els.forEach(el => io.observe(el));
    },

    // 16. Сквозная живая пыльца через ВЕСЬ сайт (ambient layer, стиль Dala/refero)
    initAmbientDust() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;';
        document.body.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let W, H;
        const resize = () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
        resize();
        addEventListener('resize', resize);

        const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 500;
        const N = lowEnd ? 26 : 60;
        // 85% золото + 15% акценты (фиолет/бирюза) — как мультицвет в референсе
        const palettes = [
            () => `hsla(${40 + Math.random() * 12}, 70%, ${60 + Math.random() * 18}%,`,
            () => `hsla(${262 + Math.random() * 16}, 60%, 68%,`,
            () => `hsla(${175 + Math.random() * 14}, 55%, 62%,`,
        ];
        const parts = [];
        for (let i = 0; i < N; i++) {
            const pal = Math.random() < 0.85 ? 0 : (Math.random() < 0.5 ? 1 : 2);
            parts.push({
                x: Math.random(), y: Math.random(),
                s: 0.8 + Math.random() * 1.8,
                vy: 0.00016 + Math.random() * 0.0003,
                drift: Math.random() * Math.PI * 2,
                a: 0.12 + Math.random() * 0.3,
                tri: Math.random() < 0.5,
                col: palettes[pal](),
            });
        }

        let lastScroll = scrollY, scrollVel = 0;
        const tick = () => {
            scrollVel += ((scrollY - lastScroll) * 0.06 - scrollVel) * 0.1;
            lastScroll = scrollY;
            ctx.clearRect(0, 0, W, H);
            const t = performance.now() * 0.001;
            for (const p of parts) {
                p.y -= p.vy + scrollVel * 0.0004;
                p.x += Math.sin(t * 0.6 + p.drift) * 0.0002;
                if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
                if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
                const X = p.x * W, Y = p.y * H, s = p.s;
                const twinkle = p.a * (0.65 + 0.35 * Math.sin(t * 1.4 + p.drift * 3));
                ctx.fillStyle = p.col + twinkle + ')';
                if (p.tri) {
                    ctx.beginPath();
                    ctx.moveTo(X, Y - s);
                    ctx.lineTo(X + s, Y + s);
                    ctx.lineTo(X - s, Y + s);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(X, Y, s * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            requestAnimationFrame(tick);
        };
        tick();
    },

    // 17. Дрейфующие золотые свечения в фоне каждой секции
    initAmbientOrbs() {
        const sections = document.querySelectorAll('.catalog, .pricing, .reviews, .faq, .comparison, .guarantee, .book-preview');
        sections.forEach((sec, si) => {
            const cs = getComputedStyle(sec);
            if (cs.position === 'static') sec.style.position = 'relative';
            sec.style.overflow = 'hidden';
            for (let i = 0; i < 2; i++) {
                const orb = document.createElement('div');
                orb.className = 'ambient-orb';
                orb.style.left = (i === 0 ? 5 + (si % 3) * 10 : 60 + (si % 4) * 8) + '%';
                orb.style.top = (i === 0 ? 15 : 55) + '%';
                orb.style.animationDelay = (si * 1.7 + i * 4) + 's';
                orb.style.animationDuration = (14 + si * 2 + i * 5) + 's';
                sec.prepend(orb);
            }
        });
    },

    // 18. Idle-float: элементы едва заметно дышат в покое.
    // ВАЖНО: float вешаем на ДЕТЕЙ карточек, не на сами карточки — на карточках
    // transform занят GSAP (entrance + 3D tilt), CSS-анимация его перебила бы.
    initIdleFloat() {
        const targets = document.querySelectorAll(
            '.catalog-card img, .emotion-card img, .guarantee-icon, .comparison-icon, .step-number, .hero-badge'
        );
        targets.forEach((el, i) => {
            el.classList.add('idle-float');
            el.style.animationDelay = (i % 5) * 0.9 + 's';
            el.style.animationDuration = (6 + (i % 4)) + 's';
        });
    },

    // 19. Купол-созвездие из пыльцы над hero-заголовком (сцена A, стиль Dala)
    initHeroDome() {
        const hero = document.querySelector('.hero');
        if (!hero) return;
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
        hero.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        let W, H;
        const resize = () => { W = canvas.width = hero.offsetWidth; H = canvas.height = hero.offsetHeight; };
        resize();
        addEventListener('resize', resize);

        const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 500;
        const N = lowEnd ? 380 : 900;
        const parts = [];
        for (let i = 0; i < N; i++) {
            // Цель: дуга-купол над контентом. Угол по полукругу, радиус с разбросом.
            const th = Math.PI * (0.08 + Math.random() * 0.84);
            const rr = 0.34 + Math.random() * 0.1;
            const violet = Math.random() < 0.12;
            const teal = !violet && Math.random() < 0.06;
            parts.push({
                x: Math.random(), y: Math.random(),
                vx: 0, vy: 0,
                tx: 0.5 + Math.cos(th) * rr * 1.15,
                ty: 0.44 - Math.sin(th) * rr,
                s: 0.8 + Math.random() * 2,
                hue: violet ? 268 : teal ? 180 : 40 + Math.random() * 14,
                sat: violet || teal ? 55 : 68,
                ph: Math.random() * Math.PI * 2,
            });
        }

        let px = -9, py = -9;
        hero.addEventListener('pointermove', e => {
            const r = hero.getBoundingClientRect();
            px = (e.clientX - r.left) / W;
            py = (e.clientY - r.top) / H;
        }, { passive: true });
        hero.addEventListener('pointerleave', () => { px = py = -9; });

        const born = performance.now();
        const tick = () => {
            // Купол рисуем только пока hero на экране
            if (hero.getBoundingClientRect().bottom < 0) { requestAnimationFrame(tick); return; }
            const age = Math.min(1, (performance.now() - born) / 2600);
            const t = performance.now() * 0.001;
            ctx.clearRect(0, 0, W, H);
            for (const p of parts) {
                const wob = Math.sin(t * 0.8 + p.ph) * 0.004;
                p.vx += (p.tx + wob - p.x) * 0.0022 * (0.2 + age);
                p.vy += (p.ty + wob * 0.6 - p.y) * 0.0022 * (0.2 + age);
                const dx = p.x - px, dy = p.y - py;
                const d2 = dx * dx + dy * dy;
                if (d2 < 0.018) { p.vx += dx / d2 * 0.00035; p.vy += dy / d2 * 0.00035; }
                p.vx *= 0.9; p.vy *= 0.9;
                p.x += p.vx; p.y += p.vy;
                const X = p.x * W, Y = p.y * H, s = p.s;
                ctx.globalAlpha = (0.25 + age * 0.55) * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph * 2));
                ctx.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${60 + (p.s * 9 | 0)}%)`;
                ctx.beginPath();
                ctx.moveTo(X, Y - s);
                ctx.lineTo(X + s, Y + s);
                ctx.lineTo(X - s, Y + s);
                ctx.closePath();
                ctx.fill();
            }
            requestAnimationFrame(tick);
        };
        tick();
    },

    // 20. Скролл-морф «до/после» (сцена B): шторка едет от скролла + светящаяся линия
    initMorphScrub() {
        const container = document.querySelector('.before-after-container');
        const slider = container && container.querySelector('.before-after-slider');
        const beforeImg = container && container.querySelector('.before-img');
        if (!container || !slider || !beforeImg) return;

        let userTouched = false;
        container.addEventListener('pointerdown', () => userTouched = true, { once: true });

        const proxy = { p: 8 };
        gsap.to(proxy, {
            p: 92,
            ease: 'none',
            scrollTrigger: {
                trigger: container,
                start: 'top 85%',
                end: 'bottom 25%',
                scrub: 0.6,
            },
            onUpdate: () => {
                if (userTouched) return; // клиент взял управление — не мешаем
                slider.style.left = proxy.p + '%';
                beforeImg.style.clipPath = `inset(0 ${100 - proxy.p}% 0 0)`;
            }
        });

        // Светящаяся золотая линия на границе морфа
        slider.style.boxShadow = '0 0 18px 3px rgba(240,205,138,0.8), 0 0 46px 8px rgba(212,168,83,0.35)';
    },

    // 21. XXL-слово с живым золотом (сцена D) — скейл от скролла
    initXXLWord() {
        const word = document.querySelector('.xxl-word');
        if (!word) return;
        gsap.fromTo(word,
            { scale: 0.7, letterSpacing: '-0.04em' },
            {
                scale: 1.15,
                letterSpacing: '0.02em',
                ease: 'none',
                scrollTrigger: {
                    trigger: word.parentElement,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.8,
                }
            }
        );
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
