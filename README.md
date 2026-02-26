# 国道走行記録 🛣️

日本の国道を走った記録を地図上で管理できるPWA（Progressive Web App）です。

🌐 **デモ**: [https://あなたのユーザー名.github.io/japan-road-tracker/](https://github.com)

## 📱 機能

- **地図表示**: OpenStreetMapを使用した日本地図
- **走破記録**: 走った国道をクリックするだけで赤色にマーク
- **リスト管理**: サイドパネルで国道一覧を確認・検索
- **統計表示**: 走破数・達成率をリアルタイム表示
- **フィルター**: 走破済み/未走破で絞り込み
- **データ保存**: ブラウザのLocalStorageで自動保存
- **エクスポート/インポート**: JSONファイルでデータのバックアップ・復元
- **PWA対応**: ホーム画面に追加してアプリとして使用可能
- **オフライン対応**: Service Workerでオフライン時も利用可能

## 🗺️ 収録国道

現在 **35路線以上**の主要国道を収録しています:
- 国道1号（東京〜大阪）
- 国道2号（大阪〜北九州）
- 国道4号（東京〜青森）
- 国道16号（東京環状）
- 国道246号（東京〜沼津）
- その他多数

## 🚀 使い方

### オンラインで使用
GitHub Pagesのリンクにアクセスするだけで使えます。

### ローカルで実行
```bash
# リポジトリをクローン
git clone https://github.com/あなたのユーザー名/japan-road-tracker.git
cd japan-road-tracker

# 静的ファイルサーバーで起動（例: Python）
python3 -m http.server 8080

# ブラウザで開く
open http://localhost:8080
```

### ホーム画面に追加（PWA）
1. スマートフォンのブラウザでサイトを開く
2. ブラウザメニューから「ホーム画面に追加」を選択
3. アプリとしてインストール完了！

## 📖 操作方法

| 操作 | 説明 |
|------|------|
| 地図上の国道をクリック | 国道を選択（オレンジ色にハイライト） |
| 詳細カードの「走破済みにする」 | 走破記録（赤色に変わる） |
| リストの ○ ボタン | 走破済みのトグル |
| 💾 ボタン | データをJSONでエクスポート |
| 📂 ボタン | JSONデータをインポート |
| 🗑️ ボタン | 全記録をリセット |

## 🔧 技術スタック

- **地図**: [Leaflet.js](https://leafletjs.com/) + OpenStreetMap
- **データ保存**: LocalStorage
- **PWA**: Service Worker + Web App Manifest
- **ホスティング**: GitHub Pages
- **CI/CD**: GitHub Actions

## 📂 プロジェクト構成

```
japan-road-tracker/
├── index.html          # メインHTML
├── manifest.json       # PWAマニフェスト
├── sw.js               # Service Worker
├── js/
│   ├── app.js          # アプリロジック
│   └── roads-data.js   # 国道データ
├── icons/
│   ├── icon-192.png    # PWAアイコン (192px)
│   └── icon-512.png    # PWAアイコン (512px)
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions
```

## 🤝 コントリビュート

国道データの追加・修正など、PRは歓迎です！

### 国道データの形式
```javascript
{
  id: 番号,
  number: 国道番号,
  name: "国道XX号",
  start: "起点（住所）",
  end: "終点（住所）",
  length: 延長距離（km）,
  coords: [[緯度, 経度], ...] // 経路の座標配列
}
```

## 📄 ライセンス

MIT License

地図データ: © [OpenStreetMap](https://www.openstreetmap.org/) contributors
