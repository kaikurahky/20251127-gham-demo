/**
 * スペースインベーダー - メインゲームスクリプト
 * 80年代のアーケードゲームを再現したクラシックシューティングゲーム
 */

// ゲーム定数
const GAME_CONFIG = {
    // キャンバスサイズ（基準サイズ）
    BASE_WIDTH: 800,
    BASE_HEIGHT: 600,
    
    // 自機設定
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 20,
    PLAYER_SPEED: 5,
    PLAYER_INITIAL_LIVES: 3,
    
    // 弾の設定
    BULLET_WIDTH: 4,
    BULLET_HEIGHT: 15,
    BULLET_SPEED: 8,
    ENEMY_BULLET_SPEED: 4,
    
    // インベーダー設定
    INVADER_ROWS: 5,
    INVADER_COLS: 11,
    INVADER_WIDTH: 40,
    INVADER_HEIGHT: 30,
    INVADER_PADDING: 10,
    INVADER_BASE_SPEED: 1, // 1秒に1キャラクター分の移動
    INVADER_DROP_DISTANCE: 20,
    
    // バリア設定
    BARRIER_COUNT: 4,
    BARRIER_WIDTH: 60,
    BARRIER_HEIGHT: 40,
    BARRIER_HEALTH: 10,
    
    // UFO設定
    UFO_WIDTH: 50,
    UFO_HEIGHT: 20,
    UFO_SPEED: 3,
    UFO_SPAWN_INTERVAL: 15000, // 15秒ごとに出現
    UFO_SCORE: 300,
    
    // スコア設定
    INVADER_SCORES: [50, 40, 30, 20, 10], // 上段から下段へ
    
    // 音声周波数
    INVADER_MOVE_FREQUENCIES: [75.9, 66.2, 62.2, 57.7],
    
    // 難易度設定
    MAX_SPEED_MULTIPLIER: 10,
};

// ゲーム状態
let gameState = {
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    highScore: 0,
    lives: GAME_CONFIG.PLAYER_INITIAL_LIVES,
    stage: 1,
    
    // 移動音のインデックス
    moveFrequencyIndex: 0,
};

// ゲームオブジェクト
let player = null;
let invaders = [];
let barriers = [];
let playerBullet = null;
let enemyBullets = [];
let ufo = null;

// 入力状態
let keys = {
    left: false,
    right: false,
    space: false,
};

// タイマー
let lastInvaderMove = 0;
let lastUFOSpawn = 0;
let lastEnemyShot = 0;
let invaderMoveInterval = 1000; // 初期は1秒ごと

// Canvas要素
let canvas, ctx;
let scale = 1;

// Audio Context
let audioContext = null;

/**
 * 初期化
 */
function init() {
    console.log('[INIT] ゲーム初期化開始');
    
    // Canvas設定
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // ハイスコアをロード
    loadHighScore();
    
    // 画面サイズ調整
    resizeGame();
    window.addEventListener('resize', resizeGame);
    
    // イベントリスナー設定
    setupEventListeners();
    
    // ゲームオブジェクト初期化
    resetGame();
    
    // 初期描画
    draw();
    
    console.log('[INIT] ゲーム初期化完了');
}

/**
 * 画面サイズに応じてゲームをリサイズ
 */
function resizeGame() {
    const container = document.getElementById('game-container');
    const viewportWidth = window.innerWidth * 0.9;
    const viewportHeight = window.innerHeight * 0.9;
    
    // アスペクト比を維持しながらサイズ計算
    const aspectRatio = GAME_CONFIG.BASE_WIDTH / GAME_CONFIG.BASE_HEIGHT;
    let width = viewportWidth;
    let height = width / aspectRatio;
    
    if (height > viewportHeight) {
        height = viewportHeight;
        width = height * aspectRatio;
    }
    
    // 最大サイズを設定
    width = Math.min(width, GAME_CONFIG.BASE_WIDTH);
    height = Math.min(height, GAME_CONFIG.BASE_HEIGHT);
    
    scale = width / GAME_CONFIG.BASE_WIDTH;
    
    canvas.width = GAME_CONFIG.BASE_WIDTH;
    canvas.height = GAME_CONFIG.BASE_HEIGHT;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    console.log(`[RESIZE] キャンバスサイズ: ${width}x${height}, スケール: ${scale}`);
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // キーボードイベント
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // ボタンイベント
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('popup-reset-btn').addEventListener('click', resetGame);
    document.getElementById('continue-btn').addEventListener('click', continueGame);
    
    console.log('[EVENT] イベントリスナー設定完了');
}

