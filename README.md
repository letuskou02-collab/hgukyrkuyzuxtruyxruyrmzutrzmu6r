# 国道ステッカー記録 PWA

国道ステッカー取得の記録と地図表示ができるプログレッシブウェブアプリケーション（PWA）です

## 機能

- 📝 **ステッカー記録**：国道番号、取得日、場所、画像、メモを記録
- 🗺️ **地図表示**：取得地点を地図上に表示
- 📸 **画像保存**：ステッカーの写真を記録
- 📱 **オフライン対応**：Service Worker でオフライン利用可能
- 💾 **ローカルストレージ**：IndexedDB でデータを保持

## 技術スタック

- **フレームワーク**：Vue.js 3
- **地図**：Leaflet + OpenStreetMap
- **ストレージ**：IndexedDB
- **PWA**：Service Worker + Web App Manifest
- **スタイル**：CSS3（緑系カラースキーム）

## セットアップ

### 方法1：ローカルサーバーで実行

```bash
cd sticker-app

# Python 3
python -m http.server 8000

# または Node.js
npx http-server
```

ブラウザで `http://localhost:8000` を開く

### 方法2：HTTPS の静的ホスティング

PWA の full features を使用するには HTTPS が必須です：

- **Vercel** / **Netlify** / **GitHub Pages** にデプロイ
- または自分のサーバーで HTTPS を設定

## 使い方

### 1. ステッカーを記録

- **追加** タブで新規ステッカー情報を入力
- 最低限必要：国道番号、取得日
- オプション：場所、座標、画像、メモ

### 2. 一覧確認

- **リスト** タブで記録済みステッカーを確認
- 国道番号で検索可能
- 各カードから削除も可能

### 3. 地図表示

- **地図** タブで取得地点を地図で表示
- 座標が設定されたステッカーが地図にプロット
- マーカーをクリックで詳細表示

## ファイル構成

```
sticker-app/
├── index.html      # メイン HTML（Vue アプリケーション）
├── styles.css      # スタイル（緑系デザイン）
├── app.js          # Vue ロジック + IndexedDB 処理
├── sw.js           # Service Worker（オフライン対応）
├── manifest.json   # PWA マニフェスト
└── README.md       # このファイル
```

## 主な設計パターン

### IndexedDB

`StickerDB` クラスで以下を管理：
- ステッカー情報の保存・取得・削除
- 画像データも base64 で保存

### Service Worker

- **キャッシュファースト戦略**：ローカルキャッシュを優先
- オフライン時も前回キャッシュから表示
- 外部リソース（タイル画像）も段階的にキャッシュ

### 座標管理

- Leaflet に `[latitude, longitude]` で渡す
- 内部では経度・緯度を分離管理

## データ形式

記録されるステッカーオブジェクト：

```javascript
{
    id: 1708254000000,
    roadNumber: 4,           // 国道番号
    date: "2024-02-18",      // 取得日
    location: "青森県弘前市", // 取得場所
    latitude: 40.604,        // 緯度
    longitude: 140.6235,     // 経度
    image: "data:image/...", // base64 画像
    memo: "..."              // メモ
}
```

## Tips

- **オフラインで使用**：最初に 1 回 HTTPS でロード、その後オフラインでも利用可
- **画像サイズ**：大きい画像は IndexedDB の容量注意（最大 50MB 程度）
- **バックアップ**：Export/Import 機能を追加するとより便利

## ブラウザ対応

- Chrome/Edge：完全対応
- Firefox：完全対応
- Safari：基本機能は対応（PWA のホーム画面追加など一部制限）

## ライセンス

MIT
