(() => {
  document.documentElement.classList.add("js");

  const intro = document.getElementById("intro");
  const glow = document.querySelector(".cursor-glow");
  const canvas = document.getElementById("arrows");
  const ctx = canvas.getContext("2d");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sheet = document.getElementById("intro-sheet");
  const holesLayer = document.getElementById("intro-holes");
  const flash = document.getElementById("intro-flash");
  const sheetCtx = sheet ? sheet.getContext("2d") : null;
  let shooting = false;
  let audio;
  const muteBtn = document.getElementById("mute");
  const THEME_START = 29.5;
  let muted = false;
  let themeStarted = false;
  let themeBuffer = null;
  let themeGain = null;
  let themeDecode = null;

  function ensureAudio() {
    if (audio) return audio;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
    return audio;
  }

  function preloadTheme() {
    const ac = ensureAudio();
    if (!ac || themeDecode) return themeDecode;
    themeDecode = fetch("assets/fuss.mp3")
      .then((res) => res.arrayBuffer())
      .then((bytes) => ac.decodeAudioData(bytes.slice(0)))
      .then((buf) => {
        themeBuffer = buf;
        return buf;
      });
    return themeDecode;
  }

  function playThemeBuffer(buf) {
    const ac = ensureAudio();
    if (!ac || !buf || themeGain) return;
    if (ac.state === "suspended") ac.resume();
    themeGain = ac.createGain();
    themeGain.gain.value = muted ? 0 : 1;
    themeGain.connect(ac.destination);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const startAt = buf.duration > THEME_START ? THEME_START : 0;
    src.loop = true;
    src.loopStart = startAt;
    src.loopEnd = buf.duration;
    src.connect(themeGain);
    src.start(0, startAt);
  }

  function startTheme() {
    if (themeStarted) return;
    themeStarted = true;
    const ac = ensureAudio();
    if (ac && ac.state === "suspended") ac.resume();
    const ready = themeBuffer ? Promise.resolve(themeBuffer) : preloadTheme();
    if (!ready) {
      themeStarted = false;
      return;
    }
    ready.then(playThemeBuffer).catch(() => {
      themeStarted = false;
    });
  }

  preloadTheme();

  function setMuted(next) {
    muted = next;
    if (themeGain) themeGain.gain.value = muted ? 0 : 1;
    if (!muteBtn) return;
    muteBtn.classList.toggle("is-muted", muted);
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", muted ? "Unmute music" : "Mute music");
    const on = muteBtn.querySelector(".mute-on");
    const off = muteBtn.querySelector(".mute-off");
    const label = muteBtn.querySelector("span");
    if (on) on.hidden = muted;
    if (off) off.hidden = !muted;
    if (label) label.textContent = muted ? "Unmute" : "Mute";
  }

  if (muteBtn) {
    muteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setMuted(!muted);
    });
  }

  function sizeSheet() {
    if (!sheet || !sheetCtx) return;
    sheet.width = window.innerWidth;
    sheet.height = window.innerHeight;
    sheetCtx.globalCompositeOperation = "source-over";
    sheetCtx.fillStyle = "#050705";
    sheetCtx.fillRect(0, 0, sheet.width, sheet.height);
  }

  function playShot() {
    if (muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime;
    const n = Math.floor(ac.sampleRate * 0.14);
    const buffer = ac.createBuffer(1, n, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.1);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start(t);

    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.08);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.28, t);
    og.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.connect(og).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  function punchCanvas(x, y, r) {
    if (!sheetCtx) return;
    sheetCtx.save();
    sheetCtx.globalCompositeOperation = "destination-out";
    sheetCtx.beginPath();
    sheetCtx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    sheetCtx.fill();
    for (let i = 0; i < 6; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const d = r * (0.18 + Math.random() * 0.28);
      sheetCtx.beginPath();
      sheetCtx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.08 + Math.random() * 0.12), 0, Math.PI * 2);
      sheetCtx.fill();
    }
    sheetCtx.restore();
  }

  function spawnHole() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const towardTitle = Math.random() < 0.55;
    const x = towardTitle ? w * (0.28 + Math.random() * 0.44) : Math.random() * w;
    const y = towardTitle ? h * (0.28 + Math.random() * 0.4) : Math.random() * h;
    const size = 58 + Math.random() * 78;
    punchCanvas(x, y, size);

    const hole = document.createElement("span");
    hole.className = "bullet-hole";
    hole.style.setProperty("--x", `${x}px`);
    hole.style.setProperty("--y", `${y}px`);
    hole.style.setProperty("--s", `${size}px`);
    hole.style.setProperty("--r", `${Math.floor(Math.random() * 360)}deg`);
    holesLayer.appendChild(hole);

    if (flash) {
      flash.style.background = `radial-gradient(circle at ${x}px ${y}px, #fff6c8 0%, rgba(255, 170, 40, 0.5) 22%, transparent 58%)`;
      flash.classList.remove("is-bang");
      void flash.offsetWidth;
      flash.classList.add("is-bang");
    }

    playShot();
  }

  function finishIntro() {
    if (!intro) return;
    intro.classList.remove("is-shooting");
    intro.classList.add("is-done");
    document.body.classList.remove("is-intro", "is-siren-hot");
    document.body.classList.add("has-sirens");
    window.setTimeout(() => intro.remove(), 600);
  }

  function startShooting() {
    if (shooting || !intro) return;
    shooting = true;
    startTheme();
    document.body.classList.add("has-sirens", "is-siren-hot");
    intro.classList.add("is-shooting");
    const enterHint = intro.querySelector(".intro__enter");
    if (enterHint) enterHint.style.opacity = "0";

    const shots = 12;
    let i = 0;
    const fire = () => {
      spawnHole();
      i += 1;
      if (i < shots) {
        window.setTimeout(fire, 70 + Math.random() * 55);
      } else {
        window.setTimeout(finishIntro, 280);
      }
    };
    fire();
  }

  if (intro && !reduce) {
    document.body.classList.add("is-intro");
    sizeSheet();
    window.addEventListener("resize", () => {
      if (!shooting) sizeSheet();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        startShooting();
      }
    });
    intro.addEventListener("click", startShooting);
  } else if (intro) {
    intro.remove();
  }

  window.addEventListener(
    "pointermove",
    (e) => {
      if (!glow) return;
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    },
    { passive: true }
  );

  const arrows = [];
  const MAX = 14;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function spawn() {
    arrows.push({
      x: Math.random() * canvas.width,
      y: -30,
      len: 18 + Math.random() * 22,
      speed: 1.4 + Math.random() * 2.4,
      drift: (Math.random() - 0.5) * 0.8,
      rot: 0.35 + Math.random() * 0.4,
      alpha: 0.18 + Math.random() * 0.28,
    });
    if (arrows.length > MAX) arrows.shift();
  }

  function drawArrow(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.globalAlpha = a.alpha;
    ctx.strokeStyle = "#f5d742";
    ctx.fillStyle = "#1f8a46";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, a.len);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.lineTo(0, 0);
    ctx.lineTo(5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let lastSpawn = 0;

  function tick(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!reduce && t - lastSpawn > 420) {
      spawn();
      lastSpawn = t;
    }
    arrows.forEach((a) => {
      a.y += a.speed;
      a.x += a.drift;
      drawArrow(a);
    });
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  if (!reduce) requestAnimationFrame(tick);

  const mural = document.querySelector(".hero__art img");
  if (mural && !reduce) {
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY * 0.18;
        mural.style.transform = `scale(1.04) translateY(${y}px)`;
      },
      { passive: true }
    );
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => {
    if (reduce) el.classList.add("is-in");
    else io.observe(el);
  });
})();