/**
 * キーダウン処理
 */
function handleKeyDown(e) {
    switch (e.key) {
        case 'ArrowLeft':
            keys.left = true;
            e.preventDefault();
            break;
        case 'ArrowRight':
            keys.right = true;
            e.preventDefault();
            break;
        case ' ':
            keys.space = true;
            e.preventDefault();
            break;
        case 's':
        case 'S':
            startGame();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
        case 'r':
        case 'R':
            resetGame();
            break;
    }
}

/**
 * キーアップ処理
 */
function handleKeyUp(e) {
    switch (e.key) {
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowRight':
            keys.right = false;
            break;
        case ' ':
            keys.space = false;
            break;
    }
}

/**
 * ゲーム開始
 */
function startGame() {
    if (gameState.isRunning && !gameState.isPaused) return;
    
    console.log('[GAME] ゲーム開始');
    
    // AudioContext初期化（ユーザー操作後に初期化）
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (gameState.isGameOver) {
        resetGame();
    }
    
    gameState.isRunning = true;
    gameState.isPaused = false;
    
    // ゲームループ開始
    requestAnimationFrame(gameLoop);
}

/**
 * 一時停止切り替え
 */
function togglePause() {
    if (!gameState.isRunning) return;
    
    gameState.isPaused = !gameState.isPaused;
    console.log(`[GAME] 一時停止: ${gameState.isPaused}`);
    
    if (!gameState.isPaused) {
        requestAnimationFrame(gameLoop);
    }
}

/**
 * ゲームリセット
 */
function resetGame() {
    console.log('[GAME] ゲームリセット');
    
    gameState.isRunning = false;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.score = 0;
    gameState.lives = GAME_CONFIG.PLAYER_INITIAL_LIVES;
    gameState.stage = 1;
    gameState.moveFrequencyIndex = 0;
    
    invaderMoveInterval = 1000;
    lastInvaderMove = 0;
    lastUFOSpawn = 0;
    lastEnemyShot = 0;
    
    // ゲームオブジェクト初期化
    initPlayer();
    initInvaders();
    initBarriers();
    playerBullet = null;
    enemyBullets = [];
    ufo = null;
    
    // UI更新
    updateUI();
    hidePopups();
    
    // 描画
    draw();
}

/**
 * ゲーム再スタート（ゲームオーバー後）
 */
function restartGame() {
    hidePopups();
    resetGame();
    startGame();
}

/**
 * 被弾後の続行
 */
function continueGame() {
    console.log('[GAME] ゲーム続行');
    
    document.getElementById('hit-popup').classList.add('hidden');
    
    // 自機を初期位置に戻す
    player.x = (GAME_CONFIG.BASE_WIDTH - GAME_CONFIG.PLAYER_WIDTH) / 2;
    playerBullet = null;
    enemyBullets = [];
    
    gameState.isPaused = false;
    requestAnimationFrame(gameLoop);
}

/**
 * ポップアップを非表示
 */
function hidePopups() {
    document.getElementById('game-over-popup').classList.add('hidden');
    document.getElementById('hit-popup').classList.add('hidden');
}

/**
 * 自機の初期化
 */
function initPlayer() {
    player = {
        x: (GAME_CONFIG.BASE_WIDTH - GAME_CONFIG.PLAYER_WIDTH) / 2,
        y: GAME_CONFIG.BASE_HEIGHT - GAME_CONFIG.PLAYER_HEIGHT - 30,
        width: GAME_CONFIG.PLAYER_WIDTH,
        height: GAME_CONFIG.PLAYER_HEIGHT,
    };
    console.log('[INIT] 自機初期化:', player);
}

