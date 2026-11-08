// Follicles, mirrored to line up with the hair sketch.
// Follicles marked for loss slowly shrink to half size, then
// after their hair falls they shrink and fade away completely.
// The schedule is read from the clock, so both sketches agree.
// Loops every 15 minutes (at :00, :15, :30, :45).

let testMode = false;    // true = fast test run, false = real clock
let testSpeed = 20;      // how many times faster than real time (test mode only)
let showDebug = false;    // true = show the clock readout in the corner

let wobbleSpeed = 0.004; // set to 0 to freeze the wobble
let t = 0;

let drawSize = 1.8;         // draws every follicle bigger (doesn't move them)
let preShrinkSeconds = 180; // starts shrinking 3 minutes before its hair falls
let halfwaySize = 0.5;      // how small it gets by the time its hair falls
let shrinkSeconds = 30;     // vanishes over 30 seconds after its hair falls

// keep these the same in BOTH sketches
let spacing = 70;
let minSize = 12;
let maxSize = 26;
let noRegrow = 0.4;      // how much of the scalp ends up bald
let loopMinutes = 15;    // length of one full loop
let lossStartMin = 1;    // minute of the loop when permanent loss begins
let lossEndMin = 13;     // minute of the loop by which it's finished

let follicles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  noiseSeed(7);
  makeFollicles();
  makeSchedule();
  applyPastLosses();
}

function draw() {
  background(255);
  t = t + wobbleSpeed;

  let now = clockSeconds();

  noFill();

  // flip the drawing the same way the hair sketch does,
  // so every follicle sits where its hair grows
  push();
  translate(width, 0);
  scale(-1, 1);
  for (let i = 0; i < follicles.length; i = i + 1) {
    let f = follicles[i];

    // ease toward the size it should be right now
    let target = targetScale(f, now);
    f.scale = f.scale + (target - f.scale) * 0.05;

    drawFollicle(f, i);
  }
  pop();

  // DEBUG: show the clock and how many follicles are shrinking
  if (showDebug == true) {
    let shrinking = 0;
    for (let i = 0; i < follicles.length; i = i + 1) {
      if (follicles[i].scale < 0.99) {
        shrinking = shrinking + 1;
      }
    }
    noStroke();
    fill(0);
    textSize(16);
    text("time: " + floor(now) + "   shrinking: " + shrinking + " / " + follicles.length, 20, 30);
    noFill();
  }
}

// seconds since the start of the current loop
// (or, in test mode, sped-up seconds since the page loaded)
function clockSeconds() {
  if (testMode == true) {
    return millis() / 1000 * testSpeed;
  } else {
    // take away whole loops until we're inside the current one
    let m = minute();
    while (m >= loopMinutes) {
      m = m - loopMinutes;
    }
    return m * 60 + second();
  }
}

// how big this follicle should be at this moment (1 = full, 0 = gone)
function targetScale(f, now) {
  if (f.lossTime < 0) {
    return 1; // never goes bald
  }

  let shrinkStart = f.lossTime - preShrinkSeconds;

  if (now < shrinkStart) {
    return 1; // still healthy
  }

  if (now < f.lossTime) {
    // slowly shrinking toward halfway size while the hair is still there
    let progress = (now - shrinkStart) / preShrinkSeconds;
    return 1 - progress * (1 - halfwaySize);
  }

  // hair has fallen: shrink the rest of the way to nothing
  let progress = (now - f.lossTime) / shrinkSeconds;
  if (progress > 1) {
    progress = 1;
  }
  return halfwaySize - progress * halfwaySize;
}

// lay out groups of 1-4 follicles on a loose grid (SAME in both sketches)
function makeFollicles() {
  follicles = [];
  randomSeed(3);

  for (let y = spacing / 2; y < height; y = y + spacing) {
    for (let x = spacing / 2; x < width; x = x + spacing) {
      let gx = x + random(-spacing * 0.35, spacing * 0.35);
      let gy = y + random(-spacing * 0.35, spacing * 0.35);

      let count = floor(random(1, 5)); // 1 to 4 follicles in the group
      for (let c = 0; c < count; c = c + 1) {
        let size = random(minSize, maxSize);
        follicles.push({
          x: gx + random(-size, size),
          y: gy + random(-size, size),
          w: size,
          h: size * random(0.7, 1),
          angle: random(360),
          rings: floor(random(2, 4)), // 2 or 3 rings
          scale: 1                    // 1 = full size, 0 = gone
        });
      }
    }
  }
}

// decide which follicles go bald and when (SAME in both sketches)
function makeSchedule() {
  randomSeed(21);
  for (let i = 0; i < follicles.length; i = i + 1) {
    let f = follicles[i];
    // more likely in some areas, so losses gather into bald spots
    let spotChance = noRegrow * noise(f.x * 0.006, f.y * 0.006, 90) * 2;
    if (random(1) < spotChance) {
      f.lossTime = random(lossStartMin * 60, lossEndMin * 60);
    } else {
      f.lossTime = -1; // never goes bald
    }
  }
}

// if the sketch opens mid-loop, start every follicle at the right size
function applyPastLosses() {
  let now = clockSeconds();
  for (let i = 0; i < follicles.length; i = i + 1) {
    follicles[i].scale = targetScale(follicles[i], now);
  }
}

// an oval whose edge wobbles with noise
function wobblyOval(x, y, w, h, angle, seed, amount) {
  push();
  translate(x, y);
  rotate(angle);
  beginShape();
  for (let i = 0; i < 36; i = i + 1) {
    let a = 360 * i / 36;
    let n = noise(seed + cos(a) * 1.5 + 2, seed + sin(a) * 1.5 + 2, t);
    let r = 1 - amount + n * amount * 2;
    vertex(cos(a) * w / 2 * r, sin(a) * h / 2 * r);
  }
  endShape(CLOSE);
  pop();
}

// one small follicle: a few rings and a dot for the hair
// it gets smaller and fainter as its scale drops
function drawFollicle(f, index) {
  if (f.scale > 0.01) {
    let size = f.scale * drawSize;

    for (let k = 0; k < f.rings; k = k + 1) {
      let shrink = 1 - k / (f.rings + 1);
      strokeWeight(1.2);
      stroke(115, 60, 125, (150 + k * 40) * f.scale);
      wobblyOval(f.x, f.y, f.w * shrink * size, f.h * shrink * size,
                 f.angle, index * 5 + k, 0.12);
    }

    // hair in the middle
    strokeWeight(3 * f.scale);
    stroke(115, 60, 125, 255 * f.scale);
    point(f.x, f.y);
  }
}

function keyPressed() {
  if (key == 'f') {
    if (fullscreen() == true) {
      fullscreen(false);
    } else {
      fullscreen(true);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeFollicles();
  makeSchedule();
  applyPastLosses();
}