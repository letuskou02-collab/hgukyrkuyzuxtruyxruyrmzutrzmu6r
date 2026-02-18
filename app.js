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
            stickers: [],
            currentTab: 'add',
            searchQuery: '',
            selectedMapMarker: null,
            map: null,
            markers: [],
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
                    const marker = L.circleMarker([sticker.latitude, sticker.longitude], {
                        radius: 8,
                        fillColor: '#4fa861',
                        color: '#2d7a3e',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
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
    }
}).mount('#app');