/**
 * インベーダーの初期化
 */
function initInvaders() {
    invaders = [];
    
    const startX = (GAME_CONFIG.BASE_WIDTH - (GAME_CONFIG.INVADER_COLS * (GAME_CONFIG.INVADER_WIDTH + GAME_CONFIG.INVADER_PADDING))) / 2;
    const startY = 80;
    
    for (let row = 0; row < GAME_CONFIG.INVADER_ROWS; row++) {
        for (let col = 0; col < GAME_CONFIG.INVADER_COLS; col++) {
            invaders.push({
                x: startX + col * (GAME_CONFIG.INVADER_WIDTH + GAME_CONFIG.INVADER_PADDING),
                y: startY + row * (GAME_CONFIG.INVADER_HEIGHT + GAME_CONFIG.INVADER_PADDING),
                width: GAME_CONFIG.INVADER_WIDTH,
                height: GAME_CONFIG.INVADER_HEIGHT,
                type: row, // 0-4: 上段から下段
                alive: true,
                animFrame: 0,
            });
        }
    }
    
    console.log(`[INIT] インベーダー初期化: ${invaders.length}体`);
}

/**
 * バリアの初期化
 */
function initBarriers() {
    barriers = [];
    
    const barrierSpacing = GAME_CONFIG.BASE_WIDTH / (GAME_CONFIG.BARRIER_COUNT + 1);
    const barrierY = GAME_CONFIG.BASE_HEIGHT - 120;
    
    for (let i = 0; i < GAME_CONFIG.BARRIER_COUNT; i++) {
        // バリアをブロック単位で管理
        const barrierX = barrierSpacing * (i + 1) - GAME_CONFIG.BARRIER_WIDTH / 2;
        const blocks = [];
        
        // 5x4のブロック配列でバリアを構成
        const blockWidth = GAME_CONFIG.BARRIER_WIDTH / 5;
        const blockHeight = GAME_CONFIG.BARRIER_HEIGHT / 4;
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                // アーチ形状を作成（下中央に穴を開ける）
                if (row === 3 && (col === 2)) continue;
                if (row === 2 && col === 2) continue;
                
                blocks.push({
                    x: barrierX + col * blockWidth,
                    y: barrierY + row * blockHeight,
                    width: blockWidth,
                    height: blockHeight,
                    health: 3,
                });
            }
        }
        
        barriers.push(...blocks);
    }
    
    console.log(`[INIT] バリア初期化: ${barriers.length}ブロック`);
}

/**
 * メインゲームループ
 */
let lastTime = 0;
function gameLoop(timestamp) {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // 更新
    update(timestamp, deltaTime);
    
    // 描画
    draw();
    
    // 次のフレーム
    if (gameState.isRunning && !gameState.isPaused) {
        requestAnimationFrame(gameLoop);
    }
}

/**
 * ゲーム状態の更新
 */
function update(timestamp, deltaTime) {
    // 自機の移動
    updatePlayer();
    
    // 弾の更新
    updateBullets();
    
    // インベーダーの移動
    updateInvaders(timestamp);
    
    // 敵の射撃
    updateEnemyShooting(timestamp);
    
    // UFOの更新
    updateUFO(timestamp);
    
    // 衝突判定
    checkCollisions();
    
    // ゲーム状態チェック
    checkGameState();
}

/**
 * 自機の更新
 */
function updatePlayer() {
    if (keys.left && player.x > 0) {
        player.x -= GAME_CONFIG.PLAYER_SPEED;
    }
    if (keys.right && player.x < GAME_CONFIG.BASE_WIDTH - player.width) {
        player.x += GAME_CONFIG.PLAYER_SPEED;
    }
    
    // 弾の発射
    if (keys.space && !playerBullet) {
        playerBullet = {
            x: player.x + player.width / 2 - GAME_CONFIG.BULLET_WIDTH / 2,
            y: player.y,
            width: GAME_CONFIG.BULLET_WIDTH,
            height: GAME_CONFIG.BULLET_HEIGHT,
        };
        playShootSound();
        console.log('[SHOOT] 自機弾発射');
    }
}

