const assert = require("node:assert/strict");

const noop = () => {};
const context = new Proxy({}, { get: () => noop, set: () => true });
const elements = new Map();
const listeners = {};

function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      width: 384,
      height: 384,
      classList: { add: noop, remove: noop, toggle: noop },
      addEventListener: noop,
      getContext: () => context,
      textContent: "",
      innerHTML: "",
    });
  }
  return elements.get(id);
}

global.document = {
  querySelector: (selector) => element(selector),
  querySelectorAll: () => [],
  addEventListener: (type, callback) => { listeners[type] = callback; },
};

global.window = {
  setInterval: () => 1,
  clearInterval: noop,
};

require("./game.js");
const game = global.window.SnakeGame;

assert.equal(game.getState().status, "ready");
assert.equal(game.getState().snake.length, 3);
assert.equal(game.getState().score, 0);

game.setFoodForTest({ x: 8, y: 8 });
game.start();
game.step();
assert.equal(game.getState().score, 10, "food adds 10 points");
assert.equal(game.getState().snake.length, 4, "food grows the snake");

game.reset();
game.setSnakeForTest([{ x: 15, y: 8 }, { x: 14, y: 8 }, { x: 13, y: 8 }], { x: 1, y: 0 });
game.setFoodForTest({ x: 8, y: 3 });
game.start();
game.step();
assert.equal(game.getState().status, "playing", "crossing a wall keeps the game running");
assert.deepEqual(game.getState().snake[0], { x: 0, y: 8 }, "right wall wraps to the left side");

game.reset();
game.setSnakeForTest([{ x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }], { x: 0, y: -1 });
game.setFoodForTest({ x: 9, y: 9 });
game.start();
game.step();
assert.deepEqual(game.getState().snake[0], { x: 4, y: 15 }, "top wall wraps to the bottom side");

game.reset();
game.setSnakeForTest(
  [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }],
  { x: 0, y: 1 },
);
game.setFoodForTest({ x: 12, y: 12 });
game.start();
game.step();
assert.equal(game.getState().status, "gameover", "self collision ends the game");

game.reset();
game.start();
game.setDirection("ArrowLeft");
game.step();
assert.deepEqual(game.getState().snake[0], { x: 8, y: 8 }, "instant reversal is ignored");

game.reset();
game.start();
game.setDirection("w");
game.step();
assert.deepEqual(game.getState().snake[0], { x: 7, y: 7 }, "W starts movement upward");
game.setDirection("a");
game.step();
assert.deepEqual(game.getState().snake[0], { x: 6, y: 7 }, "A turns movement left");
game.setDirection("s");
game.step();
assert.deepEqual(game.getState().snake[0], { x: 6, y: 8 }, "S turns movement down");
game.setDirection("d");
game.step();
assert.deepEqual(game.getState().snake[0], { x: 7, y: 8 }, "D turns movement right");

game.reset();
game.start();
listeners.keydown({ key: "ц", code: "KeyW", preventDefault: noop });
game.step();
assert.deepEqual(game.getState().snake[0], { x: 7, y: 7 }, "physical W works with a Russian keyboard layout");

console.log("OK: keyboard codes, WASD, arrows, food, growth, wraparound, self-collision, and direction rules");
