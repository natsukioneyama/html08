// === Overview with Justified Gallery + group head caption on hover ===
(function(){
  const $grid = $('#overviewGrid');

  // Initialize Justified Gallery
  document.addEventListener('DOMContentLoaded', () => {
    $grid.justifiedGallery({
      rowHeight: 120,
      margins: 60,
      lastRow: 'nojustify',
      captions: false,
      cssAnimation: true,
      imagesAnimationDuration: 200
    })
    .on('jg.complete', () => {
      markGroupHeads(); // ensure captions exist after JG has sized items
       
      // Group hover (desktop)
      $grid.on('mouseenter', 'a.jg-entry', function(){
        const g = this.dataset.group || '';
        if (!g) return;
        $grid.addClass('is-group-hover');
        $grid.find('a.jg-entry').each(function(){
          this.classList.toggle('is-in-group', (this.dataset.group || '') === g);
        });
      });
      $grid.on('mouseleave', function(){
        $grid.removeClass('is-group-hover');
        $grid.find('a.jg-entry').removeClass('is-in-group');
      });
    });

    // ====== Reset hover state when leaving grid or empty area ======
    function clearGroupState($grid){
      $grid.removeClass('is-group-hover');
      $grid.find('a.jg-entry').removeClass('is-in-group');
    }

    // グリッド外にマウスが出た時
    $grid.on('mouseleave', function(){
     clearGroupState($grid);
    });

    // グリッド内を動いていて画像上にいない時（空白部分）
    $grid.on('mousemove', function(e){
     if (!$(e.target).closest('a.jg-entry').length) {
    clearGroupState($grid);
    }
  });

    // タッチデバイスでも指を離したらリセット
   $grid.on('touchend', function(){
    clearGroupState($grid);
  });

  
    // Click -> open viewer
    $grid.on('click', 'a.jg-entry', (ev) => {
      ev.preventDefault();
      const $items = $grid.find('a.jg-entry');
      const idx = $items.index(ev.currentTarget);
      openViewer($items, idx);
    });
  });

  // Add data-head="1" to the first item of each group and inject caption node
  function markGroupHeads(){
    const seen = new Map();
    $grid.find('a.jg-entry').each(function(){
      const g = this.dataset.group || '__nogroup__';
      if (seen.has(g)) return;
      seen.set(g, true);
      this.setAttribute('data-head', '1');

      // Create caption
      const cap = document.createElement('span');
      cap.className = 'ov-cap';
      const title = this.dataset.title || '';
      const l1 = this.dataset.line1 || '';
      const l2 = this.dataset.line2 || '';
      cap.innerHTML = `${title ? `<b>${title}</b>` : ''}${l1 ? `<em>${l1}</em>` : ''}${l2 ? `<em>${l2}</em>` : ''}`;
      this.appendChild(cap);
    });
  }




  // === Custom viewer ===
  const modal = document.getElementById('galleryModal');
  const imgEl = document.getElementById('gmImage');
  const ttlEl = document.getElementById('gmTitle');
  const l1El  = document.getElementById('gmLine1');
  const l2El  = document.getElementById('gmLine2');
  const ctrEl = document.getElementById('gmCounter');

  let items = [];
  let index = 0;

  function updateCounter(){ ctrEl.textContent = `${index+1}/${items.length}`; }
  const preloaded = new Set();
  
  function preload(i) {
  if (i < 0 || i >= items.length) return;
  const href = items[i].getAttribute('href');
  if (!href || preloaded.has(href)) return;
  preloaded.add(href);
  const img = new Image();
  img.src = href;
 }

  function show(i){
    index = (i + items.length) % items.length;
    const a = items[index];
    imgEl.classList.remove('ready');
    const nextSrc = a.getAttribute('href');
    if (imgEl.src === nextSrc && imgEl.complete) { imgEl.classList.add('ready'); }
    imgEl.onload = () => { imgEl.classList.add('ready'); };
    imgEl.src = nextSrc;
    ttlEl.textContent = a.dataset.title || '';
    l1El.textContent  = a.dataset.line1 || '';
    l2El.textContent  = a.dataset.line2 || '';
    updateCounter();
    preload(index+1);
    preload(index-1);
  }
  function openViewer(nodeList, start){
    items = Array.from(nodeList);
    index = start || 0;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    show(index);
    bindKeys(true);
  }
  function closeViewer(){
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    bindKeys(false);
  }
  // Navigation guard to avoid double-firing (e.g. multiple touch handlers or programmatic clicks)
  let navLocked = false;
  const NAV_LOCK_MS = 300; // ms
  function _doNav(fn) {
    if (navLocked) return;
    navLocked = true;
    try { fn(); } finally {
      setTimeout(() => { navLocked = false; }, NAV_LOCK_MS);
    }
  }
  function next(){ _doNav(() => show(index+1)); }
  function prev(){ _doNav(() => show(index-1)); }

  modal.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-close]')) closeViewer();
    if (t.matches('[data-next]')) next();
    if (t.matches('[data-prev]')) prev();
  });

  function onKey(e){
    if (modal.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  }
  function bindKeys(enable){
    window[enable ? 'addEventListener' : 'removeEventListener']('keydown', onKey);
  }

  // Basic swipe
  let touchX = 0, touchY = 0, dx = 0, dy = 0, swiping = false;
  modal.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchX = t.clientX; touchY = t.clientY;
    dx = 0; dy = 0; swiping = true;
  }, { passive: true });
  modal.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    const t = e.touches[0];
    dx = t.clientX - touchX;
    dy = t.clientY - touchY;
  }, { passive: true });
  modal.addEventListener('touchend', () => {
    if (!swiping) return;
    swiping = false;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  });
})();
/* ==== PC用 横ドラッグ（マウス） ==== */
(() => {
  const modal = document.getElementById('galleryModal');
  if (!modal) return;

  let isDown = false;
  let startX = 0;
  let dx = 0;
  let dragged = false;
  const THRESHOLD = 60;   // これ以上でスワイプ成立
  const SLOP = 8;         // これ以上で「ドラッグ中」扱い

  modal.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;      // 左クリックのみ
    isDown = true;
    dragged = false;
    startX = e.clientX;
    dx = 0;
    document.body.classList.add('gm-dragging');
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    dx = e.clientX - startX;
    if (Math.abs(dx) > SLOP) dragged = true;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    document.body.classList.remove('gm-dragging');

    if (Math.abs(dx) >= THRESHOLD) {
      if (dx < 0) {
        document.querySelector('.gm-next')?.click(); // → 次へ
      } else {
        document.querySelector('.gm-prev')?.click(); // ← 前へ
      }
    }
  });

  // ドラッグ直後の誤クリック抑止（必要最小限）
  modal.addEventListener('click', (e) => {
    if (dragged) {
      e.stopPropagation();
      e.preventDefault();
      dragged = false;
    }
  }, true);
})();

