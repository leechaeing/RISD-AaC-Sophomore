// Hair growing and falling out, mirrored to match the follicle sketch.
// Permanent losses follow a schedule read from the clock,
// so this sketch and the follicle sketch always agree.
// Loops every 15 minutes (at :00, :15, :30, :45).
//
// KEYS
// f = fullscreen

let testMode = false;    // true = fast test run, false = real clock
let testSpeed = 20;      // how many times faster than real time (test mode only)

let wobbleSpeed = 0.0015; // sway speed
let swayAmount = 4;       // how much the hair moves (0 = still)
let t = 0;

// keep these the same in BOTH sketches
let spacing = 70;
let minSize = 12;
let maxSize = 26;
let noRegrow = 0.4;      // how much of the scalp ends up bald
let loopMinutes = 15;    // length of one full loop
let lossStartMin = 1;    // minute of the loop when permanent loss begins
let lossEndMin = 13;     // minute of the loop by which it's finished

let minHair = 60;       // shortest strand
let maxHair = 160;      // longest strand
let longChance = 0.15;  // fraction of hairs that grow extra long (0.15 = 15%)
let longHair = 450;     // how long those can get
let swirl = 0.004;      // how quickly direction changes across the scalp

let lifespanMinutes = 15;                    // one hair's life: growing + resting
let lifeFrames = lifespanMinutes * 60 * 60;  // minutes x 60 seconds x 60 frames per second

let follicles = [];
let lastNow = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  noiseSeed(7);
  makeFollicles();
  makeHair();
  makeSchedule();
  applyPastLosses();
}