/**
 * 弾の更新
 */
function updateBullets() {
    // 自機の弾
    if (playerBullet) {
        playerBullet.y -= GAME_CONFIG.BULLET_SPEED;
        
        if (playerBullet.y + playerBullet.height < 0) {
            playerBullet = null;
            console.log('[BULLET] 自機弾が画面外へ');
        }
    }
    
    // 敵の弾
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].y += GAME_CONFIG.ENEMY_BULLET_SPEED;
        
        if (enemyBullets[i].y > GAME_CONFIG.BASE_HEIGHT) {
            enemyBullets.splice(i, 1);
        }
    }
}

/**
 * インベーダーの更新
 */
function updateInvaders(timestamp) {
    if (timestamp - lastInvaderMove < invaderMoveInterval) return;
    
    lastInvaderMove = timestamp;
    
    // 生存インベーダーをカウント
    const aliveInvaders = invaders.filter(inv => inv.alive);
    if (aliveInvaders.length === 0) return;
    
    // 移動音を再生
    playInvaderMoveSound();
    
    // 画面端チェック
    let hitEdge = false;
    let moveDirection = invaders[0].direction || 1; // 1: 右, -1: 左
    
    for (const inv of aliveInvaders) {
        if ((moveDirection > 0 && inv.x + inv.width >= GAME_CONFIG.BASE_WIDTH - 10) ||
            (moveDirection < 0 && inv.x <= 10)) {
            hitEdge = true;
            break;
        }
    }
    
    // 移動処理
    for (const inv of aliveInvaders) {
        if (hitEdge) {
            inv.y += GAME_CONFIG.INVADER_DROP_DISTANCE;
            inv.direction = -moveDirection;
        } else {
            inv.x += moveDirection * GAME_CONFIG.INVADER_WIDTH;
        }
        inv.animFrame = (inv.animFrame + 1) % 2;
    }
    
    // 最初のインベーダーに方向を保存
    if (hitEdge) {
        invaders[0].direction = -moveDirection;
    } else if (!invaders[0].direction) {
        invaders[0].direction = 1;
    }
    
    // 速度更新（指数的に速くなる）
    updateInvaderSpeed();
}

/**
 * インベーダーの速度更新
 */
function updateInvaderSpeed() {
    const aliveCount = invaders.filter(inv => inv.alive).length;
    const totalCount = GAME_CONFIG.INVADER_ROWS * GAME_CONFIG.INVADER_COLS;
    const ratio = aliveCount / totalCount;
    
    // 残り数に応じて指数的に速度アップ
    // 残り全部: 1000ms, 残り1体: 100ms (10倍速)
    const speedMultiplier = GAME_CONFIG.MAX_SPEED_MULTIPLIER ** (1 - ratio);
    invaderMoveInterval = 1000 / speedMultiplier;
    
    // 最低間隔を設定
    invaderMoveInterval = Math.max(invaderMoveInterval, 50);
}

/**
 * 敵の射撃
 */
function updateEnemyShooting(timestamp) {
    // 射撃間隔（ステージに応じて短くなる）
    const shootInterval = Math.max(1000 - (gameState.stage - 1) * 100, 300);
    
    if (timestamp - lastEnemyShot < shootInterval) return;
    
    const aliveInvaders = invaders.filter(inv => inv.alive);
    if (aliveInvaders.length === 0) return;
    
    // 最下段のインベーダーから射撃
    const bottomInvaders = getBottomInvaders();
    
    // ステージに応じて同時に撃つ数を増やす
    const bulletCount = Math.min(gameState.stage, 3);
    
    for (let i = 0; i < bulletCount && i < bottomInvaders.length; i++) {
        const shooter = bottomInvaders[Math.floor(Math.random() * bottomInvaders.length)];
        
        enemyBullets.push({
            x: shooter.x + shooter.width / 2 - GAME_CONFIG.BULLET_WIDTH / 2,
            y: shooter.y + shooter.height,
            width: GAME_CONFIG.BULLET_WIDTH,
            height: GAME_CONFIG.BULLET_HEIGHT,
        });
    }
    
    lastEnemyShot = timestamp;
}