/* ==== MacBook トラックパッド（2本指スワイプ）堅めしきい値 ==== */
(() => {
  const modal = document.getElementById('galleryModal');
  if (!modal) return;

  // 誤発火を抑えるための状態管理
  let accX = 0;
  let lastTs = 0;
  let locked = false;
  let dragging = false;

  const COOLDOWN = 500;   // 連発防止
  const WINDOW   = 180;   // この時間内の累積のみ有効（ms）
  const STEP_MIN = 22;    // 微小スクロールを無視（1イベントの最小値）
  const RATIO    = 1.4;   // 横優勢判定（|dx| が |dy| の何倍以上か）
  const TARGET   = 140;   // 累積しきい値（ここを超えたら発火）

  // 既存のドラッグ実装がある場合はドラッグ中は wheel を無視
  modal.addEventListener('mousedown', (e) => { if (e.button === 0) dragging = true; }, {passive:true});
  window.addEventListener('mouseup',   ()  => { dragging = false; }, {passive:true});
  modal.addEventListener('touchstart', ()  => { dragging = true; }, {passive:true});
  modal.addEventListener('touchend',   ()  => { dragging = false; }, {passive:true});

  function onWheel(e) {
    if (modal.getAttribute('aria-hidden') === 'true') return;
    if (locked || dragging) return;

    // 横優勢でなければ無視
    const dx = e.deltaX;
    const dy = e.deltaY;
    if (Math.abs(dx) < Math.abs(dy) * RATIO) return;

    // 微小値は無視（トラックパッドの揺れ対策）
    if (Math.abs(dx) < STEP_MIN) return;

    const now = performance.now();
    // 一定時間空いたら累積をリセット
    if (now - lastTs > WINDOW) accX = 0;

    accX += dx;
    lastTs = now;

    if (Math.abs(accX) >= TARGET) {
      locked = true;
      if (accX > 0) {
        document.querySelector('.gm-next')?.click(); // 右へ → 次
      } else {
        document.querySelector('.gm-prev')?.click(); // 左へ → 前
      }
      accX = 0;
      setTimeout(() => { locked = false; }, COOLDOWN);
      e.preventDefault(); // ページの戻る/進む等を抑止
    }
  }

  modal.addEventListener('wheel', onWheel, { passive: false });
})();





