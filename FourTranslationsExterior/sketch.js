let saveName = "hairMap"; // where this sketch's mapping is saved
 
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
 
// the cut-out shape, traced from the SVG (in its own 2844 x 1836 units)
let shapeW = 2844;
let shapeH = 1836;
let shapePoints = [
  [1449, 937], [1502, 1418], [1757, 1377], [1513, 1475], [1620, 1832],
  [1883, 1760], [2134, 1605], [2294, 1390], [2558, 1010], [2673, 790],
  [2320, 635], [2086, 1123], [1929, 1260], [2030, 1067], [2056, 796],
  [1932, 578], [1584, 775], [1804, 552], [1597, 252], [1857, 507],
  [2095, 112], [1767, 29], [1449, 5], [1131, 29], [803, 112],
  [1041, 507], [1301, 252], [1094, 552], [1314, 775], [966, 578],
  [842, 796], [868, 1067], [969, 1260], [812, 1123], [578, 635],
  [224, 790], [340, 1010], [604, 1390], [764, 1605], [1015, 1760],
  [1278, 1832], [1384, 1475], [1141, 1377], [1396, 1418]
];
 
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
  setupMap();
}
 
function draw() {
  background(0); // black outside the shape = no projector light
  t = t + wobbleSpeed;
 
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
 
  push();
  cutToShape();
 
  // white inside the shape
  noStroke();
  fill(255);
  rect(0, 0, width, height);
  noFill();
 
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
 
  pop(); // end of the cut-out
 
  drawMapEditor();
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
 
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeFollicles();
  makeHair();
  makeSchedule();
  applyPastLosses();
}
 
// ---------- mapping ----------
// SPACE      = show / hide the mapping points
// a point's key (shown next to it) = select that point
// click / drag = move the selected point to the mouse
// arrow keys = nudge the selected point 1 pixel
// BACKSPACE  = reset all points to the original shape
// ENTER      = fullscreen
// Points save automatically, so they're still there when you reopen the sketch.
 
// one key per point, in order
let keyList = "1234567890qwertyuiopasdfghjklzxcvbnm,./;'[]-=";
 
let mapPoints = [];   // where each corner is now (as fractions of the window, 0 to 1)
let selected = -1;    // which point is selected (-1 = none)
let editMode = true;  // true = show points and labels
 
// always start from the original shape when the page loads or refreshes
function setupMap() {
  resetMap();
}
 
// put every point back where the SVG has it, fitted to the window
function resetMap() {
  let s = width / shapeW;
  if (height / shapeH < s) {
    s = height / shapeH;
  }
  let offX = (width - shapeW * s) / 2;
  let offY = (height - shapeH * s) / 2;
 
  mapPoints = [];
  for (let i = 0; i < shapePoints.length; i = i + 1) {
    let x = offX + shapePoints[i][0] * s;
    let y = offY + shapePoints[i][1] * s;
    mapPoints.push([x / width, y / height]);
  }
  storeItem(saveName, mapPoints);
}
 
// limits all drawing after it to the inside of the mapped shape (until pop())
function cutToShape() {
  beginClip();
  beginShape();
  for (let i = 0; i < mapPoints.length; i = i + 1) {
    vertex(mapPoints[i][0] * width, mapPoints[i][1] * height);
  }
  endShape(CLOSE);
  endClip();
}
 
// outline, points and key labels (only in edit mode)
function drawMapEditor() {
  if (editMode == true) {
    // outline
    noFill();
    stroke(0, 255, 255);
    strokeWeight(1);
    beginShape();
    for (let i = 0; i < mapPoints.length; i = i + 1) {
      vertex(mapPoints[i][0] * width, mapPoints[i][1] * height);
    }
    endShape(CLOSE);
 
    // points and labels
    textSize(14);
    for (let i = 0; i < mapPoints.length; i = i + 1) {
      let x = mapPoints[i][0] * width;
      let y = mapPoints[i][1] * height;
 
      if (i == selected) {
        fill(255, 220, 0);
        stroke(0);
        circle(x, y, 16);
      } else {
        fill(0, 255, 255);
        stroke(0);
        circle(x, y, 9);
      }
 
      // label with a dark box behind it so it reads on white or black
      noStroke();
      fill(0, 180);
      rect(x + 8, y - 18, 16, 18);
      fill(255);
      text(keyList[i], x + 12, y - 4);
    }
 
    // help line
    let help = "MAPPING: press a point's key, then click/drag.   arrows = nudge   SPACE = hide   BACKSPACE = reset";
    noStroke();
    fill(0, 180);
    rect(10, height - 34, textWidth(help) + 16, 26);
    fill(255);
    text(help, 18, height - 16);
  }
}
 
// move the selected point to the mouse
function moveSelected() {
  if (editMode == true && selected >= 0) {
    mapPoints[selected] = [mouseX / width, mouseY / height];
  }
}
 
function mousePressed() {
  moveSelected();
}
 
function mouseDragged() {
  moveSelected();
}
 
function mouseReleased() {
  storeItem(saveName, mapPoints);
}
 
// keys for mapping and fullscreen
function keyPressed() {
  if (key == " ") {
    if (editMode == true) {
      editMode = false;
      selected = -1;
    } else {
      editMode = true;
    }
  } else if (key == "Enter") {
    if (fullscreen() == true) {
      fullscreen(false);
    } else {
      fullscreen(true);
    }
  } else if (editMode == true) {
    if (key == "Backspace") {
      resetMap();
    } else if (selected >= 0 && key == "ArrowLeft") {
      nudge(-1, 0);
    } else if (selected >= 0 && key == "ArrowRight") {
      nudge(1, 0);
    } else if (selected >= 0 && key == "ArrowUp") {
      nudge(0, -1);
    } else if (selected >= 0 && key == "ArrowDown") {
      nudge(0, 1);
    } else {
      // select the point whose key was pressed
      for (let i = 0; i < mapPoints.length; i = i + 1) {
        if (key == keyList[i]) {
          selected = i;
        }
      }
    }
  }
  return false; // stop the browser from also using the key (scrolling, etc.)
}
 
// move the selected point by a few pixels
function nudge(dx, dy) {
  mapPoints[selected][0] = mapPoints[selected][0] + dx / width;
  mapPoints[selected][1] = mapPoints[selected][1] + dy / height;
  storeItem(saveName, mapPoints);
}
 