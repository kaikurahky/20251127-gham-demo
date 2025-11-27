# スペースインベーダー - 技術仕様書

## 技術スタック

- **HTML5**: セマンティックマークアップ、Canvas API
- **CSS3**: カスタムスタイル、アニメーション
- **JavaScript (ES6)**: ゲームロジック、Web Audio API

## ファイル構成

```
src/
├── index.html      # メインHTML
├── css/
│   └── styles.css  # スタイルシート
└── js/
    └── script.js   # ゲームロジック
```

## ゲーム設定（GAME_CONFIG）

| 設定項目 | 値 | 説明 |
|----------|-----|------|
| BASE_WIDTH | 800 | キャンバス幅 |
| BASE_HEIGHT | 600 | キャンバス高さ |
| PLAYER_WIDTH | 40 | 自機幅 |
| PLAYER_HEIGHT | 20 | 自機高さ |
| PLAYER_SPEED | 5 | 自機移動速度 |
| INVADER_ROWS | 5 | インベーダー行数 |
| INVADER_COLS | 11 | インベーダー列数 |
| BARRIER_COUNT | 4 | バリア数 |
| UFO_SPAWN_INTERVAL | 15000 | UFO出現間隔(ms) |

## 主要クラス/関数

### 初期化
- `init()`: ゲーム全体の初期化
- `initPlayer()`: 自機の初期化
- `initInvaders()`: インベーダー隊列の初期化
- `initBarriers()`: バリアの初期化

### ゲームループ
- `gameLoop()`: メインループ（requestAnimationFrame使用）
- `update()`: ゲーム状態の更新
- `draw()`: 描画処理

### 衝突判定
- `checkCollisions()`: 全衝突判定
- `isColliding()`: 矩形同士の衝突判定

### 音声（Web Audio API）
- `playInvaderMoveSound()`: 移動音
- `playShootSound()`: 発射音
- `playExplosionSound()`: 爆発音
- `playPlayerHitSound()`: 被弾音（ホワイトノイズ）
- `playUFOSound()`: UFO音
- `playGameOverSound()`: ゲームオーバー音

### データ永続化
- `loadHighScore()`: ハイスコア読み込み
- `saveHighScore()`: ハイスコア保存

## レスポンシブ対応

- ビューポートの90%サイズでゲーム画面を表示
- アスペクト比を維持しながらスケーリング
- `resizeGame()`関数でウィンドウリサイズに対応

## ブラウザ互換性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
