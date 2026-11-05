// i don't even know at what point this code is me and at what point it is AI but vibe coded with Anthropic Claude Pro

// A patch of scalp: lots of small abstract follicles

let wobbleSpeed = 0.004; // set to 0 to freeze the wobble
let t = 0;

let spacing = 70;     // distance between follicle groups (smaller = denser)
let minSize = 12;     // smallest follicle
let maxSize = 26;     // biggest follicle

let follicles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  noiseSeed(7);
  makeFollicles();
}

function draw() {
  background(255);
  t = t + wobbleSpeed;

  noFill();
  for (let i = 0; i < follicles.length; i = i + 1) {
    drawFollicle(follicles[i], i);
  }
}

// lay out groups of 1-4 follicles on a loose grid
function makeFollicles() {
  follicles = [];
  randomSeed(3);

  for (let y = spacing / 2; y < height; y = y + spacing) {
    for (let x = spacing / 2; x < width; x = x + spacing) {
      // nudge each group off the grid so it doesn't look like rows
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
          rings: floor(random(2, 4)) // 2 or 3 rings
        });
      }
    }
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
function drawFollicle(f, index) {
  for (let k = 0; k < f.rings; k = k + 1) {
    let shrink = 1 - k / (f.rings + 1);
    strokeWeight(1.2);
    stroke(115, 60, 125, 150 + k * 40);
    wobblyOval(f.x, f.y, f.w * shrink, f.h * shrink, f.angle, index * 5 + k, 0.12);
  }

  // hair in the middle
  strokeWeight(3);
  stroke(115, 60, 125);
  point(f.x, f.y);
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
}