/* ============================================================
  ABHINAYAM, CINEMATIC STORYTELLING ENGINE
  GSAP + ScrollTrigger + Lenis + Canvas Particles + Web Audio
  ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // B1: mark that scripting is active, then bail gracefully if the
  // animation libraries are missing (CDN failure → readable static page).
  document.documentElement.classList.add('js');
  const libsOk = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof Lenis !== 'undefined';
  if (!libsOk) {
    document.documentElement.classList.add('engine-fallback');
    return;
  }

  // B1: scripting + animation libraries are active → drop the no-js gate so
  // the reveal styles (html.js .content-block { opacity:0 }) apply. Without
  // this, html retains `no-js`, whose `.content-block { … !important }` rule
  // overrides the GSAP inline styles and permanently disables the reveals.
  document.documentElement.classList.remove('no-js');

  // --------------------------------------------------------
  // 0. REDUCED MOTION DETECTION
  // --------------------------------------------------------
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --------------------------------------------------------
  // 1. LENIS SMOOTH SCROLL
  // --------------------------------------------------------
  const lenis = new Lenis({
    duration: 1.6,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
    infinite: false,
  });

  // R1: guarded storage (private mode / disabled cookies never throw)
  const makeSafeStore = (storage) => ({
    get(key) { try { return storage ? storage.getItem(key) : null; } catch (e) { return null; } },
    set(key, value) { try { if (storage) storage.setItem(key, value); } catch (e) { /* noop */ } }
  });
  let localBacking = null, sessionBacking = null;
  try { localBacking = window.localStorage; } catch (e) { /* noop */ }
  try { sessionBacking = window.sessionStorage; } catch (e) { /* noop */ }
  const safeStore = makeSafeStore(localBacking);
  const safeSession = makeSafeStore(sessionBacking);

  // Save reading progress (throttled to at most ~3 writes/sec of scroll)
  const pathParts = window.location.pathname.split('/');
  const rawFileName = pathParts[pathParts.length - 1];
  const storyId = decodeURIComponent(rawFileName).replace('.html', '').trim();
  let lastProgressSave = 0;

  // Accessible progress bar (item 28): expose ARIA progress with live value
  const progressBarEl = document.getElementById('progress-bar');
  if (progressBarEl) {
    progressBarEl.setAttribute('role', 'progressbar');
    progressBarEl.setAttribute('aria-valuemin', '0');
    progressBarEl.setAttribute('aria-valuemax', '100');
    progressBarEl.setAttribute('aria-valuenow', '0');
    progressBarEl.setAttribute('aria-label', 'Reading progress');
  }
  function setProgressAria(progress) {
    if (progressBarEl) progressBarEl.setAttribute('aria-valuenow', String(progress));
  }

  lenis.on('scroll', (e) => {
    if (e.limit <= 0) return;
    const progress = Math.min(100, Math.round((e.scroll / e.limit) * 100));
    setProgressAria(progress);
    
    // Find current chapter
    const chapters = document.querySelectorAll('.chapter-section');
    let activeChapterTitle = 'Introduction';
    chapters.forEach(ch => {
      const rect = ch.getBoundingClientRect();
      if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
        const titleEl = ch.querySelector('.chapter-title');
        if (titleEl) {
          activeChapterTitle = titleEl.textContent.trim();
        }
      }
    });

    const titleEl = document.querySelector('.landing-title');
    const storyTitle = titleEl ? titleEl.textContent.trim() : document.title.split(', ')[0].split('|')[0].trim();

    const now = Date.now();
    if (now - lastProgressSave > 300) {
      lastProgressSave = now;
      safeStore.set(`wr-progress-${storyId}`, JSON.stringify({
        id: storyId,
        title: storyTitle,
        percentage: progress,
        chapter: activeChapterTitle,
        url: window.location.href,
        timestamp: now
      }));
    }
  });

  // Sync GSAP ScrollTrigger with Lenis
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);


  // --------------------------------------------------------
  // 2. PRELOADER
  // --------------------------------------------------------
  const preloader = document.getElementById('preloader');
  const coverImg = document.getElementById('cover-img');

  let preloaderFinished = false;
  let landingStarted = false;
  function initLandingOnce() {
    if (landingStarted) return;
    landingStarted = true;
    initLandingAnimations();
  }

  function finishPreloader() {
    if (preloaderFinished) return;
    preloaderFinished = true;
    safeSession.set(preloadedFlag, '1');
    if (!preloader) { initLandingOnce(); return; }
    gsap.to(preloader, {
      opacity: 0,
      duration: prefersReducedMotion ? 0 : 1,
      ease: 'power2.out',
      onComplete: () => {
        preloader.classList.add('loaded');
        initLandingOnce();
      }
    });
  }

  function hidePreloader() { finishPreloader(); }

  // Skip the cinematic preloader on repeat visits within the same session
  const preloadedFlag = `wr-preloaded-${storyId}`;
  const alreadyPreloaded = safeSession.get(preloadedFlag);
  if (alreadyPreloaded && preloader) {
    // Repeater: single-frame fade so a reader never waits to re-enter
    document.documentElement.classList.add('preloader-skip');
    preloader.classList.add('loaded');
    initLandingOnce();
  } else if (prefersReducedMotion) {
    hidePreloader();
  } else if (coverImg && coverImg.complete) {
    setTimeout(hidePreloader, 1200);
  } else if (coverImg) {
    coverImg.addEventListener('load', () => setTimeout(hidePreloader, 800));
    setTimeout(hidePreloader, 3000); // fallback
  } else {
    setTimeout(hidePreloader, 800);
  }


  // --------------------------------------------------------
  // 3. LANDING ANIMATIONS
  // --------------------------------------------------------
  function initLandingAnimations() {
    if (prefersReducedMotion) {
      // Just show everything immediately
      gsap.set(['#landing-tag', '#landing-title', '#landing-subtitle', '#landing-meta', '#begin-btn', '#scroll-hint'], {
        opacity: 1
      });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.to('#landing-tag', { opacity: 1, y: 0, duration: 1 }, 0.2)
     .fromTo('#landing-title', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.5 }, 0.5)
     .to('#landing-subtitle', { opacity: 1, y: 0, duration: 1.2 }, 0.9)
     .to('#landing-meta', { opacity: 1, y: 0, duration: 1 }, 1.2)
     .to('#begin-btn', { opacity: 1, y: 0, duration: 1 }, 1.5)
     .to('#scroll-hint', { opacity: 0.5, duration: 1.5 }, 2);

    // Set initial hidden states
    gsap.set(['#landing-tag', '#landing-subtitle', '#landing-meta', '#begin-btn'], {
      opacity: 0, y: 25
    });
    gsap.set('#scroll-hint', { opacity: 0 });
  }


  // --------------------------------------------------------
  // 4. CURSOR GLOW
  // --------------------------------------------------------
  const cursorGlow = document.getElementById('cursor-glow');

  if (cursorGlow && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      // Item 23: hide the glow while reading in focus mode or when the tab is hidden
      if (document.hidden || document.body.classList.contains('focus-active')) {
        gsap.to(cursorGlow, { opacity: 0, duration: 0.2 });
        return;
      }
      gsap.to(cursorGlow, {
        left: e.clientX,
        top: e.clientY,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out'
      });
    });
  }


  // --------------------------------------------------------
  // 5. BOOK COVER 3D PARALLAX
  // --------------------------------------------------------
  const cover3d = document.getElementById('cover-3d');
  const coverSheen = cover3d ? cover3d.querySelector('.cover-sheen') : null;

  if (cover3d && !prefersReducedMotion) {
    cover3d.addEventListener('mousemove', (e) => {
      const rect = cover3d.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotX = -(y - cy) / 14;
      const rotY = (x - cx) / 14;

      gsap.to(cover3d, {
        rotationX: rotX,
        rotationY: rotY,
        transformPerspective: 1200,
        ease: 'power3.out',
        duration: 0.6
      });

      // Dynamic light leak
      if (coverSheen) {
        const px = (x / rect.width) * 100;
        coverSheen.style.background = `linear-gradient(${120 - px / 3}deg,
          rgba(255,255,255,0) 30%,
          rgba(255,255,255,${0.03 + (y / rect.height) * 0.06}) 45%,
          rgba(255,255,255,${0.14 * (x / rect.width)}) 50%,
          rgba(255,255,255,0.03) 55%,
          rgba(255,255,255,0) 70%)`;
      }
    });

    cover3d.addEventListener('mouseleave', () => {
      gsap.to(cover3d, {
        rotationX: 4,
        rotationY: -6,
        ease: 'power3.out',
        duration: 0.8
      });
      if (coverSheen) coverSheen.style.background = '';
    });
  }


  // --------------------------------------------------------
  // 6. BEGIN STORY FLOW
  // --------------------------------------------------------
  const beginBtn = document.getElementById('begin-btn');
  const storyWrapper = document.getElementById('story-wrapper');
  const landingSection = document.getElementById('landing');
  const header = document.getElementById('main-header');
  const sidebar = document.getElementById('sidebar-nav');

  let storyStarted = false;

  function startStoryFlow() {
    // B5: re-entry guard — rapid navigator clicks must not duplicate engines
    if (storyStarted) return;
    storyStarted = true;

    // Activate story
    storyWrapper.classList.add('active');
    header.classList.add('visible');
    sidebar.classList.add('visible');

    // Set first chapter theme
    const firstCh = document.querySelector('.chapter-section');
    const firstTheme = firstCh ? firstCh.getAttribute('data-chapter-theme') : 'sunset';
    applyChapterTheme(firstTheme);

    // Cinematic landing exit
    if (!prefersReducedMotion) {
      gsap.to(landingSection, {
        opacity: 0,
        scale: 1.04,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => {
          landingSection.classList.add('exiting');
          landingSection.style.display = 'none';

          // Initialize all scroll-based animations after story is visible
          initScrollAnimations();
        }
      });

      const firstCh = document.querySelector('.chapter-section');
      const firstChId = firstCh ? '#' + firstCh.id : '#ch1';
      lenis.scrollTo(firstChId, {
        duration: 2.5,
        easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        offset: 0,
      });
    } else {
      landingSection.style.display = 'none';
      initScrollAnimations();
      const firstCh = document.querySelector('.chapter-section');
      const firstChId = firstCh ? '#' + firstCh.id : '#ch1';
      lenis.scrollTo(firstChId, { immediate: true });
    }
  }

  if (beginBtn) {
    beginBtn.addEventListener('click', startStoryFlow);
  }

  // Accessibility: the "Skip to story content" link targets #story-wrapper,
  // which the cinematic keeps display:none until the story begins. Activating
  // the link must therefore reveal the story and move focus into it — otherwise
  // the skip target is invisible and focus never leaves the document body.
  const skipLink = document.querySelector('.skip-link[href="#story-wrapper"]');
  if (skipLink) {
    skipLink.addEventListener('click', () => {
      if (!storyStarted) startStoryFlow();
      requestAnimationFrame(() => {
        storyWrapper.setAttribute('tabindex', '-1');
        storyWrapper.focus({ preventScroll: true });
      });
    });
  }


  // --------------------------------------------------------
  // 7. CANVAS PARTICLE SYSTEM
  // --------------------------------------------------------
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let particleColor = { r: 193, g: 18, b: 48 }; // Default crimson
  let targetParticleColor = { r: 193, g: 18, b: 48 };
  let particleAnimFrame = null;

  // Chapter particle configs
  const chapterParticles = {
    landing: { r: 193, g: 18, b: 48, count: 40, sizeMax: 2.5, drift: 0.15, opacityMax: 0.4 },
    sunset:  { r: 226, g: 38, b: 63, count: 50, sizeMax: 3,  drift: 0.2, opacityMax: 0.35 },
    midnight: { r: 168, g: 18, b: 42, count: 35, sizeMax: 2,  drift: 0.08, opacityMax: 0.45 },
    cosmic:  { r: 212, g: 24, b: 51, count: 60, sizeMax: 2.5, drift: 0.12, opacityMax: 0.5 },
    gold:   { r: 226, g: 26, b: 59, count: 45, sizeMax: 2.8, drift: 0.18, opacityMax: 0.38 },
    lavender: { r: 191, g: 17, b: 48, count: 40, sizeMax: 2.2, drift: 0.1, opacityMax: 0.42 },
    calmness: { r: 193, g: 18, b: 48, count: 40, sizeMax: 2.2, drift: 0.1, opacityMax: 0.42 },
    romance: { r: 224, g: 48, b: 80, count: 45, sizeMax: 2.5, drift: 0.15, opacityMax: 0.40 },
    tension: { r: 204, g: 15, b: 40, count: 50, sizeMax: 3,  drift: 0.22, opacityMax: 0.35 },
    fear:   { r: 153, g: 16, b: 35, count: 35, sizeMax: 2,  drift: 0.08, opacityMax: 0.45 },
    sadness: { r: 168, g: 20, b: 44, count: 40, sizeMax: 2.5, drift: 0.1, opacityMax: 0.45 },
    instability: { r: 224, g: 26, b: 56, count: 45, sizeMax: 2.8, drift: 0.18, opacityMax: 0.38 },
    violence: { r: 224, g: 16, b: 46, count: 50, sizeMax: 3.2, drift: 0.25, opacityMax: 0.40 },
    curiosity: { r: 189, g: 17, b: 43, count: 40, sizeMax: 2.2, drift: 0.12, opacityMax: 0.45 },
    release: { r: 200, g: 29, b: 58, count: 35, sizeMax: 2,  drift: 0.08, opacityMax: 0.40 },
    resolution: { r: 193, g: 18, b: 48, count: 40, sizeMax: 2.5, drift: 0.15, opacityMax: 0.40 },
    isolation: { r: 168, g: 16, b: 40, count: 30, sizeMax: 2,  drift: 0.05, opacityMax: 0.45 }
  };

  function initParticles() {
    if (!canvas || !ctx || prefersReducedMotion) return;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const config = chapterParticles.landing;
    createParticleField(config);
    animateParticles();

    // Item 23: gate ambient particles behind Page Visibility + focus mode
    document.addEventListener('visibilitychange', () => { resumeParticleLoop(); });
    document.addEventListener('focus-mode-change', () => { resumeParticleLoop(); });
  }

  function particleGated() {
    return !!document.hidden || document.body.classList.contains('focus-active');
  }
  function resumeParticleLoop() {
    if (particleGated()) return;
    if (!particleAnimFrame) particleAnimFrame = requestAnimationFrame(animateParticles);
  }

  let vw = 0, vh = 0, dpr = 1;
  function resizeCanvas() {
    // S4: render at device-pixel-ratio so particles stay crisp on HiDPI
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
  }

  function createParticleField(config) {
    particles = [];
    const count = Math.min(config.count, 60); // Performance cap
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * vw,
        y: Math.random() * vh,
        size: 0.5 + Math.random() * config.sizeMax,
        speedX: (Math.random() - 0.5) * config.drift,
        speedY: (Math.random() - 0.5) * config.drift * 0.6 - 0.05, // slight upward drift
        opacity: Math.random() * config.opacityMax,
        opacityTarget: Math.random() * config.opacityMax,
        opacitySpeed: 0.002 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function animateParticles() {
    if (!ctx) return;

    // Item 23: stop the loop when the tab is hidden or focus mode is active
    if (particleGated()) {
      particleAnimFrame = null;
      return;
    }

    ctx.clearRect(0, 0, vw, vh);

    // Smoothly interpolate particle color
    particleColor.r += (targetParticleColor.r - particleColor.r) * 0.02;
    particleColor.g += (targetParticleColor.g - particleColor.g) * 0.02;
    particleColor.b += (targetParticleColor.b - particleColor.b) * 0.02;

    const r = Math.round(particleColor.r);
    const g = Math.round(particleColor.g);
    const b = Math.round(particleColor.b);

    particles.forEach(p => {
      p.phase += 0.008;

      // Gentle sine drift
      p.x += p.speedX + Math.sin(p.phase) * 0.15;
      p.y += p.speedY + Math.cos(p.phase * 0.7) * 0.08;

      // Breathing opacity
      p.opacity += (p.opacityTarget - p.opacity) * 0.01;
      if (Math.abs(p.opacity - p.opacityTarget) < 0.01) {
        p.opacityTarget = Math.random() * 0.4;
      }

      // Wrap around edges (logical viewport coords)
      if (p.x < -10) p.x = vw + 10;
      if (p.x > vw + 10) p.x = -10;
      if (p.y < -10) p.y = vh + 10;
      if (p.y > vh + 10) p.y = -10;

      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
      ctx.fill();

      // Glow halo for larger particles
      if (p.size > 1.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.08})`;
        ctx.fill();
      }
    });

    particleAnimFrame = requestAnimationFrame(animateParticles);
  }

  function updateParticleTheme(themeName) {
    const config = chapterParticles[themeName] || chapterParticles.landing;
    targetParticleColor = { r: config.r, g: config.g, b: config.b };
  }

  // Initialize particles immediately
  initParticles();


  // --------------------------------------------------------
  // 8. EMOTIONAL THEME ENGINE
  // --------------------------------------------------------
  let currentTheme = 'landing';

  function applyChapterTheme(themeName) {
    if (themeName === currentTheme) return;
    currentTheme = themeName;

    // Apply CSS data attribute to body for theme vars
    document.body.setAttribute('data-chapter-theme', themeName);

    // Update particle colors
    updateParticleTheme(themeName);
  }


  // --------------------------------------------------------
  // 9. SCROLL ANIMATIONS ENGINE
  // --------------------------------------------------------
  function initScrollAnimations() {
    initChapterEntrances();
    initContentBlockAnimations();
    initWordReveals();
    initSeparatorAnimations();
    initProgressBar();
    initScrollSpy();
  }

  // ---- Chapter Entrance Animations ----
  function initChapterEntrances() {
    const chapters = document.querySelectorAll('.chapter-section');

    chapters.forEach((chapter) => {
      const intro = chapter.querySelector('.chapter-intro-inner');
      const watermark = chapter.querySelector('.chapter-watermark');
      const numLabel = chapter.querySelector('.chapter-num-label');
      const title = chapter.querySelector('.chapter-title');
      const synopsis = chapter.querySelector('.chapter-synopsis');
      const scrollCue = chapter.querySelector('.chapter-scroll-cue');

      if (!intro) return;

      if (prefersReducedMotion) {
        // Just show everything
        gsap.set([numLabel, title, synopsis, scrollCue], { opacity: 1 });
        return;
      }

      // Set initial states
      gsap.set(numLabel, { opacity: 0, y: 20 });
      gsap.set(title, { opacity: 0, y: 40, scale: 0.95 });
      gsap.set(synopsis, { opacity: 0, y: 20 });
      gsap.set(scrollCue, { opacity: 0 });
      if (watermark) gsap.set(watermark, { opacity: 0, scale: 3 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: chapter,
          start: 'top 80%',
          end: 'top 20%',
          toggleActions: 'play none none reverse',
        }
      });

      if (watermark) {
        tl.to(watermark, {
          opacity: 1,
          scale: 1,
          duration: 2,
          ease: 'power2.out'
        }, 0);
      }

      tl.to(numLabel, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out'
      }, 0.3)
      .to(title, {
        opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out'
      }, 0.5)
      .to(synopsis, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out'
      }, 0.9)
      .to(scrollCue, {
        opacity: 0.6, duration: 1.2, ease: 'power2.out'
      }, 1.3);
    });
  }

  // ---- Content Block Varied Animations ----
  function initContentBlockAnimations() {
    const blocks = document.querySelectorAll('.content-block:not(.scene-separator):not(.special-reveal):not(.quote-block)');

    blocks.forEach((block, index) => {
      if (prefersReducedMotion) {
        gsap.set(block, { opacity: 1 });
        return;
      }

      // Determine animation type based on block content
      const isDialogue = block.classList.contains('dialogue-block');

      if (isDialogue) {
        // Dialogue: slide in from left
        gsap.set(block, { opacity: 0, x: -30, filter: 'blur(4px)' });

        ScrollTrigger.create({
          trigger: block,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(block, {
              opacity: 1, x: 0, filter: 'blur(0px)',
              duration: 1, ease: 'power3.out',
              overwrite: 'auto'
            });

            // Stagger dialogue items
            const items = block.querySelectorAll('.dialogue-item');
            gsap.fromTo(items, {
              opacity: 0, y: 15
            }, {
              opacity: 1, y: 0,
              duration: 0.7,
              stagger: 0.15,
              ease: 'power3.out',
              delay: 0.3
            });
          },
          onEnterBack: () => {
            gsap.to(block, {
              opacity: 1, x: 0, filter: 'blur(0px)',
              duration: 0.6, ease: 'power3.out', overwrite: 'auto'
            });
          }
        });
      } else {
        // Standard paragraph: blur + fade up with varied direction
        const direction = index % 3 === 0 ? 35 : index % 3 === 1 ? 25 : 40;

        gsap.set(block, { opacity: 0, y: direction, filter: 'blur(6px)' });

        ScrollTrigger.create({
          trigger: block,
          start: 'top 88%',
          onEnter: () => {
            gsap.to(block, {
              opacity: 1, y: 0, filter: 'blur(0px)',
              duration: 1.2 + (index % 3) * 0.15,
              ease: 'power3.out',
              overwrite: 'auto'
            });
          },
          onEnterBack: () => {
            gsap.to(block, {
              opacity: 1, y: 0, filter: 'blur(0px)',
              duration: 0.7, ease: 'power3.out', overwrite: 'auto'
            });
          }
        });
      }
    });

    // Quotes: scale up from center with glow
    const quotes = document.querySelectorAll('.quote-block');
    quotes.forEach(q => {
      if (prefersReducedMotion) { gsap.set(q, { opacity: 1 }); return; }

      gsap.set(q, { opacity: 0, scale: 0.92, filter: 'blur(6px)' });

      ScrollTrigger.create({
        trigger: q,
        start: 'top 82%',
        onEnter: () => {
          gsap.to(q, {
            opacity: 1, scale: 1, filter: 'blur(0px)',
            duration: 1.4, ease: 'power3.out', overwrite: 'auto'
          });
        },
        onEnterBack: () => {
          gsap.to(q, {
            opacity: 1, scale: 1, filter: 'blur(0px)',
            duration: 0.8, ease: 'power3.out', overwrite: 'auto'
          });
        }
      });
    });
  }

  // ---- Word-by-Word Scroll-Linked Reveals ----
  function initWordReveals() {
    const reveals = document.querySelectorAll('[data-reveal="word"]');

    reveals.forEach(container => {
      if (prefersReducedMotion) {
        gsap.set(container, { opacity: 1 });
        const wordEls = container.querySelectorAll('.word');
        wordEls.forEach(w => w.classList.add('visible'));
        return;
      }

      // Find all .word-reveal text containers
      const wordContainers = container.querySelectorAll('.word-reveal');

      wordContainers.forEach(wc => {
        // Split text into individual words. Snapshot the raw text once so a
        // re-init (replay, re-entry) never double-wraps existing .word spans.
        if (!wc.dataset.raw) wc.dataset.raw = wc.textContent.trim();
        const words = wc.dataset.raw.split(/\s+/);
        const wrapped = words.map(w => `<span class="word">${w}</span>`).join(' ');
        if (wc.innerHTML !== wrapped) wc.innerHTML = wrapped;
      });

      // First, fade in the main thought
      const mainP = container.querySelector('.lone-thought > p:first-child');
      if (mainP) {
        gsap.set(mainP, { opacity: 0, y: 15 });

        ScrollTrigger.create({
          trigger: container,
          start: 'top 75%',
          onEnter: () => {
            gsap.to(mainP, {
              opacity: 1, y: 0, duration: 1.2, ease: 'power3.out'
            });
          },
          onEnterBack: () => {
            gsap.to(mainP, {
              opacity: 1, y: 0, duration: 0.6, ease: 'power3.out'
            });
          }
        });
      }

      // Word-by-word scroll-linked reveal for the dim thought
      const allWords = container.querySelectorAll('.word');
      if (allWords.length > 0) {
        gsap.set(container, { opacity: 1 });

        // Create a scroll-scrubbed animation for each word
        const wordTl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: 'top 65%',
            end: 'bottom 35%',
            scrub: 0.8,
          }
        });

        allWords.forEach((word, i) => {
          wordTl.to(word, {
            opacity: 1,
            duration: 0.1,
            ease: 'none'
          }, i * 0.08);
        });
      }
    });
  }

  // ---- Separator Animations ----
  function initSeparatorAnimations() {
    const seps = document.querySelectorAll('.scene-separator');

    seps.forEach(sep => {
      if (prefersReducedMotion) { gsap.set(sep, { opacity: 0.4 }); return; }

      gsap.set(sep, { opacity: 0 });

      const lines = sep.querySelectorAll('.separator-line');
      const diamond = sep.querySelector('.separator-diamond');

      gsap.set(lines, { scaleX: 0 });
      if (diamond) gsap.set(diamond, { scale: 0, rotation: 0 });

      ScrollTrigger.create({
        trigger: sep,
        start: 'top 85%',
        onEnter: () => {
          gsap.to(sep, { opacity: 0.5, duration: 0.5 });
          gsap.to(lines, { scaleX: 1, duration: 1, ease: 'power3.out', stagger: 0.1 });
          if (diamond) gsap.to(diamond, { scale: 1, rotation: 45, duration: 0.8, ease: 'back.out(2)', delay: 0.3 });
        }
      });
    });
  }

  // ---- Progress Bar ----
  function initProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;

    gsap.to(progressBar, {
      width: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      }
    });
  }

  // ---- ScrollSpy (Chapter Navigation) ----
  function initScrollSpy() {
    const chapters = document.querySelectorAll('.chapter-section');
    const dots = document.querySelectorAll('.chapter-dot');
    const sidebarItems = document.querySelectorAll('.sidebar-item');

    chapters.forEach((chapter, index) => {
      const theme = chapter.getAttribute('data-chapter-theme');

      ScrollTrigger.create({
        trigger: chapter,
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => {
          activateChapter(index, theme);
        },
        onEnterBack: () => {
          activateChapter(index, theme);
        }
      });
    });

    function activateChapter(index, theme) {
      // Theme transition
      applyChapterTheme(theme);

      // Update nav dots
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });

      // Update sidebar
      sidebarItems.forEach((item, i) => {
        item.classList.toggle('active', i === index);
      });
    }

    // Click handlers for navigation
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const target = dot.getAttribute('data-target');
        ensureStoryVisible();
        lenis.scrollTo(target, { duration: 2, offset: 0 });
      });
    });

    sidebarItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        ensureStoryVisible();
        lenis.scrollTo(target, { duration: 2, offset: 0 });
      });
    });
  }

  function ensureStoryVisible() {
    if (!storyWrapper.classList.contains('active')) {
      startStoryFlow();
    }
  }


  // --------------------------------------------------------
  // 10. FOCUS MODE
  // --------------------------------------------------------
  const focusBtn = document.getElementById('focus-btn');
  const focusOnIcon = focusBtn ? focusBtn.querySelector('.icon-focus-on') : null;
  const focusOffIcon = focusBtn ? focusBtn.querySelector('.icon-focus-off') : null;
  const focusIndicator = document.querySelector('.focus-indicator');

  function setFocusMode(active) {
    const wasActive = document.body.classList.contains('focus-active');
    if (active === wasActive) return;
    document.body.classList.toggle('focus-active', active);

    if (focusBtn) focusBtn.setAttribute('aria-pressed', active ? 'true' : 'false');

    // Notify ambient systems (particles, cursor glow) to pause/resume
    document.dispatchEvent(new CustomEvent('focus-mode-change', { detail: { active } }));

    if (focusOnIcon && focusOffIcon) {
      focusOnIcon.classList.toggle('icon-hidden', active);
      focusOffIcon.classList.toggle('icon-hidden', !active);
    }

    if (!active) {
      header.classList.remove('focus-peek');
    }

    // S2: announce state change through the aria-live indicator
    if (focusIndicator) {
      focusIndicator.textContent = active
        ? 'Focus mode on — Escape exits'
        : 'Focus mode off';
    }
  }

  if (focusBtn) {
    focusBtn.addEventListener('click', () => {
      setFocusMode(!document.body.classList.contains('focus-active'));
    });

    // Reveal header on hover near top in focus mode (fine pointer)
    window.addEventListener('mousemove', (e) => {
      if (document.body.classList.contains('focus-active')) {
        header.classList.toggle('focus-peek', e.clientY < 70);
      }
    });

    // R3: reveal the header on keyboard focus within it too
    header.addEventListener('focusin', () => {
      if (document.body.classList.contains('focus-active')) {
        header.classList.add('focus-peek');
      }
    });
    header.addEventListener('focusout', (e) => {
      if (document.body.classList.contains('focus-active') && !header.contains(e.relatedTarget)) {
        header.classList.remove('focus-peek');
      }
    });
  }

  // S1: Escape exits focus mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('focus-active')) {
      setFocusMode(false);
      if (focusBtn) focusBtn.focus();
    }
  });


  // --------------------------------------------------------
  // 11. REPLAY EXPERIENCE
  // --------------------------------------------------------
  const replayBtn = document.getElementById('replay-btn');

  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      // Re-show landing
      landingSection.style.display = '';
      landingSection.classList.remove('exiting');
      storyStarted = false; // allow startStoryFlow to run again

      gsap.to(landingSection, {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'power3.out'
      });

      // Hide story
      storyWrapper.classList.remove('active');
      header.classList.remove('visible');
      sidebar.classList.remove('visible');

      // Reset theme
      document.body.removeAttribute('data-chapter-theme');
      currentTheme = 'landing';
      updateParticleTheme('landing');

      // Scroll to top
      lenis.scrollTo(0, { immediate: true });

      // Kill existing ScrollTriggers and recreate on next begin
      ScrollTrigger.getAll().forEach(st => st.kill());
      initProgressBar(); // Keep progress bar
    });
  }


  // --------------------------------------------------------
  // 13. PERFORMANCE: Visibility Change
  // --------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (particleAnimFrame) {
        cancelAnimationFrame(particleAnimFrame);
        particleAnimFrame = null;
      }
    } else {
      if (!particleAnimFrame && !prefersReducedMotion && ctx) {
        animateParticles();
      }
    }
  });


  // --------------------------------------------------------
  // 14. HEADER BRAND CLICK → Scroll to Top
  // --------------------------------------------------------
  const headerBrand = document.getElementById('header-brand');
  if (headerBrand) {
    headerBrand.addEventListener('click', () => {
      lenis.scrollTo(0, { duration: 2 });
    });
    headerBrand.style.cursor = 'pointer';
  }

});
