const { createApp } = Vue;

// IndexedDB 初期化
class StickerDB {
    constructor() {
        this.dbName = 'StickerAppDB';
        this.storeName = 'stickers';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('roadNumber', 'roadNumber', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    async add(sticker) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(sticker);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result.sort((a, b) => new Date(b.date) - new Date(a.date)));
        });
    }

    async delete(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

const db = new StickerDB();

// Vue アプリケーション
createApp({
    data() {
        return {
            initialized: false,
            stickers: [],
            currentTab: 'add',
            searchQuery: '',
            selectedMapMarker: null,
            map: null,
            markers: [],
            geocoding: false,
            geocodingError: '',
            form: {
                roadNumber: '',
                date: new Date().toISOString().split('T')[0],
                location: '',
                latitude: null,
                longitude: null,
                image: null,
                memo: ''
            }
        };
    },

    computed: {
        filteredStickers() {
            if (!this.searchQuery) return this.stickers;
            return this.stickers.filter(s => 
                s.roadNumber.toString().includes(this.searchQuery)
            );
        }
    },

    methods: {
        async addSticker() {
            const sticker = {
                id: Date.now(),
                roadNumber: parseInt(this.form.roadNumber),
                date: this.form.date,
                location: this.form.location,
                latitude: this.form.latitude,
                longitude: this.form.longitude,
                image: this.form.image,
                memo: this.form.memo
            };

            await db.add(sticker);
            this.stickers.push(sticker);

            // フォームをリセット
            this.form = {
                roadNumber: '',
                date: new Date().toISOString().split('T')[0],
                location: '',
                latitude: null,
                longitude: null,
                image: null,
                memo: ''
            };

            alert('ステッカーを記録しました！');
        },

        startApp() {
            console.log('startApp called');
            this.initialized = true;
            localStorage.setItem('appInitialized', 'true');
            console.log('initialized set to:', this.initialized);
        },

        async deleteSticker(id) {
            if (confirm('このステッカーを削除しますか？')) {
                await db.delete(id);
                this.stickers = this.stickers.filter(s => s.id !== id);
            }
        },

        handleImageUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.form.image = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        },

        formatDate(dateStr) {
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        },

        goToMap(sticker) {
            this.selectedMapMarker = sticker;
            this.currentTab = 'map';
            this.$nextTick(() => {
                this.initMap();
            });
        },

        initMap() {
            if (this.map) {
                this.map.remove();
            }

            // デフォルト位置（日本の中心）
            const defaultCenter = [36.5, 138.2];
            const center = this.selectedMapMarker && this.selectedMapMarker.latitude && this.selectedMapMarker.longitude
                ? [this.selectedMapMarker.latitude, this.selectedMapMarker.longitude]
                : defaultCenter;

            this.map = L.map('map').setView(center, 10);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // すべてのマーカーを表示
            this.markers = [];
            this.stickers.forEach(sticker => {
                if (sticker.latitude && sticker.longitude) {
                    // 国道番号をテキストとして表示するマーカーを作成
                    const markerIcon = L.divIcon({
                        html: `<div class="road-number-marker">${sticker.roadNumber}</div>`,
                        iconSize: [50, 50],
                        iconAnchor: [25, 25],
                        popupAnchor: [0, -25],
                        className: 'custom-marker'
                    });

                    const marker = L.marker([sticker.latitude, sticker.longitude], {
                        icon: markerIcon
                    }).addTo(this.map);

                    marker.bindPopup(`<strong>国道 ${sticker.roadNumber} 号</strong><br>${this.formatDate(sticker.date)}${sticker.location ? '<br>' + sticker.location : ''}`);

                    this.markers.push(marker);
                }
            });

            // 選択されたマーカーをハイライト
            if (this.selectedMapMarker && this.selectedMapMarker.latitude && this.selectedMapMarker.longitude) {
                const highlightMarker = L.circleMarker(
                    [this.selectedMapMarker.latitude, this.selectedMapMarker.longitude],
                    {
                        radius: 12,
                        fillColor: '#ff9800',
                        color: '#e65100',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0.9
                    }
                ).addTo(this.map);

                highlightMarker.bindPopup(`<strong>国道 ${this.selectedMapMarker.roadNumber} 号</strong><br>${this.formatDate(this.selectedMapMarker.date)}`).openPopup();
            }
        },

        updateMapView() {
            if (this.map && this.stickers.length > 0) {
                const validStickers = this.stickers.filter(s => s.latitude && s.longitude);
                if (validStickers.length > 0) {
                    const group = new L.featureGroup(
                        validStickers.map(s => L.latLng(s.latitude, s.longitude))
                    );
                    this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
                }
            }
        },

        async geocodeLocation() {
            if (!this.form.location) {
                this.geocodingError = '施設名を入力してください';
                return;
            }

            this.geocoding = true;
            this.geocodingError = '';

            try {
                // 複数の検索方法を試みる
                let results = [];
                
                // 1. 日本限定で施設名検索
                const response1 = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.form.location)}&countrycodes=jp&limit=5`
                );
                results = await response1.json();

                // 2. 結果がない場合は、より広い検索を試みる
                if (results.length === 0) {
                    const response2 = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.form.location + ' Japan')}&limit=5`
                    );
                    results = await response2.json();
                }

                if (results.length > 0) {
                    // 最初の結果を使用
                    this.form.latitude = parseFloat(results[0].lat);
                    this.form.longitude = parseFloat(results[0].lon);
                    this.geocodingError = '';
                } else {
                    this.geocodingError = `「${this.form.location}」が見つかりません。駅名、施設名、建物名で検索してください。`;
                }
            } catch (error) {
                this.geocodingError = '座標の取得に失敗しました。ネットワークを確認してください。';
            } finally {
                this.geocoding = false;
            }
        },

        exportData() {
            const data = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                stickers: this.stickers
            };

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `sticker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert('エクスポート完了しました！');
        },

        async importData(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.stickers || !Array.isArray(data.stickers)) {
                        alert('無効なバックアップファイルです');
                        return;
                    }

                    const confirmImport = confirm(
                        `${data.stickers.length} 件のステッカーをインポートします。既存データは上書きされます。よろしいですか？`
                    );

                    if (confirmImport) {
                        // 既存データを削除
                        for (const sticker of this.stickers) {
                            await db.delete(sticker.id);
                        }

                        // 新しいデータを追加
                        for (const sticker of data.stickers) {
                            await db.add(sticker);
                        }

                        // UI を更新
                        this.stickers = await db.getAll();
                        alert('インポート完了しました！');
                    }
                } catch (error) {
                    alert('ファイル読み込みエラー: ' + error.message);
                }
            };
            reader.readAsText(file);

            // input をリセット
            event.target.value = '';
        },

        showInstallPrompt() {
            alert('iOS: Safari の共有ボタンをタップして「ホーム画面に追加」を選択してください\n\nAndroid: ブラウザメニューから「アプリをインストール」を選択してください');
        }
    },

    watch: {
        currentTab(newTab) {
            if (newTab === 'map') {
                this.$nextTick(() => {
                    this.initMap();
                });
            }
        }
    },

    async mounted() {
        // Service Worker の登録
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }

        // IndexedDB の初期化
        await db.init();
        this.stickers = await db.getAll();

        // 本日の日付をセット
        this.form.date = new Date().toISOString().split('T')[0];

        // ウェルカムスクリーンの表示判定
        const appInitialized = localStorage.getItem('appInitialized');
        if (appInitialized) {
            this.initialized = true;
        }
    }
}).mount('#app');
