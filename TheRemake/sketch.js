let humanData = [
    "right",
    "up",
    "left",
    "up",
    "down",
    "down",
    "right",
    "right",
    "down",
    "left",
    "left",
    "right",
    "right",
    "down",
    "left",
    "up",
    "down",
    "up",
    "right",
    "left",
    "left",
    "left",
    "up",
    "up",
    "left",
    "down",
    "down",
    "up",
    "left",
    "up",
    "right",
    "down", 
    "up",
    "down",
    "down",
    "down",
    "left",
    "down",
    "right",
    "left",
    "right",
    "right",
    "right",
    "left",
    "up",
    "left",
    "down",
    "right",
    "right",
    "right",
    "up",
    "down",
    "left",
    "right",
    "right",
    "down",
    "up",
    "down",
    "down",
    "left",
    "up",
    "right",
    "right",
    "left",
    "right",
    "right",
    "right",
    "left",
    "left",
    "left",
    "left",
    "down",
    "down",
    "up"
];

let totalLines = 2000; 
let x = 300;
let y = 400; 
let lineLength = 20;
let pathData = ""; // to save as SVG for pen plotter, from Antrhopic Claude Pro
let computerPath = ""; // SVG
let J = 12345; // for my own random number generator because I don't want to use random(), from Antrhopic Claude Pro 
let counts = [ // to go through data and count how many times each direction is used within each of the 4 quadrants, with Claude Pro

    [0,
    0,
    0,
    0],
    [0,
    0,
    0,
    0],
    [0,
    0,
    0,
    0],
    [0,
    0,
    0,
    0]
]; // should show Array(4)
// 0: (4) [1, 5, 4, 3]
// 1: (4) [5, 6, 5, 3]
// 2: (4) [6, 4, 6, 4]
// 3: (4) [2, 4, 5, 10]
// length: 4
// [[Prototype]]: Array(0)


function setup() {
    createCanvas(600, 800);
    background(255);
    pathData = "M " + x + " " + y; // for SVG, Claude Pro

    for (let i = 0; i < humanData.length; i++) {
        let newX = x; 
        let newY = y; 

        if (humanData[i] === "up") { // establishing new x, y for  data 
            newY = y - lineLength; 
        } else if (humanData[i] === "down") {
            newY = y + lineLength; 
        } else if (humanData[i] === "left") {
            newX = x - lineLength; 
        } else if (humanData[i] === "right") {
            newX = x + lineLength; 
        }


        // line(x, y, newX, newY); //https://p5js.org/reference/p5/line/
        pathData = pathData + " L " + newX + " " + newY; // for SVG, Claude Pro
        x = newX; 
        y = newY;
    }

    training(); 
    console.log(counts); // just me debugging
    console.log(myRandomGenerator()); // just me debugging

        stroke(0, 0, 255); // computer lines in blue
    computerPath = "M " + x + " " + y; // computer starts where the people stopped
    let current = countDirections(humanData[humanData.length - 1]); // last human answer

    for (let i = humanData.length; i < totalLines; i++) {
        current = chooseNext(current);

        let newX = x;
        let newY = y;
        if (current === 0) {
            newY = y - lineLength; // up
        } else if (current === 1) {
            newY = y + lineLength; // down
        } else if (current === 2) {
            newX = x - lineLength; // left
        } else {
            newX = x + lineLength; // right
        }

        // reflection: bounce back if the line would leave the page like George Nees
        if (newX < lineLength || newX > width - lineLength) {
            newX = x - (newX - x);
        }
        if (newY < lineLength || newY > height - lineLength) {
            newY = y - (newY - y);
        }

        line(x, y, newX, newY);
        computerPath = computerPath + " L " + newX + " " + newY;
        x = newX;
        y = newY;
    }
}

function keyPressed() { // for SVG export
    if (key === 's') {
        // let svg = [];
        // svg.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">');
        // svg.push('<path d="' + pathData + '" fill="none" stroke="black" stroke-width="1"/>');
        // svg.push('</svg>');
        // saveStrings(svg, 'human-maze', 'svg');
        let svg2 = [];
        svg2.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">');
        svg2.push('<path d="' + computerPath + '" fill="none" stroke="black" stroke-width="1"/>');
        svg2.push('</svg>');
        saveStrings(svg2, 'computer-maze', 'svg');
    }
}

function draw() {
    
}

function countDirections(word) { // completed with VS Code AI suggestion
    if (word === "up") {
        return 0;
    } else if (word === "down") {
        return 1;
    } else if (word === "left") {
        return 2;
    } else if (word === "right") {
        return 3;
    }
}

function training() {
    for (let i = 1; i < humanData.length; i++) {
        let before = countDirections(humanData[i - 1]);
        let after = countDirections(humanData[i]);
        counts[before][after] = counts[before][after] + 1;
    }
}

function myRandomGenerator() { // J because that's what it says in reading for George Nees' pseudorandom number generator
    J = J * 75 + 74; 
    while (J >= 65537) { // suggested by Claude Pro 
        J = J - 65537;
    }
    return J / 65537;
}

function chooseNext(current) { // using count array to pick next direction, from Claude Pro 
    let row = counts[current];
    let total = row[0] + row[1] + row[2] + row[3];
    let pick = myRandomGenerator() * total;

    if (pick < row[0]) {
        return 0; // up
    } else if (pick < row[0] + row[1]) {
        return 1; // down
    } else if (pick < row[0] + row[1] + row[2]) {
        return 2; // left
    } else {
        return 3; // right
    }
}