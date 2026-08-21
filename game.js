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
  const menuPanels = {
    main: document.querySelector("#main-menu"),
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

  let snake;
  let food;
  let direction;
  let nextDirection;
  let score;
  let status;
  let timer = null;
  let canTurn = true;

  function showPanel(panelName) {
    Object.entries(menuPanels).forEach(([name, panel]) => {
      panel.classList.toggle("hidden", name !== panelName);
    });
  }

  function reset() {
    stopTimer();
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
    ctx.fillStyle = "#07100b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(117, 137, 104, 0.045)";
    for (let y = 0; y < cells; y += 1) {
      for (let x = 0; x < cells; x += 1) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    ctx.strokeStyle = "rgba(122, 147, 110, 0.12)";
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

    ctx.strokeStyle = "rgba(139, 159, 128, 0.16)";
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

    ctx.strokeStyle = "#243329";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(10, 118);
    ctx.lineTo(94, 118);
    ctx.lineTo(94, 166);
    ctx.stroke();
    ctx.strokeStyle = "#536052";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "#40201b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(290, 18);
    ctx.lineTo(290, 92);
    ctx.lineTo(348, 92);
    ctx.stroke();
    ctx.strokeStyle = "#782d24";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(126, 28, 22, 0.18)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(52, 287, 27, 0, Math.PI * 2);
    ctx.arc(64, 300, 13, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(173, 45, 34, .24)";
    ctx.fillRect(337, 169, 25, 7);
    ctx.fillRect(345, 158, 8, 29);

    drawPortalMarkers();

    ctx.fillStyle = "rgba(145, 170, 132, .24)";
    ctx.font = "9px monospace";
    ctx.fillText("SECTOR B-3", 12, 374);
    ctx.fillText("QUARANTINE", 306, 13);
  }

  function drawGrate(x, y, width, height) {
    ctx.fillStyle = "rgba(0, 0, 0, .36)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgba(113, 132, 106, .18)";
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
    ctx.fillStyle = "rgba(194, 48, 38, .5)";
    for (let offset = 0; offset < 96; offset += 24) {
      ctx.fillRect(144 + offset, 0, 12, 3);
      ctx.fillRect(228 - offset, canvas.height - 3, 12, 3);
      ctx.fillRect(0, 144 + offset, 3, 12);
      ctx.fillRect(canvas.width - 3, 228 - offset, 3, 12);
    }
  }

  function drawBodyConnections() {
    if (snake.length < 2) return;
    ctx.strokeStyle = "#283522";
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
    ctx.strokeStyle = crashed ? "#671b18" : "#596345";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 6, centerY - 4);
    ctx.lineTo(centerX - 11, centerY - 8 * alternate);
    ctx.lineTo(centerX - 12, centerY - 11 * alternate);
    ctx.moveTo(centerX + 6, centerY + 4);
    ctx.lineTo(centerX + 11, centerY + 8 * alternate);
    ctx.lineTo(centerX + 12, centerY + 11 * alternate);
    ctx.stroke();

    ctx.fillStyle = crashed ? "#5f1d19" : "#273321";
    ctx.fillRect(centerX - 8, centerY - 8, 16, 16);
    ctx.fillStyle = crashed ? "#9b2a20" : "#536344";
    ctx.fillRect(centerX - 6, centerY - 6, 12, 12);
    ctx.fillStyle = "#172018";
    ctx.fillRect(centerX - 2, centerY - 6, 3, 12);
    ctx.fillStyle = index % 3 === 0 ? "#ac372b" : "#788064";
    ctx.fillRect(centerX + 3, centerY - 3, 3, 3);
  }

  function drawMonsterHead(centerX, centerY, crashed) {
    const angle = direction.x === 1 ? 0 : direction.y === 1 ? Math.PI / 2 : direction.x === -1 ? Math.PI : -Math.PI / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    ctx.strokeStyle = crashed ? "#7b1e18" : "#b3483a";
    ctx.lineWidth = 2;
    [-7, -2, 3, 8].forEach((offset, index) => {
      ctx.beginPath();
      ctx.moveTo(7, offset / 2);
      ctx.lineTo(13 + (index % 2) * 2, offset);
      ctx.stroke();
    });

    ctx.fillStyle = crashed ? "#6f201b" : "#3c4930";
    ctx.fillRect(-9, -10, 16, 20);
    ctx.fillStyle = crashed ? "#9d2b21" : "#667654";
    ctx.fillRect(-7, -8, 12, 16);

    ctx.fillStyle = crashed ? "#7f241d" : "#9a675a";
    ctx.fillRect(-4, -9, 9, 8);
    ctx.fillRect(-4, 2, 9, 8);
    ctx.fillStyle = "#321412";
    ctx.fillRect(-1, -8, 2, 6);
    ctx.fillRect(-1, 3, 2, 6);

    ctx.fillStyle = crashed ? "#30100e" : "#d83c2f";
    ctx.fillRect(2, -7, 3, 3);
    ctx.fillRect(3, 4, 3, 3);
    ctx.fillRect(-5, -5, 2, 2);
    ctx.fillRect(-5, 5, 2, 2);

    ctx.fillStyle = "#211612";
    ctx.fillRect(5, -3, 5, 7);
    ctx.restore();
  }

  function drawFood() {
    if (food.x < 0) return;
    const centerX = food.x * cellSize + cellSize / 2;
    const centerY = food.y * cellSize + cellSize / 2;
    ctx.strokeStyle = "rgba(206, 57, 48, .38)";
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - 10, centerY - 10, 20, 20);
    ctx.fillStyle = "#9e433d";
    ctx.fillRect(centerX - 7, centerY - 5, 14, 11);
    ctx.fillRect(centerX - 4, centerY - 8, 8, 16);
    ctx.fillStyle = "#d48273";
    ctx.fillRect(centerX - 4, centerY - 4, 3, 3);
    ctx.fillRect(centerX + 2, centerY - 6, 3, 4);
    ctx.fillRect(centerX + 1, centerY + 2, 4, 3);
    ctx.fillStyle = "#411a17";
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
    } else if (event.key === "Escape" && status !== "playing") {
      showPanel("main");
    }
  });

  startButton.addEventListener("click", () => start());
  rulesButton.addEventListener("click", () => showPanel("rules"));
  settingsButton.addEventListener("click", () => showPanel("settings"));
  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showPanel("main"));
  });
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setDirection(buttonKeys[button.dataset.direction]);
    });
  });

  window.SnakeGame = {
    reset,
    start,
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
