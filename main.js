// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let score1 = 0;
let score2 = 0;
const WINNING_SCORE = 5;
let gameOver = false;

// Paddle properties
const paddleWidth = 10;
const paddleHeight = 80;
const paddleSpeed = 6;

// Paddle objects
const paddleLeft = {
    x: 20,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0
};

const paddleRight = {
    x: canvas.width - 30,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0
};

// Ball object
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 8,
    dx: 5,
    dy: 5,
    speed: 5
};

// Keyboard input
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Update paddle positions based on input
function updatePaddles() {
    // Left paddle (W and S keys)
    if (keys['w'] && paddleLeft.y > 0) {
        paddleLeft.y -= paddleSpeed;
    }
    if (keys['s'] && paddleLeft.y < canvas.height - paddleHeight) {
        paddleLeft.y += paddleSpeed;
    }

    // Right paddle (Arrow keys)
    if (keys['arrowup'] && paddleRight.y > 0) {
        paddleRight.y -= paddleSpeed;
    }
    if (keys['arrowdown'] && paddleRight.y < canvas.height - paddleHeight) {
        paddleRight.y += paddleSpeed;
    }
}

// Update ball position
function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top and bottom
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy = -ball.dy;
        // Keep ball in bounds
        if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
        }
        if (ball.y + ball.radius > canvas.height) {
            ball.y = canvas.height - ball.radius;
        }
    }

    // Ball collision with paddles
    if (
        ball.x - ball.radius < paddleLeft.x + paddleLeft.width &&
        ball.y > paddleLeft.y &&
        ball.y < paddleLeft.y + paddleHeight
    ) {
        ball.dx = Math.abs(ball.dx);
        ball.x = paddleLeft.x + paddleLeft.width + ball.radius;
        
        // Add spin based on paddle hit location
        let collidePoint = ball.y - (paddleLeft.y + paddleHeight / 2);
        collidePoint = collidePoint / (paddleHeight / 2);
        ball.dy = collidePoint * ball.speed * 1.5;
        
        increaseBallSpeed();
    }

    if (
        ball.x + ball.radius > paddleRight.x &&
        ball.y > paddleRight.y &&
        ball.y < paddleRight.y + paddleHeight
    ) {
        ball.dx = -Math.abs(ball.dx);
        ball.x = paddleRight.x - ball.radius;
        
        // Add spin based on paddle hit location
        let collidePoint = ball.y - (paddleRight.y + paddleHeight / 2);
        collidePoint = collidePoint / (paddleHeight / 2);
        ball.dy = collidePoint * ball.speed * 1.5;
        
        increaseBallSpeed();
    }

    // Score points
    if (ball.x - ball.radius < 0) {
        score2++;
        updateScore();
        resetBall();
    }

    if (ball.x + ball.radius > canvas.width) {
        score1++;
        updateScore();
        resetBall();
    }
}

// Increase ball speed gradually
function increaseBallSpeed() {
    if (Math.abs(ball.dx) < 10) {
        ball.speed += 0.1;
        ball.dx = ball.dx > 0 ? ball.speed : -ball.speed;
    }
}

// Reset ball to center
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 5;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.dy = (Math.random() - 0.5) * 4;
}

// Update score display
function updateScore() {
    document.getElementById('score1').textContent = score1;
    document.getElementById('score2').textContent = score2;

    // Check for winner
    if (score1 >= WINNING_SCORE || score2 >= WINNING_SCORE) {
        gameOver = true;
        let winner = score1 >= WINNING_SCORE ? 'Spelare 1' : 'Spelare 2';
        document.getElementById('gameOverText').textContent = `${winner} vinner!`;
        document.getElementById('gameOverScreen').style.display = 'block';
    }
}

// Draw functions
function drawPaddle(paddle) {
    ctx.fillStyle = paddle === paddleLeft ? '#66ff99' : '#ff9966';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawCenter() {
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Main game loop
function gameLoop() {
    if (!gameOver) {
        updatePaddles();
        updateBall();
    }

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game elements
    drawCenter();
    drawPaddle(paddleLeft);
    drawPaddle(paddleRight);
    drawBall();

    requestAnimationFrame(gameLoop);
}

// Start the game
resetBall();
gameLoop();