/**
 * 各列の最下段インベーダーを取得
 */
function getBottomInvaders() {
    const columns = {};
    
    for (const inv of invaders) {
        if (!inv.alive) continue;
        
        const col = Math.floor(inv.x / (GAME_CONFIG.INVADER_WIDTH + GAME_CONFIG.INVADER_PADDING));
        if (!columns[col] || inv.y > columns[col].y) {
            columns[col] = inv;
        }
    }
    
    return Object.values(columns);
}

/**
 * UFOの更新
 */
function updateUFO(timestamp) {
    // UFO出現チェック
    if (!ufo && timestamp - lastUFOSpawn > GAME_CONFIG.UFO_SPAWN_INTERVAL) {
        lastUFOSpawn = timestamp;
        
        // 50%の確率で出現
        if (Math.random() > 0.5) {
            ufo = {
                x: -GAME_CONFIG.UFO_WIDTH,
                y: 40,
                width: GAME_CONFIG.UFO_WIDTH,
                height: GAME_CONFIG.UFO_HEIGHT,
                direction: 1,
            };
            playUFOSound();
            console.log('[UFO] UFO出現');
        }
    }
    
    // UFO移動
    if (ufo) {
        ufo.x += GAME_CONFIG.UFO_SPEED * ufo.direction;
        
        if (ufo.x > GAME_CONFIG.BASE_WIDTH) {
            ufo = null;
            console.log('[UFO] UFO退場');
        }
    }
}

/**
 * 衝突判定
 */
function checkCollisions() {
    // 自機弾とインベーダー
    if (playerBullet) {
        for (const inv of invaders) {
            if (!inv.alive) continue;
            
            if (isColliding(playerBullet, inv)) {
                inv.alive = false;
                playerBullet = null;
                
                // スコア加算
                const scoreValue = GAME_CONFIG.INVADER_SCORES[inv.type];
                gameState.score += scoreValue;
                updateUI();
                
                playExplosionSound();
                console.log(`[HIT] インベーダー撃破 Type:${inv.type} Score:+${scoreValue}`);
                break;
            }
        }
    }
    
    // 自機弾とUFO
    if (playerBullet && ufo) {
        if (isColliding(playerBullet, ufo)) {
            gameState.score += GAME_CONFIG.UFO_SCORE;
            updateUI();
            
            playExplosionSound();
            console.log('[HIT] UFO撃破 Score:+' + GAME_CONFIG.UFO_SCORE);
            
            playerBullet = null;
            ufo = null;
        }
    }
    
    // 自機弾とバリア
    if (playerBullet) {
        for (let i = barriers.length - 1; i >= 0; i--) {
            if (barriers[i].health <= 0) continue;
            
            if (isColliding(playerBullet, barriers[i])) {
                barriers[i].health--;
                playerBullet = null;
                console.log('[HIT] 自機弾がバリアに命中');
                break;
            }
        }
    }
    
    // 敵弾と自機
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (isColliding(enemyBullets[i], player)) {
            enemyBullets.splice(i, 1);
            handlePlayerHit();
            break;
        }
    }
    
    // 敵弾とバリア
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        for (let j = barriers.length - 1; j >= 0; j--) {
            if (barriers[j].health <= 0) continue;
            
            if (isColliding(enemyBullets[i], barriers[j])) {
                barriers[j].health--;
                enemyBullets.splice(i, 1);
                break;
            }
        }
    }
    
    // インベーダーとバリア
    for (const inv of invaders) {
        if (!inv.alive) continue;
        
        for (let j = barriers.length - 1; j >= 0; j--) {
            if (barriers[j].health <= 0) continue;
            
            if (isColliding(inv, barriers[j])) {
                barriers[j].health = 0;
            }
        }
    }
}

/**
 * 矩形同士の衝突判定
 */
function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

/**
 * 自機被弾処理
 */