// === Mobile: 1st tap -> show group caption on head + dim group, 2nd tap -> open viewer ===
(function () {
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!isTouch) return;

  const grid = document.getElementById('overviewGrid');
  if (!grid) return;

  function getGroupId(el) {
    return el.getAttribute('data-group') || el.getAttribute('data-g') || '';
  }

  function getGroupItems(groupId) {
    if (!groupId) return [];
    return Array.from(
      grid.querySelectorAll(
        `a.jg-entry[data-group="${groupId}"], a.jg-entry[data-g="${groupId}"]`
      )
    );
  }

  // グループごとの先頭サムネ (data-head="1" があればそれ、なければ最初の1枚)
  function getHeadForGroup(groupId) {
    if (!groupId) return null;
    const withHead = grid.querySelector(
      `a.jg-entry[data-group="${groupId}"][data-head="1"], ` +
      `a.jg-entry[data-g="${groupId}"][data-head="1"]`
    );
    if (withHead) return withHead;

    const items = getGroupItems(groupId);
    return items[0] || null;
  }

  function ensureCaption(el) {
    let cap = el.querySelector('.ov-cap');
    if (!cap) {
      const t  = el.getAttribute('data-title') || '';
      const l1 = el.getAttribute('data-line1') || '';
      const l2 = el.getAttribute('data-line2') || '';
      if (!t && !l1 && !l2) return null;

      cap = document.createElement('span');
      cap.className = 'ov-cap';
      cap.innerHTML = [
        t  ? `<b>${t}</b>`   : '',
        l1 ? `<em>${l1}</em>`: '',
        l2 ? `<i>${l2}</i>`  : ''
      ].filter(Boolean).join('');
      el.appendChild(cap);
    }
    return cap;
  }

  function clearHighlight() {
    grid.classList.remove('is-group-tap');
    grid.querySelectorAll('a.jg-entry.is-in-group').forEach(el => el.classList.remove('is-in-group'));
    grid.querySelectorAll('a.jg-entry.tap-armed').forEach(el => el.removeAttribute('data-tap-head'));
    grid.querySelectorAll('a.jg-entry.tap-armed').forEach(el => el.classList.remove('tap-armed'));
  }

  let activeGroup = '';
  let headEl = null;

  grid.addEventListener('click', function (ev) {
    const item = ev.target.closest('a.jg-entry');
    if (!item) return;

    const groupId = getGroupId(item);
    if (!groupId) return; // グループ外のサムネはそのまま既存処理へ

    const head = getHeadForGroup(groupId);
    if (!head) return;

    // 2回目タップ: すでにこのグループがアクティブで、ヘッドが armed → 既存クリックを通して開く
    if (
      grid.classList.contains('is-group-tap') &&
      activeGroup === groupId &&
      headEl === head &&
      head.classList.contains('tap-armed')
    ) {
      clearHighlight(); // 見た目だけ戻す
      return;           // stopせずそのまま → 元の click ハンドラが発火してギャラリー表示
    }

    // 1回目 or グループ切替: ハイライト表示してクリックを止める
    ev.preventDefault();
    ev.stopPropagation();

    clearHighlight();
    activeGroup = groupId;
    headEl = head;

    const items = getGroupItems(groupId);
    if (!items.length) return;

    // グループ全体をマーク
    grid.classList.add('is-group-tap');
    items.forEach(el => el.classList.add('is-in-group'));

    // ヘッドにだけキャプション＆tap-armed
    const cap = ensureCaption(headEl);
    if (cap) {
      headEl.classList.add('tap-armed');
      headEl.setAttribute('data-tap-head', '1');
    }

    // しばらく何もしなかったら自動解除
    clearTimeout(headEl._tapTimer);
    headEl._tapTimer = setTimeout(() => {
      if (headEl && headEl.classList.contains('tap-armed')) {
        clearHighlight();
        activeGroup = '';
        headEl = null;
      }
    }, 1500);
  }, true);

  // グリッドの外をタップしたら解除
  document.addEventListener('click', (ev) => {
    if (!grid.contains(ev.target)) {
      clearHighlight();
      activeGroup = '';
      headEl = null;
    }
  }, true);
})();