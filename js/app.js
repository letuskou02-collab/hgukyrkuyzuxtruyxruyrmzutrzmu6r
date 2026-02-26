/**
 * 国道走行記録アプリ - メインスクリプト
 */

// ============================
// 定数・設定
// ============================
const STORAGE_KEY = 'japan-road-tracker-v1';
const MAP_DEFAULT_CENTER = [36.5, 136.0];
const MAP_DEFAULT_ZOOM = 5;
const COLOR_DONE = '#e53935';
const COLOR_UNDONE = '#3949ab';
const COLOR_HOVER = '#ff8f00';
const WEIGHT_NORMAL = 3;
const WEIGHT_SELECTED = 5;

// ============================
// 状態管理
// ============================
let map = null;
let roadLayers = {};       // { roadNumber: L.polyline }
let completedRoads = new Set(); // 走破済み国道番号のセット
let currentFilter = 'all';
let selectedRoadNumber = null;
let allRoadsSorted = [];

// ============================
// 初期化
// ============================
document.addEventListener('DOMContentLoaded', async () => {
  loadStoredData();
  initMap();
  await loadRoads();
  renderRoadList();
  updateStats();
  hideLoading();
});

function loadStoredData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      completedRoads = new Set(data.completedRoads || []);
    }
  } catch (e) {
    console.warn('データ読み込みエラー:', e);
    completedRoads = new Set();
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completedRoads: [...completedRoads],
      lastUpdated: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('データ保存エラー:', e);
  }
}

// ============================
// 地図初期化
// ============================
function initMap() {
  map = L.map('map', {
    center: MAP_DEFAULT_CENTER,
    zoom: MAP_DEFAULT_ZOOM,
    zoomControl: true
  });

  // OpenStreetMapタイル
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map);

  // 地図クリックで選択解除
  map.on('click', () => {
    deselectRoad();
  });
}

// ============================
// 国道レイヤーの描画
// ============================
async function loadRoads() {
  // ROADS_DATAを番号順にソート
  allRoadsSorted = [...ROADS_DATA].sort((a, b) => a.number - b.number);

  for (const road of allRoadsSorted) {
    addRoadToMap(road);
  }
}

function addRoadToMap(road) {
  const isDone = completedRoads.has(road.number);
  const latlngs = road.coords.map(c => [c[0], c[1]]);

  const polyline = L.polyline(latlngs, {
    color: isDone ? COLOR_DONE : COLOR_UNDONE,
    weight: WEIGHT_NORMAL,
    opacity: isDone ? 0.9 : 0.6,
    smoothFactor: 1
  });

  // ツールチップ
  polyline.bindTooltip(`国道${road.number}号`, {
    permanent: false,
    direction: 'top',
    className: 'road-tooltip'
  });

  // クリックイベント
  polyline.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    selectRoad(road.number);
  });

  // ホバーイベント
  polyline.on('mouseover', () => {
    if (selectedRoadNumber !== road.number) {
      polyline.setStyle({ color: COLOR_HOVER, weight: WEIGHT_SELECTED });
    }
  });

  polyline.on('mouseout', () => {
    if (selectedRoadNumber !== road.number) {
      polyline.setStyle({
        color: completedRoads.has(road.number) ? COLOR_DONE : COLOR_UNDONE,
        weight: WEIGHT_NORMAL
      });
    }
  });

  polyline.addTo(map);
  roadLayers[road.number] = polyline;
}

// ============================
// 国道の選択・状態変更
// ============================
function selectRoad(roadNumber) {
  // 前の選択を解除
  if (selectedRoadNumber !== null && roadLayers[selectedRoadNumber]) {
    const prev = roadLayers[selectedRoadNumber];
    const prevDone = completedRoads.has(selectedRoadNumber);
    prev.setStyle({
      color: prevDone ? COLOR_DONE : COLOR_UNDONE,
      weight: WEIGHT_NORMAL,
      opacity: prevDone ? 0.9 : 0.6
    });
  }

  selectedRoadNumber = roadNumber;
  const road = ROADS_MAP[roadNumber];
  const polyline = roadLayers[roadNumber];

  if (polyline) {
    polyline.setStyle({ color: COLOR_HOVER, weight: WEIGHT_SELECTED, opacity: 1 });
  }

  // 詳細カードを表示
  showDetailCard(road);

  // リストのハイライト
  highlightListItem(roadNumber);
}

