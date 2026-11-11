let saveName = "follicleMap"; // where this sketch's mapping is saved
 
let testMode = false;    // true = fast test run, false = real clock
let testSpeed = 20;      // how many times faster than real time (test mode only)
let showDebug = false;   // true = show the clock readout in the corner
 
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
 
function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  noiseSeed(7);
  makeFollicles();
  makeSchedule();
  applyPastLosses();
  setupMap();
}
 
function draw() {
  background(0); // black outside the shape = no projector light
 
  let now = clockSeconds();
  t = t + wobbleSpeed;
 
  push();
  cutToShape();
 
  // white inside the shape
  noStroke();
  fill(255);
  rect(0, 0, width, height);
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
 
  pop(); // end of the cut-out
 
  // DEBUG: show the clock and how many follicles are shrinking
  if (showDebug == true) {
    let shrinking = 0;
    for (let i = 0; i < follicles.length; i = i + 1) {
      if (follicles[i].scale < 0.99) {
        shrinking = shrinking + 1;
      }
    }
    noStroke();
    fill(255);
    textSize(16);
    text("time: " + floor(now) + "   shrinking: " + shrinking + " / " + follicles.length, 20, 30);
    noFill();
  }
 
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
 
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeFollicles();
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
 
// load saved points, or start from the original shape
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
 