function draw() {
  background(255);
  t = t + wobbleSpeed;
  noFill();

  // new loop: bald follicles are allowed to grow back
  let now = clockSeconds();
  if (now < lastNow) {
    for (let i = 0; i < follicles.length; i = i + 1) {
      follicles[i].blocked = false;
      if (follicles[i].stage == "empty") {
        follicles[i].timer = random(10, 120);
      }
    }
  }
  lastNow = now;

  // flip the whole drawing so it mirrors the follicle sketch
  push();
  translate(width, 0);
  scale(-1, 1);
  for (let i = 0; i < follicles.length; i = i + 1) {
    let f = follicles[i];

    // scheduled permanent loss
    if (f.lossTime >= 0 && now >= f.lossTime && f.blocked == false) {
      f.blocked = true;
      shed(f);
    }

    updateHair(f);
    drawHair(f, i);
  }
  pop();
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

// ---------- setup ----------

// SAME layout as the follicle sketch (don't change this function)
function makeFollicles() {
  follicles = [];
  randomSeed(3);

  for (let y = spacing / 2; y < height; y = y + spacing) {
    for (let x = spacing / 2; x < width; x = x + spacing) {
      let gx = x + random(-spacing * 0.35, spacing * 0.35);
      let gy = y + random(-spacing * 0.35, spacing * 0.35);

      let count = floor(random(1, 5));
      for (let c = 0; c < count; c = c + 1) {
        let size = random(minSize, maxSize);
        follicles.push({
          x: gx + random(-size, size),
          y: gy + random(-size, size),
          w: size,
          h: size * random(0.7, 1),
          angle: random(360),
          rings: floor(random(2, 4))
        });
      }
    }
  }
}

// give each follicle its strand and a place in the hair cycle
function makeHair() {
  randomSeed(11);
  for (let i = 0; i < follicles.length; i = i + 1) {
    let f = follicles[i];

    // shape of the strand
    f.hairLength = random(minHair, maxHair);
    if (random(1) < longChance) {
      f.hairLength = random(maxHair, longHair);
    }
    let flow = noise(f.x * swirl, f.y * swirl, 50) * 720;
    f.hairAngle = flow + random(-20, 20);
    f.thickness = random(0.6, 2.8);

    // where it is in the cycle
    f.stage = "growing";          // growing, resting, falling, empty
    f.growth = random(0, 1);      // start at random points so hairs aren't all in sync
    f.growSpeed = 1 / (lifeFrames * random(0.55, 0.75)); // growing takes ~2/3 of its life
    f.timer = 0;
    f.blocked = false;            // true = this follicle won't regrow

    // used while the strand falls
    f.fallX = 0;
    f.fallY = 0;
    f.fallVX = 0;
    f.fallVY = 0;
    f.fallTurn = 0;
    f.fallSpin = 0;
    f.fade = 255;
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

// if the sketch opens mid-loop, start with past losses already bald
function applyPastLosses() {
  let now = clockSeconds();
  lastNow = now;
  for (let i = 0; i < follicles.length; i = i + 1) {
    let f = follicles[i];
    if (f.lossTime >= 0 && now >= f.lossTime) {
      f.blocked = true;
      f.stage = "empty";
      f.growth = 0;
    }
  }
}

// ---------- the hair cycle ----------

function updateHair(f) {
  if (f.stage == "growing") {
    f.growth = f.growth + f.growSpeed;
    if (f.growth >= 1) {
      f.growth = 1;
      f.stage = "resting";
      f.timer = lifeFrames * random(0.25, 0.45); // resting takes the rest of its life
    }
  } else if (f.stage == "resting") {
    f.timer = f.timer - 1;
    if (f.timer <= 0) {
      shed(f);
    }
  } else if (f.stage == "falling") {
    f.fallVY = f.fallVY + 0.06; // gravity
    f.fallX = f.fallX + f.fallVX;
    f.fallY = f.fallY + f.fallVY;
    f.fallTurn = f.fallTurn + f.fallSpin;
    f.fade = f.fade - 3;
    if (f.fade <= 0) {
      f.stage = "empty";
      f.timer = lifeFrames * random(0.03, 0.08); // short wait before regrowing
    }
  } else if (f.stage == "empty") {
    if (f.blocked == false) {
      f.timer = f.timer - 1;
      if (f.timer <= 0) {
        f.stage = "growing";
        f.growth = 0;
      }
    }
  }
}

// let go of the strand
function shed(f) {
  if (f.stage == "growing" || f.stage == "resting") {
    f.stage = "falling";
    f.fallX = 0;
    f.fallY = 0;
    f.fallVX = random(-0.6, 0.6);
    f.fallVY = random(-0.5, 0.5);
    f.fallSpin = random(-1.5, 1.5);
    f.fallTurn = 0;
    f.fade = 255;
  }
}

// ---------- drawing ----------

function drawHair(f, index) {
  if (f.stage == "growing" || f.stage == "resting") {
    drawStrand(f.x, f.y, f.hairAngle, f.hairLength * f.growth, 255, f.thickness, index);
  } else if (f.stage == "falling") {
    drawStrand(f.x + f.fallX, f.y + f.fallY, f.hairAngle + f.fallTurn,
               f.hairLength * f.growth, f.fade, f.thickness, index);
  }
}

// one black strand from (x, y)
function drawStrand(x, y, angle, len, alpha, thick, index) {
  if (len > 2) {
    stroke(20, alpha);
    strokeWeight(thick);

    let a = angle;
    let steps = 12;
    let stepLength = len / steps;

    beginShape();
    splineVertex(x, y);
    for (let s = 0; s < steps; s = s + 1) {
      // fixed curl (never moves)
      a = a + (noise(index * 0.37 + s * 0.2, 500) - 0.5) * 30;
      // small sway on top
      a = a + (noise(index * 0.37 + s * 0.2, t) - 0.5) * swayAmount;
      x = x + cos(a) * stepLength;
      y = y + sin(a) * stepLength;
      splineVertex(x, y);
    }
    endShape();
  }
}

// ---------- controls ----------

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
  makeHair();
  makeSchedule();
  applyPastLosses();
}