function deselectRoad() {
  if (selectedRoadNumber !== null && roadLayers[selectedRoadNumber]) {
    const isDone = completedRoads.has(selectedRoadNumber);
    roadLayers[selectedRoadNumber].setStyle({
      color: isDone ? COLOR_DONE : COLOR_UNDONE,
      weight: WEIGHT_NORMAL,
      opacity: isDone ? 0.9 : 0.6
    });
  }
  selectedRoadNumber = null;
  closeDetailCard();
  document.querySelectorAll('.road-item.selected').forEach(el => el.classList.remove('selected'));
}

function toggleRoad(roadNumber) {
  const wasDone = completedRoads.has(roadNumber);

  if (wasDone) {
    completedRoads.delete(roadNumber);
    showToast(`国道${roadNumber}号 の走破記録を解除しました`);
  } else {
    completedRoads.add(roadNumber);
    showToast(`🎉 国道${roadNumber}号 を走破済みにしました！`);
  }

  // レイヤーのスタイル更新
  const polyline = roadLayers[roadNumber];
  if (polyline) {
    const isDone = completedRoads.has(roadNumber);
    polyline.setStyle({
      color: isDone ? COLOR_DONE : COLOR_UNDONE,
      weight: selectedRoadNumber === roadNumber ? WEIGHT_SELECTED : WEIGHT_NORMAL,
      opacity: isDone ? 0.9 : 0.6
    });
  }

  saveData();
  renderRoadList();
  updateStats();

  // 詳細カードのボタンテキスト更新
  if (selectedRoadNumber === roadNumber) {
    updateDetailCardButton(roadNumber);
  }
}

// ============================
// 詳細カード
// ============================
function showDetailCard(road) {
  const card = document.getElementById('roadDetailCard');
  const title = document.getElementById('detailTitle');
  const info = document.getElementById('detailInfo');
  const btn = card.querySelector('.btn-danger');

  title.textContent = `国道${road.number}号`;
  info.textContent = `${road.start} ～ ${road.end}｜延長 ${road.length}km`;

  const isDone = completedRoads.has(road.number);
  btn.textContent = isDone ? '✅ 走破済み（クリックで解除）' : '🚗 走破済みにする';
  btn.style.background = isDone ? '#757575' : '';

  card.classList.add('show');
}

function updateDetailCardButton(roadNumber) {
  const card = document.getElementById('roadDetailCard');
  const btn = card.querySelector('.btn-danger');
  const isDone = completedRoads.has(roadNumber);
  btn.textContent = isDone ? '✅ 走破済み（クリックで解除）' : '🚗 走破済みにする';
  btn.style.background = isDone ? '#757575' : '';
}

function closeDetailCard() {
  document.getElementById('roadDetailCard').classList.remove('show');
}

function toggleRoadFromCard() {
  if (selectedRoadNumber !== null) {
    toggleRoad(selectedRoadNumber);
  }
}

