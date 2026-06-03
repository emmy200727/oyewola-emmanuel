/*
   EMMANUEL OYEWOLA - CINEMATIC PORTFOLIO JAVASCRIPT
   HIGH-END WEB GL & GSAP SCROLL EXPERIENCE FOR DESIGN ALCHEMY
*/

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. ASSET PRELOADER & SPLASH SCREEN SYSTEM
    // -------------------------------------------------------------------------
    const preloader = document.getElementById('preloader');
    const loaderBar = document.getElementById('loader-bar');
    const loaderPercentage = document.getElementById('loader-percentage');
    
    // Check if user has already visited in this session
    const hasVisited = sessionStorage.getItem('alchemy_visited');
    
    // Total simulated loading time (must not exceed 2s per requirements)
    const loadDuration = hasVisited ? 400 : 1600; // instant bypass if visited
    const startTime = Date.now();
    
    function updateLoader() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / loadDuration, 1);
        
        loaderBar.style.width = `${progress * 100}%`;
        loaderPercentage.textContent = `${Math.round(progress * 100)}%`;
        
        if (progress < 1) {
            requestAnimationFrame(updateLoader);
        } else {
            // Smooth Out Transition
            gsap.to(preloader, {
                opacity: 0,
                duration: 0.6,
                ease: "power2.out",
                onComplete: () => {
                    preloader.style.display = 'none';
                    sessionStorage.setItem('alchemy_visited', 'true');
                    triggerEntranceAnimations();
                }
            });
        }
    }
    
    updateLoader();

    // -------------------------------------------------------------------------
    // 2. ENTRANCE ANIMATIONS (GSAP)
    // -------------------------------------------------------------------------
    gsap.registerPlugin(ScrollTrigger);

    function triggerEntranceAnimations() {
        const tl = gsap.timeline();
        
        tl.from(".reveal-tag", { opacity: 0, y: 15, duration: 0.6, ease: "power2.out" })
          .from(".reveal-title", { opacity: 0, y: 25, duration: 0.8, ease: "power3.out" }, "-=0.4")
          .from(".reveal-sub", { opacity: 0, y: 15, duration: 0.6, ease: "power2.out" }, "-=0.5")
          .from(".reveal-desc", { opacity: 0, y: 15, duration: 0.6, ease: "power2.out" }, "-=0.5")
          .from(".reveal-ctas", { opacity: 0, y: 15, duration: 0.6, ease: "power2.out" }, "-=0.4")
          .from(".reveal-image", { opacity: 0, scale: 0.95, duration: 1, ease: "power3.out" }, "-=0.8");
          
        // Scroll triggered fades
        gsap.utils.toArray('.service-card').forEach((card, index) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: "top 85%",
                },
                opacity: 0,
                y: 30,
                duration: 0.6,
                delay: index * 0.1,
                ease: "power2.out"
            });
        });
        
        // Setup stats animations
        gsap.utils.toArray('.counter-number').forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            gsap.fromTo(counter, 
                { textContent: 0 },
                {
                    scrollTrigger: {
                        trigger: counter,
                        start: "top 90%",
                    },
                    textContent: target,
                    duration: 1.5,
                    snap: { textContent: 1 },
                    ease: "power1.out",
                    onUpdate: function() {
                        counter.textContent = counter.textContent + "+";
                    }
                }
            );
        });
    }

    // -------------------------------------------------------------------------
    // 3. SOUND EFFECTS ENGINE
    // -------------------------------------------------------------------------
    const clickSound = document.getElementById('click-sound');
    const hoverSound = document.getElementById('hover-sound');
    const muteBtn = document.getElementById('mute-btn');
    let isMuted = true; // Default muted to comply with browser autoplay policies

    function playClick() {
        if (!isMuted && clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => {});
        }
    }

    function playHover() {
        if (!isMuted && hoverSound) {
            hoverSound.currentTime = 0;
            hoverSound.play().catch(() => {});
        }
    }

    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        playClick();
        const icon = muteBtn.querySelector('i');
        if (isMuted) {
            icon.setAttribute('data-lucide', 'volume-x');
            muteBtn.classList.remove('border-[#D4AF37]');
        } else {
            icon.setAttribute('data-lucide', 'volume-2');
            muteBtn.classList.add('border-[#D4AF37]');
        }
        lucide.createIcons(); // refresh icons
    });

    // -------------------------------------------------------------------------
    // 4. CUSTOM DUAL-RING CURSOR SYSTEM
    // -------------------------------------------------------------------------
    const cursorOuter = document.querySelector('.custom-cursor-outer');
    const cursorInner = document.querySelector('.custom-cursor-inner');
    
    let mouseX = 0, mouseY = 0;
    let outerX = 0, outerY = 0;
    let innerX = 0, innerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Inner cursor snaps instantly
        cursorInner.style.left = `${mouseX}px`;
        cursorInner.style.top = `${mouseY}px`;
    });

    // Animate outer ring with ease/interpolation
    function animateCursor() {
        const dx = mouseX - outerX;
        const dy = mouseY - outerY;
        
        outerX += dx * 0.12; // speed factor
        outerY += dy * 0.12;
        
        cursorOuter.style.left = `${outerX}px`;
        cursorOuter.style.top = `${outerY}px`;
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover listeners for custom triggers
    const interactiveElements = document.querySelectorAll('a, button, select, input, textarea, .project-card-item, .service-card, .cs-tab-btn');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorOuter.classList.add('cursor-hover-state');
            cursorInner.classList.add('cursor-hover-inner');
            playHover();
        });
        el.addEventListener('mouseleave', () => {
            cursorOuter.classList.remove('cursor-hover-state');
            cursorInner.classList.remove('cursor-hover-inner');
        });
        el.addEventListener('click', playClick);
    });

    // -------------------------------------------------------------------------
    // 5. THREE.JS 3D WEBGL PARTICLE BACKDROP
    // -------------------------------------------------------------------------
    const container = document.getElementById('canvas-container');
    let scene, camera, renderer, particles, particleGeometry;
    const particleCount = 1200;
    let targetMouseX = 0, targetMouseY = 0;

    function initThree() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 100;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const randomSpeeds = new Float32Array(particleCount);

        for (let i = 0; i < particleCount * 3; i += 3) {
            // Wave network shape base positions
            positions[i] = (Math.random() - 0.5) * 350;     // X coordinate
            positions[i + 1] = (Math.random() - 0.5) * 200; // Y coordinate
            positions[i + 2] = (Math.random() - 0.5) * 100; // Z coordinate
            randomSpeeds[i / 3] = 0.2 + Math.random() * 0.8;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create elegant glowing physical particle material
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(212, 175, 55, 1)'); // solid gold center
        grad.addColorStop(1, 'rgba(212, 175, 55, 0)');  // glowing ring edge
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.PointsMaterial({
            size: 1.8,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        particles = new THREE.Points(particleGeometry, material);
        scene.add(particles);

        // Resize Event
        window.addEventListener('resize', onWindowResize);
        document.addEventListener('mousemove', onThreeMouseMove);
        
        animateThree(randomSpeeds);
    }

    function onThreeMouseMove(e) {
        targetMouseX = (e.clientX - window.innerWidth / 2) * 0.08;
        targetMouseY = (e.clientY - window.innerHeight / 2) * 0.08;
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    let time = 0;
    function animateThree(speeds) {
        requestAnimationFrame(() => animateThree(speeds));
        time += 0.005;

        const positions = particleGeometry.attributes.position.array;

        // Wave formula calculation
        for (let i = 0; i < particleCount; i++) {
            const index = i * 3;
            // Float waves using sine
            positions[index + 1] += Math.sin(time + positions[index] * 0.05) * 0.1 * speeds[i];
            positions[index + 2] += Math.cos(time + positions[index + 1] * 0.05) * 0.05 * speeds[i];
        }
        
        particleGeometry.attributes.position.needsUpdate = true;

        // Smoothly rotate points based on cursor coordinates
        particles.rotation.y += (targetMouseX - particles.rotation.y) * 0.05;
        particles.rotation.x += (targetMouseY - particles.rotation.x) * 0.05;
        particles.rotation.z += 0.0005;

        renderer.render(scene, camera);
    }

    initThree();

    // -------------------------------------------------------------------------
    // 6. PORTRAIT 3D MOUSE PARALLAX TILT
    // -------------------------------------------------------------------------
    const portraitContainer = document.getElementById('portrait-3d-box');
    const portraitWrapper = document.getElementById('portrait-wrapper');

    if (portraitContainer && portraitWrapper) {
        portraitContainer.addEventListener('mousemove', (e) => {
            const rect = portraitContainer.getBoundingClientRect();
            const x = e.clientX - rect.left; // x coordinate inside element
            const y = e.clientY - rect.top;  // y coordinate inside element
            
            const px = (x / rect.width) * 2 - 1; // scale -1 to 1
            const py = (y / rect.height) * 2 - 1;
            
            // Apply 3D rotation transform
            portraitContainer.style.transform = `perspective(1000px) rotateY(${px * 12}deg) rotateX(${-py * 12}deg)`;
            portraitWrapper.style.transform = `translateX(${px * -8}px) translateY(${py * -8}px)`;
        });

        portraitContainer.addEventListener('mouseleave', () => {
            portraitContainer.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
            portraitWrapper.style.transform = 'translateX(0px) translateY(0px)';
        });
    }

    // -------------------------------------------------------------------------
    // 7. TYPEWRITER SUBTEXT EFFECT
    // -------------------------------------------------------------------------
    const typewriter = document.getElementById('typewriter');
    const words = ["scalable brand systems.", "immersive marketing assets.", "luxury visuals.", "high-converting portfolios."];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeEffect() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            typewriter.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typewriter.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
        }
        
        let typeSpeed = isDeleting ? 40 : 80;
        
        if (!isDeleting && charIndex === currentWord.length) {
            typeSpeed = 1500; // wait state at end of word
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 400; // brief delay before typing next word
        }
        
        setTimeout(typeEffect, typeSpeed);
    }
    setTimeout(typeEffect, 1000);

    // -------------------------------------------------------------------------
    // 8. DYNAMIC PROJECT PORTFOLIO FILTER
    // -------------------------------------------------------------------------
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card-item');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active style from all buttons
            filterButtons.forEach(b => b.classList.remove('active', 'border-[#D4AF37]', 'text-[#D4AF37]'));
            btn.classList.add('active', 'border-[#D4AF37]', 'text-[#D4AF37]');
            
            const category = btn.getAttribute('data-filter');
            
            projectCards.forEach(card => {
                const cardCategories = card.getAttribute('data-category').split(' ');
                
                if (category === 'all' || cardCategories.includes(category)) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 400);
                }
            });
        });
    });

    // -------------------------------------------------------------------------
    // 9. CASE STUDY TRANSITIONS SHEET SWITCH
    // -------------------------------------------------------------------------
    window.switchCaseStudy = function(studyName) {
        const panes = document.querySelectorAll('.cs-content-pane');
        const tabBtns = document.querySelectorAll('.cs-tab-btn');
        
        panes.forEach(pane => {
            pane.classList.remove('active');
            pane.classList.add('hidden');
        });
        
        tabBtns.forEach(btn => {
            btn.classList.remove('active', 'border-[#D4AF37]', 'text-[#D4AF37]');
        });
        
        // Find targeted element
        const targetPane = document.getElementById(`cs-content-${studyName}`);
        if (targetPane) {
            targetPane.classList.remove('hidden');
            setTimeout(() => targetPane.classList.add('active'), 50);
        }
        
        // Toggle tab styles
        const triggerBtn = Array.from(tabBtns).find(b => b.getAttribute('onclick').includes(studyName));
        if (triggerBtn) {
            triggerBtn.classList.add('active', 'border-[#D4AF37]', 'text-[#D4AF37]');
        }
    };

    window.openCaseStudy = function(studyName) {
        // Smooth scroll focus down to detailed tab section
        const anchor = document.getElementById('case-studies');
        if (anchor) {
            anchor.scrollIntoView({ behavior: 'smooth' });
            switchCaseStudy(studyName);
        }
    };

    // -------------------------------------------------------------------------
    // 10. TESTIMONIAL SLIDER IMPLEMENTATION
    // -------------------------------------------------------------------------
    let currentSlide = 0;
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('[id^="t-dot-"]');
    let slideTimer;

    window.goToSlide = function(index) {
        currentSlide = index;
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            slide.classList.add('hidden');
            dots[i].classList.replace('bg-[#D4AF37]', 'bg-white/10');
        });
        
        slides[currentSlide].classList.remove('hidden');
        setTimeout(() => slides[currentSlide].classList.add('active'), 50);
        dots[currentSlide].classList.replace('bg-white/10', 'bg-[#D4AF37]');
        
        // Reset auto loop timer on manual press
        resetSlideTimer();
    };

    function nextSlide() {
        const next = (currentSlide + 1) % slides.length;
        goToSlide(next);
    }

    function resetSlideTimer() {
        clearInterval(slideTimer);
        slideTimer = setInterval(nextSlide, 7500);
    }
    
    resetSlideTimer();

    // -------------------------------------------------------------------------
    // 11. SCROLL PROGRESS INDICATOR & ACTIVE NAV
    // -------------------------------------------------------------------------
    const scrollBar = document.getElementById('scroll-progress-bar');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('section');

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = (scrollTop / docHeight) * 100;
        
        if (scrollBar) {
            scrollBar.style.width = `${pct}%`;
        }
        
        // Active section tracking logic
        let currentSec = "";
        sections.forEach(sec => {
            const secTop = sec.offsetTop - 120;
            if (scrollTop >= secTop) {
                currentSec = sec.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').includes(currentSec)) {
                item.classList.add('active');
            }
        });
    });

    // -------------------------------------------------------------------------
    // 12. MOBILE MENU HANDLERS
    // -------------------------------------------------------------------------
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const hLine1 = document.getElementById('hamburger-line-1');
    const hLine2 = document.getElementById('hamburger-line-2');
    const hLine3 = document.getElementById('hamburger-line-3');
    let isMenuOpen = false;

    menuBtn.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        playClick();
        
        if (isMenuOpen) {
            mobileMenu.classList.remove('translate-x-full');
            hLine1.style.transform = 'translateY(8px) rotate(45deg)';
            hLine2.style.opacity = '0';
            hLine3.style.transform = 'translateY(-8px) rotate(-45deg)';
            hLine3.classList.remove('self-end');
            hLine3.classList.add('w-6');
        } else {
            mobileMenu.classList.add('translate-x-full');
            hLine1.style.transform = 'none';
            hLine2.style.opacity = '1';
            hLine3.style.transform = 'none';
            hLine3.classList.add('self-end');
            hLine3.classList.remove('w-6');
        }
    });

    // Close menu when navigation anchors clicked
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-item');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('translate-x-full');
            hLine1.style.transform = 'none';
            hLine2.style.opacity = '1';
            hLine3.style.transform = 'none';
            hLine3.classList.add('self-end');
            hLine3.classList.remove('w-6');
            isMenuOpen = false;
        });
    });

    // -------------------------------------------------------------------------
    // 13. LENIS SMOOTH SCROLL INITIALIZATION
    // -------------------------------------------------------------------------
    try {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true
        });

        function scrollAnimate(time) {
            lenis.raf(time);
            requestAnimationFrame(scrollAnimate);
        }
        requestAnimationFrame(scrollAnimate);
    } catch(e) {
        console.warn("Smooth scroll initialization bypassed due to environment constraints.");
    }

    // Initialize Lucide Icons vectors
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // -------------------------------------------------------------------------
    // 14. LEAD MAG FORMAT SUBMISSION INTERCEPT
    // -------------------------------------------------------------------------
    const form = document.getElementById('alchemy-lead-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        playClick();
        
        const name = document.getElementById('form-name').value;
        const email = document.getElementById('form-email').value;
        const phone = document.getElementById('form-phone').value || "None";
        const message = document.getElementById('form-message').value;
        const budgetSelector = document.getElementById('form-budget');
        const budget = budgetSelector.options[budgetSelector.selectedIndex].text;
        
        // Open custom alerts dialog or construct WhatsApp direct trigger integration
        const msgStr = `*Alchemy Proposal Form Submission*%0A%0A*Name:* ${name}%0A*Email:* ${email}%0A*Phone:* ${phone}%0A*Budget:* ${budget}%0A*Message:* ${message}`;
        const waUrl = `https://wa.me/2349071068864?text=${msgStr}`;
        
        alert("Success! Your proposal is packaged. Directing you to WhatsApp to complete your Free Brand Audit request!");
        window.open(waUrl, '_blank');
        form.reset();
    });
});
