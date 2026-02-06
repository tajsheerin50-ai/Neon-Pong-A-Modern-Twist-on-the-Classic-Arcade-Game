// Simple Pong game with clear final score and trophy below the score (with crackers/confetti)
(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const muteChk = document.getElementById('muteChk');

    const W = canvas.width;
    const H = canvas.height;

    // Game objects
    const paddleWidth = 12;
    const paddleHeight = 110;

    const leftPaddle = { x: 12, y: (H - paddleHeight) / 2, width: paddleWidth, height: paddleHeight, speed: 7 };
    const rightPaddle = { x: W - paddleWidth - 12, y: (H - paddleHeight) / 2, width: paddleWidth, height: paddleHeight, speed: 5 };

    const ball = { x: W / 2, y: H / 2, r: 8, speed: 6, vx: 0, vy: 0 };
    const score = { left: 0, right: 0 };

    // State flags
    let paused = true;
    let gameStarted = false;
    let gameOver = false;
    let keys = { ArrowUp: false, ArrowDown: false };

    // Win score
    const WIN_SCORE = 7;

    // Background image loop variables (optional)
    const bgImage = new Image();
    bgImage.src = 'assets/image/pong game.png';
    let bgReady = false;
    let bgOffsetX = 0;
    const bgScrollSpeed = 0.4;
    bgImage.onload = () => { bgReady = true; };

    // Audio
    const bgMusic = new Audio('assets/sounds/h-beats-silent-drum-urban-effect-402704.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
    const tickSound = new Audio('assets/sounds/dragon-studio-tennis-ball-hit-386155.mp3');
    tickSound.volume = 0.9;

    async function safePlay(audio) {
        if (!audio) return;
        if (muteChk.checked) return;
        try { await audio.play(); } catch (err) { }
    }
    function safePause(audio) { if (!audio) return; try { audio.pause(); } catch (e) { } }
    function playTick() {
        if (muteChk.checked) return;
        try { tickSound.currentTime = 0; tickSound.play(); } catch (e) { }
    }

    // Celebration particles
    let confetti = [];
    let crackers = [];
    let celebrationTime = 0;
    const CELEBRATION_DURATION = 7000; // not used to auto-hide, but could be used

    function spawnConfettiBurst(x, y, count = 80) {
        const colors = ['#ff4d6d', '#ffd166', '#7effd5', '#6b8dff', '#d68bff', '#fff48f'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            confetti.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (1 + Math.random() * 2),
                size: 4 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.3,
                life: 1000 + Math.random() * 2000,
                age: 0
            });
        }
    }

    function spawnCracker(x, y) {
        crackers.push({
            x, y,
            vx: (Math.random() - 0.5) * 3,
            vy: -6 - Math.random() * 3,
            rot: Math.random() * Math.PI * 2,
            life: 900 + Math.random() * 600,
            age: 0
        });
    }

    function updateCelebration(dt) {
        for (let i = confetti.length - 1; i >= 0; i--) {
            const p = confetti[i];
            p.age += dt * 1000;
            p.vy += 0.018 * dt * 60;
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.rot += p.vrot * dt * 60;
            if (p.age > p.life || p.y - p.size > H + 50) confetti.splice(i, 1);
        }
        for (let i = crackers.length - 1; i >= 0; i--) {
            const c = crackers[i];
            c.age += dt * 1000;
            c.vy += 0.04 * dt * 60;
            c.x += c.vx * dt * 60;
            c.y += c.vy * dt * 60;
            c.rot += 0.06 * dt * 60;
            if (c.age > c.life || c.y > H + 100) {
                spawnConfettiBurst(c.x, c.y, 18);
                crackers.splice(i, 1);
            }
        }
    }

    function drawTrophy(cx, cy, w, h) {
        ctx.save();
        ctx.translate(cx, cy);
        const s = Math.min(w, h) / 160;
        ctx.scale(s, s);

        // cup bowl
        const g = ctx.createLinearGradient(-40, -60, 40, 40);
        g.addColorStop(0, '#fff9c4');
        g.addColorStop(0.35, '#ffd54f');
        g.addColorStop(1, '#b88a00');
        ctx.fillStyle = g;
        ctx.strokeStyle = '#d1af00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-48, -40);
        ctx.quadraticCurveTo(-58, -20, -48, 0);
        ctx.lineTo(-20, 10);
        ctx.quadraticCurveTo(-10, 22, 0, 24);
        ctx.quadraticCurveTo(10, 22, 20, 10);
        ctx.lineTo(48, 0);
        ctx.quadraticCurveTo(58, -20, 48, -40);
        ctx.quadraticCurveTo(0, -70, -48, -40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // shine
        ctx.beginPath();
        ctx.moveTo(-30, -30);
        ctx.bezierCurveTo(-10, -40, 10, -40, 30, -30);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // base
        const baseGrad = ctx.createLinearGradient(-20, 30, 20, 80);
        baseGrad.addColorStop(0, '#ffd54f');
        baseGrad.addColorStop(1, '#9a6b00');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.rect(-24, 24, 48, 18);
        ctx.fill();
        ctx.strokeStyle = '#8f6a00';
        ctx.stroke();

        // handles
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#f2d16b';
        ctx.moveTo(-48, -20);
        ctx.bezierCurveTo(-70, -10, -70, 10, -48, 22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(48, -20);
        ctx.bezierCurveTo(70, -10, 70, 10, 48, 22);
        ctx.stroke();

        // small sparkles
        drawStar(-10, -60, 6, '#fff7c6', 0.9);
        drawStar(50, -78, 5, '#ffd8a6', 0.8);
        drawStar(-60, -30, 5, '#ffe9b3', 0.75);

        ctx.restore();
    }

    function drawStar(x, y, radius, color, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(x + Math.cos((18 + i * 72) / 180 * Math.PI) * radius, y - Math.sin((18 + i * 72) / 180 * Math.PI) * radius);
            ctx.lineTo(x + Math.cos((54 + i * 72) / 180 * Math.PI) * (radius / 2), y - Math.sin((54 + i * 72) / 180 * Math.PI) * (radius / 2));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Ball/paddle helpers
    function resetBall(direction = null) {
        ball.x = W / 2;
        ball.y = H / 2;
        ball.speed = 6;
        const angle = (Math.random() * Math.PI / 3) - (Math.PI / 6);
        const dir = direction || (Math.random() < 0.5 ? -1 : 1);
        ball.vx = dir * ball.speed * Math.cos(angle);
        ball.vy = ball.speed * Math.sin(angle);
    }
    function clamp(val, a, b) { return Math.max(a, Math.min(b, val)); }

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        leftPaddle.y = clamp(y - leftPaddle.height / 2, 0, H - leftPaddle.height);
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            if (!gameOver) paused = !paused;
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            keys[e.key] = true; e.preventDefault();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            keys[e.key] = false; e.preventDefault();
        }
    });

    function ballHitsPaddle(paddle) {
        return (
            ball.x - ball.r < paddle.x + paddle.width &&
            ball.x + ball.r > paddle.x &&
            ball.y + ball.r > paddle.y &&
            ball.y - ball.r < paddle.y + paddle.height
        );
    }

    function triggerPlayerWin() {
        gameOver = true;
        paused = true;
        celebrationTime = 0;
        confetti = [];
        crackers = [];
        // trophy position
        const trophyX = W / 2;
        const trophyY = H * 0.56;
        // spawn crackers around trophy
        for (let i = 0; i < 8; i++) spawnCracker(trophyX + (Math.random() - 0.5) * 240, trophyY - 10 + Math.random() * 40);
        spawnConfettiBurst(trophyX, trophyY - 10, 220);
        // optional cheer sound
        const cheer = new Audio('assets/cheer.wav');
        if (!muteChk.checked) { try { cheer.play(); } catch (e) { } }
    }

    function triggerOpponentWin() {
        gameOver = true;
        paused = true;
        confetti = [];
        crackers = [];
        spawnConfettiBurst(W / 2, H / 2, 64);
    }

    function update(dt) {
        if (!gameStarted || paused || gameOver) {
            if (gameOver) {
                updateCelebration(dt);
                celebrationTime += dt * 1000;
            }
            bgOffsetX += bgScrollSpeed * dt * 60;
            if (bgReady && bgOffsetX >= bgImage.width) bgOffsetX -= bgImage.width;
            return;
        }

        // gameplay update
        if (keys.ArrowUp) leftPaddle.y -= leftPaddle.speed;
        if (keys.ArrowDown) leftPaddle.y += leftPaddle.speed;
        leftPaddle.y = clamp(leftPaddle.y, 0, H - leftPaddle.height);

        if (rightPaddle.y + rightPaddle.height / 2 < ball.y - 6) rightPaddle.y += rightPaddle.speed;
        else if (rightPaddle.y + rightPaddle.height / 2 > ball.y + 6) rightPaddle.y -= rightPaddle.speed;
        rightPaddle.y = clamp(rightPaddle.y, 0, H - rightPaddle.height);

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.vy = -ball.vy; playTick(); }
        if (ball.y + ball.r >= H) { ball.y = H - ball.r; ball.vy = -ball.vy; playTick(); }

        if (ball.vx < 0 && ballHitsPaddle(leftPaddle)) {
            const rel = (ball.y - (leftPaddle.y + leftPaddle.height / 2)) / (leftPaddle.height / 2);
            const bounceAngle = rel * (Math.PI / 3);
            ball.speed *= 1.05;
            ball.vx = Math.abs(ball.speed * Math.cos(bounceAngle));
            ball.vy = ball.speed * Math.sin(bounceAngle);
            ball.x = leftPaddle.x + leftPaddle.width + ball.r + 0.5;
            playTick();
        } else if (ball.vx > 0 && ballHitsPaddle(rightPaddle)) {
            const rel = (ball.y - (rightPaddle.y + rightPaddle.height / 2)) / (rightPaddle.height / 2);
            const bounceAngle = rel * (Math.PI / 3);
            ball.speed *= 1.05;
            ball.vx = -Math.abs(ball.speed * Math.cos(bounceAngle));
            ball.vy = ball.speed * Math.sin(bounceAngle);
            ball.x = rightPaddle.x - ball.r - 0.5;
            playTick();
        }

        if (ball.x - ball.r <= 0) {
            score.right += 1;
            resetBall(1);
        } else if (ball.x + ball.r >= W) {
            score.left += 1;
            resetBall(-1);
        }

        if (score.left >= WIN_SCORE) triggerPlayerWin();
        else if (score.right >= WIN_SCORE) triggerOpponentWin();

        bgOffsetX += bgScrollSpeed * dt * 60;
        if (bgReady && bgOffsetX >= bgImage.width) bgOffsetX -= bgImage.width;
    }

    function drawBackground() {
        if (!bgReady) {
            ctx.fillStyle = '#041027';
            ctx.fillRect(0, 0, W, H);
            return;
        }
        const imgW = bgImage.width;
        const imgH = bgImage.height;
        const scale = H / imgH;
        const drawW = imgW * scale;
        let x = - (bgOffsetX % drawW);
        while (x < W) {
            ctx.drawImage(bgImage, x, 0, drawW, H);
            x += drawW;
        }
    }

    function drawNet() {
        ctx.save();
        ctx.strokeStyle = '#2f8cff';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.restore();
    }

    function drawCelebrationOverlay() {
        // dark overlay to dim gameplay but keep background visible
        ctx.fillStyle = 'rgba(3,7,20,0.6)';
        ctx.fillRect(0, 0, W, H);

        // Top-center final score (pill background + large numbers)
        const scoreTextLeft = `${score.left}`;
        const scoreTextRight = `${score.right}`;
        const labelLeft = 'You';
        const labelRight = 'CPU';
        ctx.font = 'bold 40px system-ui, Arial';
        const leftW = ctx.measureText(scoreTextLeft).width;
        const rightW = ctx.measureText(scoreTextRight).width;
        const gap = 28;
        const totalW = leftW + rightW + gap;
        const centerX = W / 2;
        const topY = 70;

        // pill background
        const padX = 28;
        const padY = 16;
        const pillW = totalW + padX * 2;
        const pillH = 72;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundRect(ctx, centerX - pillW / 2, topY - pillH / 2, pillW, pillH, 36, true, false);

        // separator vertical line in pill (for clarity)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, topY - pillH / 2 + 8);
        ctx.lineTo(centerX, topY + pillH / 2 - 8);
        ctx.stroke();

        // draw left number and right number
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.font = 'bold 44px system-ui, Arial';
        ctx.fillText(scoreTextLeft, centerX - gap / 2 - 6, topY + 14);
        ctx.textAlign = 'left';
        ctx.fillText(scoreTextRight, centerX + gap / 2 + 6, topY + 14);

        // small labels
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '16px system-ui, Arial';
        ctx.textAlign = 'right';
        ctx.fillText(labelLeft, centerX - gap / 2 - 6, topY - 26);
        ctx.textAlign = 'left';
        ctx.fillText(labelRight, centerX + gap / 2 + 6, topY - 26);

        // trophy centered below the score
        const trophyX = centerX;
        const trophyY = H * 0.55;
        const trophySize = Math.min(240, H * 0.35);
        drawTrophy(trophyX, trophyY, trophySize, trophySize);

        // "You Win!" text when player wins, otherwise "Game Over"
        ctx.textAlign = 'center';
        if (score.left > score.right) {
            ctx.fillStyle = '#ffd957';
            ctx.font = 'bold 36px system-ui, Arial';
            ctx.fillText('You Win!', centerX, topY - 78);
        } else {
            ctx.fillStyle = '#ffffffcc';
            ctx.font = 'bold 36px system-ui, Arial';
            ctx.fillText('Game Over', centerX, topY - 78);
        }

        // hint text
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '16px system-ui, Arial';
        ctx.fillText('Press Restart to play again', centerX, trophyY + trophySize * 0.6 + 26);

        // draw confetti and crackers (on top)
        for (const p of confetti) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        }
        for (const c of crackers) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot);
            ctx.fillStyle = '#f7c873';
            ctx.fillRect(-10, -6, 20, 12);
            // sparkles
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
                const r = 8 + Math.random() * 8;
                const sx = Math.cos(angle) * r;
                const sy = Math.sin(angle) * r;
                ctx.fillStyle = `hsl(${Math.random() * 360},80%,60%)`;
                ctx.fillRect(sx, sy, 3, 3);
            }
            ctx.restore();
        }
    }

    function roundRect(ctx, x, y, w, h, r, fill = true, stroke = true) {
        if (r === undefined) r = 6;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function draw() {
        // background
        if (!bgReady) {
            ctx.fillStyle = '#041027';
            ctx.fillRect(0, 0, W, H);
        } else {
            const imgW = bgImage.width;
            const imgH = bgImage.height;
            const scale = H / imgH;
            const drawW = imgW * scale;
            let x = - (bgOffsetX % drawW);
            while (x < W) {
                ctx.drawImage(bgImage, x, 0, drawW, H);
                x += drawW;
            }
        }

        // gameplay elements (still drawn under overlay)
        drawNet();
        ctx.fillStyle = '#e6eef8';
        ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
        ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

        ctx.beginPath();
        ctx.fillStyle = '#ffd166';
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();

        // live score at top corners (smaller) - overlay will show final score prominently
        ctx.fillStyle = '#cfe8ff';
        ctx.font = '28px system-ui, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`You: ${score.left}`, 16, 36);
        ctx.textAlign = 'right';
        ctx.fillText(`CPU: ${score.right}`, W - 16, 36);

        // overlays for paused or not started
        if (!gameStarted) {
            ctx.fillStyle = 'rgba(3,7,20,0.6)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '28px system-ui, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Click Start to play (audio requires user gesture)', W / 2, H / 2);
        } else if (paused && !gameOver) {
            ctx.fillStyle = 'rgba(3,7,20,0.45)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '32px system-ui, Arial';
            ctx.fillText('Paused', W / 2, H / 2);
        }

        // celebration overlay when game over
        if (gameOver) drawCelebrationOverlay();
    }

    // Main loop
    let lastTime = performance.now();
    function loop(now) {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    // Focus canvas for keyboard
    canvas.addEventListener('click', () => canvas.focus());

    // Start button
    startBtn.addEventListener('click', async () => {
        if (gameOver) return;
        gameStarted = true;
        paused = false;
        await safePlay(bgMusic);
        canvas.focus();
    });

    // Restart button resets everything
    restartBtn.addEventListener('click', async () => {
        score.left = 0;
        score.right = 0;
        leftPaddle.y = (H - paddleHeight) / 2;
        rightPaddle.y = (H - paddleHeight) / 2;
        resetBall();
        paused = false;
        gameOver = false;
        gameStarted = true;
        confetti = [];
        crackers = [];
        celebrationTime = 0;
        await safePlay(bgMusic);
        canvas.focus();
    });

    // Mute toggle
    muteChk.addEventListener('change', () => {
        if (muteChk.checked) safePause(bgMusic);
        else if (gameStarted) safePlay(bgMusic);
    });

    // initialize
    resetBall();
    requestAnimationFrame(loop);
})();