// ============================
// 国道リスト表示
// ============================
function renderRoadList() {
  const container = document.getElementById('roadList');
  const searchVal = document.getElementById('searchInput').value.trim().toLowerCase();

  let filtered = allRoadsSorted.filter(road => {
    const matchSearch = searchVal === '' ||
      road.number.toString().includes(searchVal) ||
      road.name.includes(searchVal);

    const isDone = completedRoads.has(road.number);
    const matchFilter =
      currentFilter === 'all' ||
      (currentFilter === 'done' && isDone) ||
      (currentFilter === 'undone' && !isDone);

    return matchSearch && matchFilter;
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:#9e9e9e;font-size:0.9rem;">該当する国道がありません</div>';
    return;
  }

  filtered.forEach(road => {
    const isDone = completedRoads.has(road.number);
    const item = document.createElement('div');
    item.className = `road-item${isDone ? ' completed' : ''}${selectedRoadNumber === road.number ? ' selected' : ''}`;
    item.dataset.number = road.number;
    item.style.cssText = selectedRoadNumber === road.number ? 'background:#fff3e0;' : '';

    item.innerHTML = `
      <div class="road-badge ${isDone ? 'done' : ''}">
        <span style="font-size:0.55rem">国道</span>
        <span class="number">${road.number}</span>
        <span style="font-size:0.55rem">号</span>
      </div>
      <div class="road-info">
        <div class="road-name">${road.name}</div>
        <div class="road-meta">${road.start.split('県')[0] || road.start.split('都')[0] || ''}〜 ${road.end.split('県')[0] || road.end.split('都')[0] || ''} | ${road.length}km</div>
      </div>
      <div class="road-check ${isDone ? 'done' : ''}" onclick="event.stopPropagation(); toggleRoad(${road.number})">
        ${isDone ? '✓' : ''}
      </div>
    `;

    item.addEventListener('click', () => {
      // 地図を該当国道にズーム
      const polyline = roadLayers[road.number];
      if (polyline) {
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
      selectRoad(road.number);
      // モバイルではパネルを閉じる
      if (window.innerWidth <= 768) {
        togglePanel(false);
      }
    });

    container.appendChild(item);
  });
}

function highlightListItem(roadNumber) {
  document.querySelectorAll('.road-item').forEach(el => {
    el.classList.remove('selected');
    el.style.background = '';
    if (parseInt(el.dataset.number) === roadNumber) {
      el.classList.add('selected');
      el.style.background = '#fff3e0';
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

// ============================
// フィルター・検索
// ============================
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderRoadList();
}

function filterRoads() {
  renderRoadList();
}

// ============================
// 統計更新
// ============================
function updateStats() {
  const total = allRoadsSorted.length;
  const done = completedRoads.size;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statPercent').textContent = percent + '%';
  document.getElementById('progressBar').style.width = percent + '%';
}

// ============================
// モバイル用パネルトグル
// ============================
function togglePanel(forceShow) {
  const panel = document.getElementById('sidePanel');
  if (forceShow === true) {
    panel.classList.add('show');
  } else if (forceShow === false) {
    panel.classList.remove('show');
  } else {
    panel.classList.toggle('show');
  }
}

// ============================
// データエクスポート
// ============================
function exportData() {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    completedRoads: [...completedRoads].sort((a, b) => a - b),
    summary: {
      total: allRoadsSorted.length,
      completed: completedRoads.size
    }
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kokudo-record-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 データをエクスポートしました');
}

// ============================
// データインポート
// ============================
function importData() {
  document.getElementById('fileInput').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.completedRoads && Array.isArray(data.completedRoads)) {
        completedRoads = new Set(data.completedRoads);
        saveData();
        // 全レイヤーのスタイルを更新
        allRoadsSorted.forEach(road => {
          const polyline = roadLayers[road.number];
          if (polyline) {
            const isDone = completedRoads.has(road.number);
            polyline.setStyle({
              color: isDone ? COLOR_DONE : COLOR_UNDONE,
              opacity: isDone ? 0.9 : 0.6
            });
          }
        });
        renderRoadList();
        updateStats();
        showToast('📂 データをインポートしました');
      } else {
        showToast('⚠️ 無効なファイル形式です');
      }
    } catch (err) {
      showToast('⚠️ ファイルの読み込みに失敗しました');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ============================
// リセット
// ============================
function resetConfirm() {
  document.getElementById('resetModal').classList.add('show');
}

function closeModal() {
  document.getElementById('resetModal').classList.remove('show');
}

function resetData() {
  completedRoads.clear();
  saveData();

  // 全レイヤーのスタイルをリセット
  allRoadsSorted.forEach(road => {
    const polyline = roadLayers[road.number];
    if (polyline) {
      polyline.setStyle({ color: COLOR_UNDONE, opacity: 0.6, weight: WEIGHT_NORMAL });
    }
  });

  renderRoadList();
  updateStats();
  closeModal();
  showToast('🗑️ データをリセットしました');
}

// ============================
// ローディング
// ============================
function hideLoading() {
  setTimeout(() => {
    document.getElementById('loadingOverlay').classList.add('hidden');
  }, 500);
}

// ============================
// トースト通知
// ============================
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================
// モーダルの外側クリックで閉じる
// ============================
document.getElementById('resetModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
