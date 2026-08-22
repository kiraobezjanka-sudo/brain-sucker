(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const stateLabel = document.querySelector("#state-label");
  const overlay = document.querySelector("#overlay");
  const overlayKicker = document.querySelector("#overlay-kicker");
  const overlayMessage = document.querySelector("#overlay-message");
  const startButton = document.querySelector("#start-button");
  const rulesButton = document.querySelector("#rules-button");
  const settingsButton = document.querySelector("#settings-button");
  const resumeButton = document.querySelector("#resume-button");
  const pauseRulesButton = document.querySelector("#pause-rules-button");
  const pauseSettingsButton = document.querySelector("#pause-settings-button");
  const quitButton = document.querySelector("#quit-button");
  const soundToggle = document.querySelector("#sound-toggle");
  const menuPanels = {
    main: document.querySelector("#main-menu"),
    pause: document.querySelector("#pause-menu"),
    rules: document.querySelector("#rules-panel"),
    settings: document.querySelector("#settings-panel"),
  };

  const cellSize = 24;
  const cells = canvas.width / cellSize;
  const tickRate = 125;
  const directions = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
    KeyW: { x: 0, y: -1 },
    KeyS: { x: 0, y: 1 },
    KeyA: { x: -1, y: 0 },
    KeyD: { x: 1, y: 0 },
  };
  const buttonKeys = {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
  };

  const audio = createAudioDirector();

  let snake;
  let food;
  let direction;
  let nextDirection;
  let score;
  let status;
  let timer = null;
  let canTurn = true;
  let activePanel = "main";
  let backPanel = "main";

  function showPanel(panelName) {
    activePanel = panelName;
    Object.entries(menuPanels).forEach(([name, panel]) => {
      panel.classList.toggle("hidden", name !== panelName);
    });
  }

  function pause() {
    if (status !== "playing") return;
    stopTimer();
    status = "paused";
    stateLabel.textContent = "ПАУЗА";
    showPanel("pause");
    overlay.classList.remove("hidden");
    audio.pauseMusic();
  }

  function resume() {
    if (status !== "paused") return;
    status = "playing";
    stateLabel.textContent = "ОХОТА";
    overlay.classList.add("hidden");
    stopTimer();
    timer = window.setInterval(step, tickRate);
    audio.resumeMusic();
  }

  function reset() {
    stopTimer();
    audio.stopAll();
    snake = [
      { x: 7, y: 8 },
      { x: 6, y: 8 },
      { x: 5, y: 8 },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { ...direction };
    score = 0;
    status = "ready";
    canTurn = true;
    placeFood();
    updateInterface();
    draw();
  }

  function start(firstDirection) {
    if (status === "gameover") reset();

    if (firstDirection) {
      const wanted = directions[firstDirection];
      if (wanted && !(wanted.x === -direction.x && wanted.y === -direction.y)) {
        direction = { ...wanted };
        nextDirection = { ...wanted };
      }
    }

    status = "playing";
    overlay.classList.add("hidden");
    stateLabel.textContent = "ОХОТА";
    stopTimer();
    timer = window.setInterval(step, tickRate);
    audio.startMusic();
  }

  function stopTimer() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function setDirection(key) {
    const wanted = directions[key];
    if (!wanted) return;

    if (status !== "playing") return;

    const reverses = wanted.x === -direction.x && wanted.y === -direction.y;
    if (!reverses && canTurn) {
      nextDirection = { ...wanted };
      canTurn = false;
    }
  }

  function step() {
    if (status !== "playing") return;

    direction = { ...nextDirection };
    canTurn = true;
    const head = {
      x: (snake[0].x + direction.x + cells) % cells,
      y: (snake[0].y + direction.y + cells) % cells,
    };

    const willEat = head.x === food.x && head.y === food.y;
    const bodyToCheck = willEat ? snake : snake.slice(0, -1);
    const hitSelf = bodyToCheck.some((part) => part.x === head.x && part.y === head.y);

    if (hitSelf) {
      gameOver();
      return;
    }

    snake.unshift(head);
    if (willEat) {
      score += 10;
      audio.playPickupSound();
      placeFood();
      updateInterface();
    } else {
      snake.pop();
    }
    draw();
  }

  function placeFood() {
    const openCells = [];
    for (let y = 0; y < cells; y += 1) {
      for (let x = 0; x < cells; x += 1) {
        if (!snake.some((part) => part.x === x && part.y === y)) openCells.push({ x, y });
      }
    }
    food = openCells[Math.floor(Math.random() * openCells.length)] || { x: -1, y: -1 };
  }

  function gameOver() {
    status = "gameover";
    stopTimer();
    stateLabel.textContent = "УНИЧТОЖЕН";
    overlayKicker.textContent = `РЕЗУЛЬТАТ: ${String(score).padStart(3, "0")}`;
    overlayMessage.innerHTML = "ОРГАНИЗМ УНИЧТОЖЕН";
    startButton.textContent = "ЗАПУСК";
    showPanel("main");
    overlay.classList.remove("hidden");
    draw(true);
    audio.playDeathStinger();
  }

  function updateInterface() {
    scoreElement.textContent = String(score).padStart(3, "0");
    if (status === "ready") {
      stateLabel.textContent = "ГОТОВ?";
      overlayKicker.textContent = "ОБЪЕКТ: НЕ СОДЕРЖИТСЯ";
      overlayMessage.innerHTML = "ИНЦИДЕНТ В СЕКТОРЕ B-3";
      startButton.textContent = "ЗАПУСК";
      showPanel("main");
      overlay.classList.remove("hidden");
    }
  }

  function draw(crashed = false) {
    drawLaboratoryMap();

    drawFood();
    drawBodyConnections();
    [...snake].reverse().forEach((part, reverseIndex) => {
      const index = snake.length - 1 - reverseIndex;
      drawBrainSuckerPart(part, index, crashed && index === 0);
    });
  }

  function drawLaboratoryMap() {
    ctx.fillStyle = "#160919";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 111, 190, 0.055)";
    for (let y = 0; y < cells; y += 1) {
      for (let x = 0; x < cells; x += 1) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    ctx.strokeStyle = "rgba(236, 153, 220, 0.14)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= cells; i += 1) {
      const position = i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(position, 0);
      ctx.lineTo(position, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, position);
      ctx.lineTo(canvas.width, position);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 186, 226, 0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= canvas.width; i += cellSize * 4) {
      ctx.beginPath();
      ctx.moveTo(i + .5, 0);
      ctx.lineTo(i + .5, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i + .5);
      ctx.lineTo(canvas.width, i + .5);
      ctx.stroke();
    }

    drawGrate(48, 48, 72, 42);
    drawGrate(264, 264, 72, 48);

    ctx.strokeStyle = "#4b163e";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(10, 118);
    ctx.lineTo(94, 118);
    ctx.lineTo(94, 166);
    ctx.stroke();
    ctx.strokeStyle = "#a34c8b";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "#621247";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(290, 18);
    ctx.lineTo(290, 92);
    ctx.lineTo(348, 92);
    ctx.stroke();
    ctx.strokeStyle = "#e33c9f";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 45, 167, 0.2)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(52, 287, 27, 0, Math.PI * 2);
    ctx.arc(64, 300, 13, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 58, 174, .28)";
    ctx.fillRect(337, 169, 25, 7);
    ctx.fillRect(345, 158, 8, 29);

    drawPortalMarkers();

    ctx.fillStyle = "rgba(218, 167, 255, .26)";
    ctx.font = "9px monospace";
    ctx.fillText("SECTOR B-3", 12, 374);
    ctx.fillText("QUARANTINE", 306, 13);
  }

  function drawGrate(x, y, width, height) {
    ctx.fillStyle = "rgba(0, 0, 0, .36)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(244, 164, 222, .22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    for (let line = x + 7; line < x + width; line += 8) {
      ctx.beginPath();
      ctx.moveTo(line, y + 3);
      ctx.lineTo(line, y + height - 3);
      ctx.stroke();
    }
  }

  function drawPortalMarkers() {
    ctx.fillStyle = "rgba(255, 73, 181, .62)";
    for (let offset = 0; offset < 96; offset += 24) {
      ctx.fillRect(144 + offset, 0, 12, 3);
      ctx.fillRect(228 - offset, canvas.height - 3, 12, 3);
      ctx.fillRect(0, 144 + offset, 3, 12);
      ctx.fillRect(canvas.width - 3, 228 - offset, 3, 12);
    }
  }

  function drawBodyConnections() {
    if (snake.length < 2) return;
    ctx.strokeStyle = "#5b154b";
    ctx.lineWidth = 9;
    ctx.lineJoin = "bevel";
    ctx.beginPath();
    ctx.moveTo(snake[0].x * cellSize + cellSize / 2, snake[0].y * cellSize + cellSize / 2);
    let previous = snake[0];
    snake.slice(1).forEach((part) => {
      const wrapped = Math.abs(part.x - previous.x) > 1 || Math.abs(part.y - previous.y) > 1;
      if (wrapped) ctx.moveTo(part.x * cellSize + cellSize / 2, part.y * cellSize + cellSize / 2);
      else ctx.lineTo(part.x * cellSize + cellSize / 2, part.y * cellSize + cellSize / 2);
      previous = part;
    });
    ctx.stroke();
  }

  function drawBrainSuckerPart(part, index, crashed) {
    const centerX = part.x * cellSize + cellSize / 2;
    const centerY = part.y * cellSize + cellSize / 2;

    if (index === 0) {
      drawMonsterHead(centerX, centerY, crashed);
      return;
    }

    const alternate = index % 2 === 0 ? 1 : -1;
    ctx.strokeStyle = crashed ? "#8a164e" : "#ff78c8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 6, centerY - 4);
    ctx.lineTo(centerX - 11, centerY - 8 * alternate);
    ctx.lineTo(centerX - 12, centerY - 11 * alternate);
    ctx.moveTo(centerX + 6, centerY + 4);
    ctx.lineTo(centerX + 11, centerY + 8 * alternate);
    ctx.lineTo(centerX + 12, centerY + 11 * alternate);
    ctx.stroke();

    ctx.fillStyle = crashed ? "#651038" : "#6d1754";
    ctx.fillRect(centerX - 8, centerY - 8, 16, 16);
    ctx.fillStyle = crashed ? "#b22167" : "#e554ad";
    ctx.fillRect(centerX - 6, centerY - 6, 12, 12);
    ctx.fillStyle = "#35102f";
    ctx.fillRect(centerX - 2, centerY - 6, 3, 12);
    ctx.fillStyle = index % 3 === 0 ? "#ff7dc9" : "#d7a9ff";
    ctx.fillRect(centerX + 3, centerY - 3, 3, 3);
  }

  function drawMonsterHead(centerX, centerY, crashed) {
    const angle = direction.x === 1 ? 0 : direction.y === 1 ? Math.PI / 2 : direction.x === -1 ? Math.PI : -Math.PI / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    ctx.strokeStyle = crashed ? "#8a174d" : "#ff8dd0";
    ctx.lineWidth = 2;
    [-7, -2, 3, 8].forEach((offset, index) => {
      ctx.beginPath();
      ctx.moveTo(7, offset / 2);
      ctx.lineTo(13 + (index % 2) * 2, offset);
      ctx.stroke();
    });

    ctx.fillStyle = crashed ? "#6a123b" : "#78175d";
    ctx.fillRect(-9, -10, 16, 20);
    ctx.fillStyle = crashed ? "#b52669" : "#ed68ba";
    ctx.fillRect(-7, -8, 12, 16);

    ctx.fillStyle = crashed ? "#971d55" : "#ffc0df";
    ctx.fillRect(-4, -9, 9, 8);
    ctx.fillRect(-4, 2, 9, 8);
    ctx.fillStyle = "#54113f";
    ctx.fillRect(-1, -8, 2, 6);
    ctx.fillRect(-1, 3, 2, 6);

    ctx.fillStyle = crashed ? "#3b0b25" : "#fff0f8";
    ctx.fillRect(2, -7, 3, 3);
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(-5, -5, 2, 2);
    ctx.fillRect(-5, 5, 2, 2);

    ctx.fillStyle = "#3a0c31";
    ctx.fillRect(5, -3, 5, 7);
    ctx.restore();
  }

  function drawFood() {
    if (food.x < 0) return;
    const centerX = food.x * cellSize + cellSize / 2;
    const centerY = food.y * cellSize + cellSize / 2;
    ctx.strokeStyle = "rgba(255, 128, 205, .56)";
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - 10, centerY - 10, 20, 20);
    ctx.fillStyle = "#f13ea8";
    ctx.fillRect(centerX - 7, centerY - 5, 14, 11);
    ctx.fillRect(centerX - 4, centerY - 8, 8, 16);
    ctx.fillStyle = "#ffd0e8";
    ctx.fillRect(centerX - 4, centerY - 4, 3, 3);
    ctx.fillRect(centerX + 2, centerY - 6, 3, 4);
    ctx.fillRect(centerX + 1, centerY + 2, 4, 3);
    ctx.fillStyle = "#76144f";
    ctx.fillRect(centerX - 1, centerY - 7, 2, 14);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const control = directions[event.code] ? event.code : key;
    if (directions[control]) {
      event.preventDefault();
      setDirection(control);
    } else if (key === "r" || event.code === "KeyR") {
      reset();
      start();
    } else if (event.key === "Escape") {
      if (status === "playing") pause();
      else if (status === "paused") {
        if (activePanel === "pause") resume();
        else showPanel("pause");
      } else showPanel("main");
    }
  });

  startButton.addEventListener("click", () => start());
  resumeButton.addEventListener("click", resume);
  quitButton.addEventListener("click", reset);
  soundToggle.addEventListener("click", () => {
    const soundEnabled = audio.toggle();
    soundToggle.textContent = soundEnabled ? "ВКЛ" : "ВЫКЛ";
    soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    if (soundEnabled && status === "playing") audio.startMusic();
    if (soundEnabled && status === "paused") {
      audio.startMusic();
      audio.pauseMusic();
    }
  });
  rulesButton.addEventListener("click", () => { backPanel = "main"; showPanel("rules"); });
  settingsButton.addEventListener("click", () => { backPanel = "main"; showPanel("settings"); });
  pauseRulesButton.addEventListener("click", () => { backPanel = "pause"; showPanel("rules"); });
  pauseSettingsButton.addEventListener("click", () => { backPanel = "pause"; showPanel("settings"); });
  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showPanel(backPanel));
  });
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setDirection(buttonKeys[button.dataset.direction]);
    });
  });

  function createAudioDirector() {
    let context = null;
    let musicBus = null;
    let pulseTimer = null;
    let heartbeatTimer = null;
    let sustainedSources = [];
    let stingerSources = [];
    let enabled = true;
    let pulseIndex = 0;

    function getContext() {
      if (context) return context;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      return context;
    }

    function wakeContext() {
      const activeContext = getContext();
      if (!activeContext) return null;
      if (activeContext.state === "suspended") activeContext.resume();
      return activeContext;
    }

    function stopSources(sources) {
      sources.forEach((source) => {
        try { source.stop(); } catch (_) { /* Source already stopped. */ }
        try { source.disconnect(); } catch (_) { /* Source already disconnected. */ }
      });
    }

    function stopMusic(immediate = false) {
      if (pulseTimer !== null) {
        window.clearInterval(pulseTimer);
        pulseTimer = null;
      }
      if (heartbeatTimer !== null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (!context) {
        sustainedSources = [];
        musicBus = null;
        return;
      }

      const sourcesToStop = sustainedSources;
      sustainedSources = [];
      const busToDisconnect = musicBus;
      musicBus = null;
      const now = context.currentTime;

      if (busToDisconnect) {
        busToDisconnect.gain.cancelScheduledValues(now);
        busToDisconnect.gain.setTargetAtTime(0.0001, now, immediate ? 0.01 : 0.12);
      }

      window.setTimeout(() => {
        stopSources(sourcesToStop);
        try { busToDisconnect?.disconnect(); } catch (_) { /* Bus already disconnected. */ }
      }, immediate ? 30 : 550);
    }

    function createDrone(activeContext, output, frequency, type, volume, detune = 0) {
      const oscillator = activeContext.createOscillator();
      const gain = activeContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      gain.gain.value = volume;
      oscillator.connect(gain).connect(output);
      oscillator.start();
      sustainedSources.push(oscillator);
    }

    function createNoise(activeContext, output) {
      const duration = 2;
      const buffer = activeContext.createBuffer(1, activeContext.sampleRate * duration, activeContext.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = (Math.random() * 2 - 1) * 0.38;
      }

      const source = activeContext.createBufferSource();
      const filter = activeContext.createBiquadFilter();
      const gain = activeContext.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = "bandpass";
      filter.frequency.value = 190;
      filter.Q.value = 0.7;
      gain.gain.value = 0.08;
      source.connect(filter).connect(gain).connect(output);
      source.start();
      sustainedSources.push(source);
    }

    function schedulePulse() {
      if (!context || !musicBus || !enabled) return;
      const progressions = [
        [92.5, 138.59],
        [87.31, 130.81],
        [77.78, 116.54],
        [82.41, 123.47],
      ];
      const chord = progressions[pulseIndex % progressions.length];
      pulseIndex += 1;
      const startTime = context.currentTime + 0.04;

      chord.forEach((frequency, noteIndex) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = noteIndex === 0 ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = noteIndex === 0 ? -5 : 7;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(noteIndex === 0 ? 0.075 : 0.04, startTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.1);
        oscillator.connect(gain).connect(musicBus);
        oscillator.start(startTime);
        oscillator.stop(startTime + 2.2);
      });
    }

    function scheduleHeartbeat() {
      if (!context || !musicBus || !enabled) return;
      const startTime = context.currentTime + 0.03;

      [0, 0.23].forEach((delay, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const beatStart = startTime + delay;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(index === 0 ? 74 : 66, beatStart);
        oscillator.frequency.exponentialRampToValueAtTime(38, beatStart + 0.22);
        gain.gain.setValueAtTime(0.0001, beatStart);
        gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.22 : 0.15, beatStart + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, beatStart + 0.27);
        oscillator.connect(gain).connect(musicBus);
        oscillator.start(beatStart);
        oscillator.stop(beatStart + 0.3);
      });
    }

    function startMusic() {
      if (!enabled) return;
      const activeContext = wakeContext();
      if (!activeContext) return;
      stopMusic(true);

      musicBus = activeContext.createGain();
      const lowPass = activeContext.createBiquadFilter();
      const compressor = activeContext.createDynamicsCompressor();
      lowPass.type = "lowpass";
      lowPass.frequency.value = 760;
      lowPass.Q.value = 1.1;
      compressor.threshold.value = -22;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.28;
      musicBus.gain.setValueAtTime(0.0001, activeContext.currentTime);
      musicBus.gain.exponentialRampToValueAtTime(0.34, activeContext.currentTime + 0.8);
      lowPass.connect(musicBus);
      musicBus.connect(compressor).connect(activeContext.destination);

      createDrone(activeContext, lowPass, 43.65, "triangle", 0.34, -7);
      createDrone(activeContext, lowPass, 65.41, "sawtooth", 0.09, 8);
      createDrone(activeContext, lowPass, 46.25, "sine", 0.13, 3);
      createNoise(activeContext, lowPass);
      schedulePulse();
      scheduleHeartbeat();
      pulseTimer = window.setInterval(schedulePulse, 2400);
      heartbeatTimer = window.setInterval(scheduleHeartbeat, 1450);
    }

    function pauseMusic() {
      if (!context || !musicBus) return;
      const now = context.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setTargetAtTime(0.055, now, 0.18);
    }

    function resumeMusic() {
      if (!enabled) return;
      if (!musicBus) {
        startMusic();
        return;
      }
      wakeContext();
      const now = context.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setTargetAtTime(0.34, now, 0.22);
    }

    function playPickupSound() {
      if (!enabled) return;
      const activeContext = wakeContext();
      if (!activeContext) return;
      const startTime = activeContext.currentTime + 0.015;
      const master = activeContext.createGain();
      const filter = activeContext.createBiquadFilter();
      master.gain.value = 0.42;
      filter.type = "bandpass";
      filter.frequency.value = 920;
      filter.Q.value = 1.6;
      master.connect(activeContext.destination);

      const chirp = activeContext.createOscillator();
      const chirpGain = activeContext.createGain();
      chirp.type = "sawtooth";
      chirp.frequency.setValueAtTime(240, startTime);
      chirp.frequency.exponentialRampToValueAtTime(880, startTime + 0.13);
      chirp.frequency.exponentialRampToValueAtTime(310, startTime + 0.34);
      chirpGain.gain.setValueAtTime(0.0001, startTime);
      chirpGain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.025);
      chirpGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38);
      chirp.connect(filter).connect(chirpGain).connect(master);
      chirp.start(startTime);
      chirp.stop(startTime + 0.4);

      const gulp = activeContext.createOscillator();
      const gulpGain = activeContext.createGain();
      gulp.type = "sine";
      gulp.frequency.setValueAtTime(150, startTime);
      gulp.frequency.exponentialRampToValueAtTime(58, startTime + 0.28);
      gulpGain.gain.setValueAtTime(0.18, startTime);
      gulpGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);
      gulp.connect(gulpGain).connect(master);
      gulp.start(startTime);
      gulp.stop(startTime + 0.32);
    }

    function playDeathStinger() {
      stopMusic(false);
      if (!enabled) return;
      const activeContext = wakeContext();
      if (!activeContext) return;
      stopSources(stingerSources);
      stingerSources = [];

      const master = activeContext.createGain();
      master.gain.value = 0.16;
      master.connect(activeContext.destination);
      const startTime = activeContext.currentTime + 0.05;
      const notes = [196, 174.61, 146.83, 98];

      notes.forEach((frequency, index) => {
        const oscillator = activeContext.createOscillator();
        const gain = activeContext.createGain();
        const noteStart = startTime + index * 0.28;
        oscillator.type = index < 2 ? "sawtooth" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, noteStart + 0.7);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.16 / (index + 1), noteStart + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.85);
        oscillator.connect(gain).connect(master);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.9);
        stingerSources.push(oscillator);
      });

      const impact = activeContext.createOscillator();
      const impactGain = activeContext.createGain();
      impact.type = "sine";
      impact.frequency.setValueAtTime(82, startTime);
      impact.frequency.exponentialRampToValueAtTime(28, startTime + 1.6);
      impactGain.gain.setValueAtTime(0.28, startTime);
      impactGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.7);
      impact.connect(impactGain).connect(master);
      impact.start(startTime);
      impact.stop(startTime + 1.8);
      stingerSources.push(impact);
    }

    function stopAll() {
      stopMusic(true);
      stopSources(stingerSources);
      stingerSources = [];
    }

    function toggle() {
      enabled = !enabled;
      if (!enabled) stopAll();
      return enabled;
    }

    return { startMusic, pauseMusic, resumeMusic, playPickupSound, playDeathStinger, stopAll, toggle };
  }

  window.SnakeGame = {
    reset,
    start,
    pause,
    resume,
    step,
    setDirection,
    getState: () => ({
      snake: snake.map((part) => ({ ...part })),
      food: { ...food },
      direction: { ...direction },
      score,
      status,
    }),
    setFoodForTest: (position) => { food = { ...position }; draw(); },
    setSnakeForTest: (parts, currentDirection = direction) => {
      snake = parts.map((part) => ({ ...part }));
      direction = { ...currentDirection };
      nextDirection = { ...currentDirection };
      draw();
    },
  };

  reset();
})();