function handlePlayerHit() {
    console.log('[HIT] 自機被弾');
    
    playPlayerHitSound();
    showHitEffect();
    
    gameState.lives--;
    updateUI();
    
    if (gameState.lives <= 0) {
        gameOver();
    } else {
        // 被弾ポップアップ表示
        gameState.isPaused = true;
        document.getElementById('remaining-lives').textContent = gameState.lives;
        document.getElementById('hit-popup').classList.remove('hidden');
    }
}

/**
 * 被弾時の赤いフラッシュ
 */
function showHitEffect() {
    const overlay = document.getElementById('hit-overlay');
    overlay.classList.add('hit-flash');
    
    setTimeout(() => {
        overlay.classList.remove('hit-flash');
    }, 300);
}

/**
 * ゲーム状態チェック
 */
function checkGameState() {
    // インベーダーが画面下部に到達
    for (const inv of invaders) {
        if (inv.alive && inv.y + inv.height >= player.y) {
            console.log('[GAME] インベーダーが下部に到達');
            gameOver();
            return;
        }
    }
    
    // 全インベーダー撃破
    const aliveCount = invaders.filter(inv => inv.alive).length;
    if (aliveCount === 0) {
        nextStage();
    }
}

/**
 * 次のステージへ
 */
function nextStage() {
    console.log('[GAME] ステージクリア');
    
    gameState.stage++;
    invaderMoveInterval = 1000;
    lastInvaderMove = 0;
    
    // インベーダー再初期化
    initInvaders();
    initBarriers();
    playerBullet = null;
    enemyBullets = [];
    
    updateUI();
}

/**
 * ゲームオーバー
 */
function gameOver() {
    console.log('[GAME] ゲームオーバー');
    
    gameState.isRunning = false;
    gameState.isGameOver = true;
    
    // ハイスコア更新
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        saveHighScore();
    }
    
    playGameOverSound();
    
    // ゲームオーバーポップアップ表示
    document.getElementById('final-score').textContent = gameState.score.toString().padStart(4, '0');
    document.getElementById('final-high-score').textContent = gameState.highScore.toString().padStart(4, '0');
    document.getElementById('game-over-popup').classList.remove('hidden');
}

/**
 * UI更新
 */
function updateUI() {
    document.getElementById('score').textContent = gameState.score.toString().padStart(4, '0');
    document.getElementById('high-score').textContent = gameState.highScore.toString().padStart(4, '0');
    document.getElementById('stage').textContent = gameState.stage;
    
    // 残機表示
    const livesContainer = document.getElementById('lives');
    livesContainer.innerHTML = '';
    for (let i = 0; i < gameState.lives; i++) {
        const lifeIcon = document.createElement('span');
        lifeIcon.className = 'life-icon';
        lifeIcon.textContent = '▲';
        livesContainer.appendChild(lifeIcon);
    }
}

/**
 * 描画
 */
function draw() {
    // 背景クリア
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_CONFIG.BASE_WIDTH, GAME_CONFIG.BASE_HEIGHT);
    
    // バリア描画
    drawBarriers();
    
    // インベーダー描画
    drawInvaders();
    
    // UFO描画
    drawUFO();
    
    // 自機描画
    drawPlayer();
    
    // 弾描画
    drawBullets();
    
    // 一時停止表示（ポップアップが表示されていない場合のみ）
    if (gameState.isPaused && document.getElementById('hit-popup').classList.contains('hidden')) {
        drawPauseText();
    }
}

/**
 * 自機描画
 */
function drawPlayer() {
    ctx.fillStyle = '#22c55e';
    
    // 砲台の形を描画
    ctx.beginPath();
    // 本体
    ctx.fillRect(player.x, player.y + 8, player.width, 12);
    // 砲身
    ctx.fillRect(player.x + player.width / 2 - 3, player.y, 6, 10);
    // 砲口
    ctx.fillRect(player.x + player.width / 2 - 2, player.y - 2, 4, 4);
}

/**
 * インベーダー描画
 */
