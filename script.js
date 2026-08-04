(() => {
  'use strict';

  /* ============ SCENE NAVIGATION ============ */
  const scenes = {
    invite: document.getElementById('scene-invite'),
    no: document.getElementById('scene-no'),
    time: document.getElementById('scene-time'),
    mode: document.getElementById('scene-mode'),
    final: document.getElementById('scene-final'),
  };

  const curtainLeft = document.querySelector('.curtain-left');
  const curtainRight = document.querySelector('.curtain-right');

  let transitioning = false;

  // remembers what she picked, so we can show it on the final screen
  const state = {
    answer: null,   // 'Да' or 'Нет'
    declined: false,
    reason: null,
    day: null,
    preferredTime: null,
    time: null,     // session time, only for "Да" path
    mode: null,
  };

  const modeLabels = {
    hands: '🤝 Держаться за ручку',
    hug: '🤗 В обнимку',
    mix: '❤️ Можно комбинировать',
    none: '😅 Никак',
  };

  /* ============ BACKGROUND MUSIC ============ */
  const bgm = document.getElementById('bgm');
  const soundToggle = document.getElementById('sound-toggle');
  const TARGET_VOLUME = 0.35;
  let musicStarted = false;
  let userMuted = false;

  bgm.volume = 0;

  function fadeVolume(to, duration = 900) {
    const from = bgm.volume;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      bgm.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function startMusic() {
    if (musicStarted || userMuted) return;
    musicStarted = true;
    bgm.play()
      .then(() => {
        fadeVolume(TARGET_VOLUME);
        soundToggle.textContent = '🔊';
        soundToggle.classList.add('playing');
      })
      .catch(() => {
        // browser blocked it — wait for next interaction
        musicStarted = false;
      });
  }

  soundToggle.addEventListener('click', () => {
    if (bgm.paused) {
      userMuted = false;
      musicStarted = false;
      startMusic();
    } else {
      userMuted = true;
      fadeVolume(0, 400);
      window.setTimeout(() => bgm.pause(), 420);
      soundToggle.textContent = '🔈';
      soundToggle.classList.remove('playing');
    }
  });

  // start music on the very first interaction anywhere on the page
  document.body.addEventListener('click', startMusic, { once: true });

  function goTo(sceneKey) {
    if (transitioning) return;
    transitioning = true;

    // 1. close curtains over current scene
    curtainLeft.classList.remove('open');
    curtainRight.classList.remove('open');
    curtainLeft.classList.add('closed');
    curtainRight.classList.add('closed');

    window.setTimeout(() => {
      // 2. swap active scene while covered
      Object.values(scenes).forEach(s => s.removeAttribute('data-active'));
      scenes[sceneKey].setAttribute('data-active', 'true');

      // 3. open curtains to reveal new scene
      requestAnimationFrame(() => {
        curtainLeft.classList.remove('closed');
        curtainRight.classList.remove('closed');
        curtainLeft.classList.add('open');
        curtainRight.classList.add('open');
      });

      window.setTimeout(() => {
        transitioning = false;
      }, 900);
    }, 700);
  }

  // Scene 1: invite
  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.getAttribute('data-next');
      state.declined = choice !== 'yes';
      state.answer = choice === 'yes' ? 'Да ✅' : 'Нет ❌';
      goTo(choice === 'yes' ? 'time' : 'no');
    });
  });

  // Scene 1b: decline form — reason + preferred day/time
  document.getElementById('no-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const reason = document.getElementById('no-reason').value.trim();
    const day = document.getElementById('no-day').value;
    const time = document.getElementById('no-time').value;

    state.reason = reason || 'Не указано';
    state.day = day ? formatDate(day) : 'Не указан';
    state.preferredTime = time || 'Не указано';

    setFinalText();
    renderSummary();
    goTo('final');
    window.setTimeout(spawnHearts, 950);
  });

  function formatDate(isoDate) {
    const [y, m, d] = isoDate.split('-');
    return `${d}.${m}.${y}`;
  }

  // Scene 2: time slider — she drags to the time that works for her
  const timeSlider = document.getElementById('time-slider');
  const timeValue = document.getElementById('time-value');

  function formatMinutes(totalMinutes) {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  timeValue.textContent = formatMinutes(Number(timeSlider.value));

  timeSlider.addEventListener('input', () => {
    timeValue.textContent = formatMinutes(Number(timeSlider.value));
  });

  document.getElementById('time-next').addEventListener('click', () => {
    state.time = formatMinutes(Number(timeSlider.value));
    goTo('mode');
  });

  // Scene 3: mode selection
  document.querySelectorAll('.btn-select').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = modeLabels[btn.getAttribute('data-mode')];
      setFinalText();
      renderSummary();
      goTo('final');
      window.setTimeout(spawnHearts, 950);
    });
  });

  function setFinalText() {
    const eyebrow = document.getElementById('final-eyebrow');
    const title = document.getElementById('final-title');
    if (state.declined) {
      eyebrow.textContent = '💌 Сообщение получено';
      title.innerHTML = 'Хорошо, спасибо, что рассказала <span class="heart-pulse">💛</span>';
    } else {
      eyebrow.textContent = '🎟 Билеты забронированы';
      title.innerHTML = 'Тогда до встречи <span class="heart-pulse">❤️</span>';
    }
  }

  function renderSummary() {
    const list = document.getElementById('summary-list');
    list.innerHTML = '';
    const rows = state.declined
      ? [
          ['Ответ', state.answer],
          ['Причина', state.reason],
          ['Удобный день', state.day],
          ['Удобное время', state.preferredTime],
        ]
      : [
          ['Идём?', state.answer],
          ['Время', state.time],
          ['Формат', state.mode],
        ];
    rows.forEach(([label, value]) => {
      if (!value) return;
      const li = document.createElement('li');
      li.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
      list.appendChild(li);
    });
  }

  /* ============ AMBIENT DUST / STAR PARTICLES ============ */
  const canvas = document.getElementById('dust');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function initParticles() {
    const count = Math.round((window.innerWidth * window.innerHeight) / 22000);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.4,
      speedY: Math.random() * 0.12 + 0.03,
      speedX: (Math.random() - 0.5) * 0.06,
      opacity: Math.random() * 0.5 + 0.15,
      twinkleSpeed: Math.random() * 0.015 + 0.004,
      twinklePhase: Math.random() * Math.PI * 2,
    }));
  }

  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function drawParticles(t) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(p => {
      const twinkle = reduceMotion ? p.opacity : p.opacity * (0.6 + 0.4 * Math.sin(t * p.twinkleSpeed + p.twinklePhase));
      ctx.beginPath();
      ctx.fillStyle = `rgba(246, 239, 228, ${twinkle})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      if (!reduceMotion) {
        p.y -= p.speedY;
        p.x += p.speedX;
        if (p.y < -10) {
          p.y = window.innerHeight + 10;
          p.x = Math.random() * window.innerWidth;
        }
      }
    });
    requestAnimationFrame(drawParticles);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(drawParticles);

  /* ============ FINAL SCREEN: FLOATING HEARTS ============ */
  const heartsContainer = document.getElementById('hearts');
  const heartGlyphs = ['❤️', '💛', '💕', '✨'];
  let heartsSpawned = false;

  function spawnHearts() {
    if (heartsSpawned) return;
    heartsSpawned = true;

    const total = reduceMotion ? 8 : 28;
    for (let i = 0; i < total; i++) {
      window.setTimeout(() => {
        const heart = document.createElement('span');
        heart.className = 'floating-heart';
        heart.textContent = heartGlyphs[Math.floor(Math.random() * heartGlyphs.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.fontSize = 16 + Math.random() * 20 + 'px';
        heart.style.setProperty('--drift', (Math.random() - 0.5) * 160 + 'px');
        const duration = 5 + Math.random() * 4;
        heart.style.animationDuration = duration + 's';
        heartsContainer.appendChild(heart);
        window.setTimeout(() => heart.remove(), duration * 1000 + 200);
      }, i * 220);
    }

    // keep a gentle continuous stream afterward
    window.setInterval(() => {
      const heart = document.createElement('span');
      heart.className = 'floating-heart';
      heart.textContent = heartGlyphs[Math.floor(Math.random() * heartGlyphs.length)];
      heart.style.left = Math.random() * 100 + '%';
      heart.style.fontSize = 16 + Math.random() * 20 + 'px';
      heart.style.setProperty('--drift', (Math.random() - 0.5) * 160 + 'px');
      const duration = 5 + Math.random() * 4;
      heart.style.animationDuration = duration + 's';
      heartsContainer.appendChild(heart);
      window.setTimeout(() => heart.remove(), duration * 1000 + 200);
    }, 900);
  }
})();
