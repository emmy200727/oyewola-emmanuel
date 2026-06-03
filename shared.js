/* ============================================================
   SHARED.JS — All interactive logic shared across every page
   ============================================================ */

(function () {
  /* ----------------------------------------------------------------
     PRELOADER
  ---------------------------------------------------------------- */
  const preloader = document.getElementById('preloader');
  const preBar = document.getElementById('pre-bar');
  const prePct = document.getElementById('pre-pct');

  if (preloader) {
    const visited = sessionStorage.getItem('da_visited');
    const dur = visited ? 300 : 1500;
    const start = Date.now();

    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      if (preBar) preBar.style.width = (p * 100) + '%';
      if (prePct) prePct.textContent = Math.round(p * 100) + '%';
      if (p < 1) { requestAnimationFrame(tick); return; }
      preloader.classList.add('done');
      setTimeout(() => { preloader.style.display = 'none'; }, 700);
      sessionStorage.setItem('da_visited', '1');
      runReveal();
    };
    requestAnimationFrame(tick);
  } else {
    runReveal();
  }

  /* ----------------------------------------------------------------
     SCROLL REVEAL
  ---------------------------------------------------------------- */
  function runReveal() {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  /* ----------------------------------------------------------------
     SCROLL PROGRESS BAR
  ---------------------------------------------------------------- */
  const scrollBar = document.querySelector('.scroll-bar');
  if (scrollBar) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      scrollBar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    }, { passive: true });
  }

  /* ----------------------------------------------------------------
     CUSTOM CURSOR (desktop only)
  ---------------------------------------------------------------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const outer = document.createElement('div');
    outer.className = 'cursor-outer';
    const inner = document.createElement('div');
    inner.className = 'cursor-inner';
    document.body.appendChild(outer);
    document.body.appendChild(inner);

    let mx = 0, my = 0, ox = 0, oy = 0;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      inner.style.left = mx + 'px';
      inner.style.top = my + 'px';
    });

    const animCursor = () => {
      ox += (mx - ox) * 0.11;
      oy += (my - oy) * 0.11;
      outer.style.left = ox + 'px';
      outer.style.top = oy + 'px';
      requestAnimationFrame(animCursor);
    };
    animCursor();

    document.querySelectorAll('a, button, .card, .proj-card').forEach(el => {
      el.addEventListener('mouseenter', () => { outer.classList.add('hover'); inner.classList.add('hover'); });
      el.addEventListener('mouseleave', () => { outer.classList.remove('hover'); inner.classList.remove('hover'); });
    });
  }

  /* ----------------------------------------------------------------
     THREE.JS PARTICLE BACKGROUND (only if canvas present)
  ---------------------------------------------------------------- */
  const canvas = document.getElementById('particle-canvas');
  if (canvas && window.THREE) {
    const W = () => window.innerWidth, H = () => window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W(), H());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, W() / H(), 0.1, 500);
    camera.position.z = 100;

    const N = 800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i += 3) {
      pos[i]     = (Math.random() - 0.5) * 320;
      pos[i + 1] = (Math.random() - 0.5) * 180;
      pos[i + 2] = (Math.random() - 0.5) * 80;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    /* Gold glow texture */
    const tc = document.createElement('canvas'); tc.width = tc.height = 16;
    const tctx = tc.getContext('2d');
    const grd = tctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grd.addColorStop(0, 'rgba(212,175,55,1)');
    grd.addColorStop(1, 'rgba(212,175,55,0)');
    tctx.fillStyle = grd; tctx.fillRect(0, 0, 16, 16);
    const tex = new THREE.CanvasTexture(tc);

    const mat = new THREE.PointsMaterial({ size: 1.5, map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    let tx = 0, ty = 0;
    document.addEventListener('mousemove', e => {
      tx = (e.clientX / W() - 0.5) * 6;
      ty = (e.clientY / H() - 0.5) * 4;
    });

    let t = 0;
    const animate3d = () => {
      requestAnimationFrame(animate3d);
      t += 0.004;
      const a = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        a[i * 3 + 1] += Math.sin(t + a[i * 3] * 0.04) * 0.03;
      }
      geo.attributes.position.needsUpdate = true;
      pts.rotation.y += (tx - pts.rotation.y) * 0.04;
      pts.rotation.x += (ty - pts.rotation.x) * 0.04;
      pts.rotation.z += 0.0003;
      renderer.render(scene, camera);
    };
    animate3d();

    window.addEventListener('resize', () => {
      camera.aspect = W() / H(); camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });
  }

  /* ----------------------------------------------------------------
     NAVBAR: mobile menu, active link
  ---------------------------------------------------------------- */
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const hLines = menuBtn ? menuBtn.querySelectorAll('span') : [];

  if (menuBtn && mobileMenu) {
    let open = false;
    menuBtn.addEventListener('click', () => {
      open = !open;
      mobileMenu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      if (hLines[0]) hLines[0].style.transform = open ? 'translateY(7px) rotate(45deg)' : '';
      if (hLines[1]) hLines[1].style.opacity = open ? '0' : '1';
      if (hLines[2]) { hLines[2].style.transform = open ? 'translateY(-7px) rotate(-45deg)' : ''; hLines[2].style.width = open ? '100%' : ''; }
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        open = false;
        mobileMenu.classList.remove('open');
        document.body.classList.remove('menu-open');
        if (hLines[0]) hLines[0].style.transform = '';
        if (hLines[1]) hLines[1].style.opacity = '1';
        if (hLines[2]) { hLines[2].style.transform = ''; hLines[2].style.width = ''; }
      });
    });
  }

  /* Highlight active nav link */
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (href === currentPage || (currentPage === 'index.html' && href === 'index.html'))) {
      a.classList.add('active');
    }
  });

  /* ----------------------------------------------------------------
     AUDIO MICRO-INTERACTIONS
  ---------------------------------------------------------------- */
  let audioReady = false, muted = true;
  const clickSnd = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
  const hoverSnd = new Audio('https://assets.mixkit.co/active_storage/sfx/2771/2771-84.wav');
  clickSnd.volume = 0.12; hoverSnd.volume = 0.06;

  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      muteBtn.innerHTML = muted
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
      if (!muted && !audioReady) { clickSnd.load(); hoverSnd.load(); audioReady = true; }
      if (!muted) { clickSnd.currentTime = 0; clickSnd.play().catch(() => {}); }
      muteBtn.style.borderColor = muted ? '' : 'var(--gold)';
      muteBtn.style.color = muted ? '' : 'var(--gold)';
    });
  }

  const playClick = () => { if (!muted) { clickSnd.currentTime = 0; clickSnd.play().catch(() => {}); } };
  const playHover = () => { if (!muted) { hoverSnd.currentTime = 0; hoverSnd.play().catch(() => {}); } };
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', playClick);
    el.addEventListener('mouseenter', playHover);
  });

  /* ----------------------------------------------------------------
     3D CARD TILT
  ---------------------------------------------------------------- */
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      card.style.transform = `perspective(800px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  /* ----------------------------------------------------------------
     TYPEWRITER (only on pages that have #typewriter)
  ---------------------------------------------------------------- */
  const tw = document.getElementById('typewriter');
  if (tw) {
    const words = tw.getAttribute('data-words').split('|');
    let wi = 0, ci = 0, del = false;
    const type = () => {
      const w = words[wi];
      tw.textContent = del ? w.slice(0, --ci) : w.slice(0, ++ci);
      let speed = del ? 45 : 85;
      if (!del && ci === w.length) { speed = 1600; del = true; }
      else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; speed = 400; }
      setTimeout(type, speed);
    };
    setTimeout(type, 900);
  }

  /* ----------------------------------------------------------------
     COUNTERS
  ---------------------------------------------------------------- */
  document.querySelectorAll('.counter').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const io2 = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      io2.disconnect();
      let cur = 0;
      const step = Math.ceil(target / 50);
      const t = setInterval(() => {
        cur = Math.min(cur + step, target);
        el.textContent = cur + '+';
        if (cur >= target) clearInterval(t);
      }, 30);
    }, { threshold: 0.5 });
    io2.observe(el);
  });

})();