function drawInvaders() {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9d65c9'];
    
    for (const inv of invaders) {
        if (!inv.alive) continue;
        
        ctx.fillStyle = colors[inv.type];
        
        // シンプルなインベーダー形状
        const x = inv.x;
        const y = inv.y;
        const w = inv.width;
        const h = inv.height;
        
        // アニメーションフレームに応じて形を変える
        if (inv.animFrame === 0) {
            // フレーム0: 腕を下げた形
            drawInvaderShape1(x, y, w, h, inv.type);
        } else {
            // フレーム1: 腕を上げた形
            drawInvaderShape2(x, y, w, h, inv.type);
        }
    }
}

/**
 * インベーダー形状1（腕下げ）
 */
function drawInvaderShape1(x, y, w, h, type) {
    const unitW = w / 8;
    const unitH = h / 6;
    
    // 頭部
    ctx.fillRect(x + unitW * 2, y, unitW * 4, unitH * 2);
    // 胴体
    ctx.fillRect(x + unitW, y + unitH * 2, unitW * 6, unitH * 2);
    // 目（黒）
    ctx.fillStyle = '#000';
    ctx.fillRect(x + unitW * 2.5, y + unitH, unitW, unitH);
    ctx.fillRect(x + unitW * 4.5, y + unitH, unitW, unitH);
    
    // 色を戻す
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9d65c9'];
    ctx.fillStyle = colors[type];
    
    // 腕（下向き）
    ctx.fillRect(x, y + unitH * 3, unitW, unitH * 2);
    ctx.fillRect(x + unitW * 7, y + unitH * 3, unitW, unitH * 2);
    // 足
    ctx.fillRect(x + unitW * 2, y + unitH * 4, unitW, unitH * 2);
    ctx.fillRect(x + unitW * 5, y + unitH * 4, unitW, unitH * 2);
}

/**
 * インベーダー形状2（腕上げ）
 */
function drawInvaderShape2(x, y, w, h, type) {
    const unitW = w / 8;
    const unitH = h / 6;
    
    // 頭部
    ctx.fillRect(x + unitW * 2, y, unitW * 4, unitH * 2);
    // 胴体
    ctx.fillRect(x + unitW, y + unitH * 2, unitW * 6, unitH * 2);
    // 目（黒）
    ctx.fillStyle = '#000';
    ctx.fillRect(x + unitW * 2.5, y + unitH, unitW, unitH);
    ctx.fillRect(x + unitW * 4.5, y + unitH, unitW, unitH);
    
    // 色を戻す
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9d65c9'];
    ctx.fillStyle = colors[type];
    
    // 腕（上向き）
    ctx.fillRect(x, y + unitH, unitW, unitH * 2);
    ctx.fillRect(x + unitW * 7, y + unitH, unitW, unitH * 2);
    // 足（開き）
    ctx.fillRect(x + unitW, y + unitH * 4, unitW * 2, unitH * 2);
    ctx.fillRect(x + unitW * 5, y + unitH * 4, unitW * 2, unitH * 2);
}

/**
 * UFO描画
 */
function drawUFO() {
    if (!ufo) return;
    
    ctx.fillStyle = '#ff0080';
    
    const x = ufo.x;
    const y = ufo.y;
    const w = ufo.width;
    const h = ufo.height;
    
    // UFOの形状
    // ドーム部分
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 3, w / 3, h / 3, 0, Math.PI, 0);
    ctx.fill();
    
    // 本体
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // ライト
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w * 0.3, y + h * 0.4, 4, 4);
    ctx.fillRect(x + w * 0.5, y + h * 0.4, 4, 4);
    ctx.fillRect(x + w * 0.7, y + h * 0.4, 4, 4);
}

/**
 * バリア描画
 */
function drawBarriers() {
    for (const block of barriers) {
        if (block.health <= 0) continue;
        
        // 体力に応じて色を変える
        const alpha = block.health / 3;
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.fillRect(block.x, block.y, block.width, block.height);
    }
}

/**
 * 弾描画
 */
function drawBullets() {
    // 自機弾
    if (playerBullet) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(playerBullet.x, playerBullet.y, playerBullet.width, playerBullet.height);
    }
    
    // 敵弾
    ctx.fillStyle = '#ff4444';
    for (const bullet of enemyBullets) {
        // ジグザグ形状
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height / 3);
        ctx.fillRect(bullet.x - 2, bullet.y + bullet.height / 3, bullet.width + 4, bullet.height / 3);
        ctx.fillRect(bullet.x, bullet.y + bullet.height * 2 / 3, bullet.width, bullet.height / 3);
    }
}

/**
 * 一時停止テキスト描画
 */
function drawPauseText() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, GAME_CONFIG.BASE_WIDTH, GAME_CONFIG.BASE_HEIGHT);
    
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', GAME_CONFIG.BASE_WIDTH / 2, GAME_CONFIG.BASE_HEIGHT / 2);
}

// ===== 音声関連 =====

/**
 * インベーダー移動音
 */
function playInvaderMoveSound() {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.value = GAME_CONFIG.INVADER_MOVE_FREQUENCIES[gameState.moveFrequencyIndex];
        
        gainNode.gain.value = 0.1;
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        
        // 次の音に進む
        gameState.moveFrequencyIndex = (gameState.moveFrequencyIndex + 1) % 4;
    } catch (e) {
        console.error('[AUDIO] 移動音エラー:', e);
    }
}

/**
 * 発射音
 */
function playShootSound() {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
        
        gainNode.gain.value = 0.1;
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.error('[AUDIO] 発射音エラー:', e);
    }
}

/**
 * 爆発音（インベーダー撃破）
 */
function playExplosionSound() {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
        
        gainNode.gain.value = 0.15;
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.error('[AUDIO] 爆発音エラー:', e);
    }
}

/**
 * 自機被弾音（ホワイトノイズ爆発）
 */
function playPlayerHitSound() {
    if (!audioContext) return;
    
    try {
        // ホワイトノイズを生成
        const bufferSize = audioContext.sampleRate * 0.5;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.3;
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        noise.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        noise.start();
        noise.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.error('[AUDIO] 被弾音エラー:', e);
    }
}

/**
 * UFO出現音
 */
function playUFOSound() {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        
        // ピロピロ音を生成
        const now = audioContext.currentTime;
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.setValueAtTime(600, now + 0.1);
        oscillator.frequency.setValueAtTime(400, now + 0.2);
        oscillator.frequency.setValueAtTime(600, now + 0.3);
        
        gainNode.gain.value = 0.1;
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(now + 0.4);
    } catch (e) {
        console.error('[AUDIO] UFO音エラー:', e);
    }
}

/**
 * ゲームオーバー音
 */
function playGameOverSound() {
    if (!audioContext) return;
    
    try {
        const now = audioContext.currentTime;
        
        // 下降する音を複数鳴らす
        for (let i = 0; i < 4; i++) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.value = 200 - i * 30;
            
            gainNode.gain.value = 0.1;
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2 * (i + 1));
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(now + i * 0.2);
            oscillator.stop(now + (i + 1) * 0.2);
        }
    } catch (e) {
        console.error('[AUDIO] ゲームオーバー音エラー:', e);
    }
}

// ===== ハイスコア管理 =====

/**
 * ハイスコアの読み込み
 */
function loadHighScore() {
    try {
        const saved = localStorage.getItem('spaceInvadersHighScore');
        if (saved) {
            gameState.highScore = parseInt(saved, 10);
            console.log('[STORAGE] ハイスコア読み込み:', gameState.highScore);
        }
    } catch (e) {
        console.error('[STORAGE] ハイスコア読み込みエラー:', e);
    }
}

/**
 * ハイスコアの保存
 */
function saveHighScore() {
    try {
        localStorage.setItem('spaceInvadersHighScore', gameState.highScore.toString());
        console.log('[STORAGE] ハイスコア保存:', gameState.highScore);
    } catch (e) {
        console.error('[STORAGE] ハイスコア保存エラー:', e);
    }
}

// ===== 初期化実行 =====
window.addEventListener('DOMContentLoaded', init);
