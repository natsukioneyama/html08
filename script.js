/* =========================================
   script.js — stable full version (click fix)
   - 自前 Lightbox (#gallery-modal)
   - Overview modal (#overviewModal)
   - Simple viewer (#simple-viewer)
   - Draggable .icon with click suppression
   ========================================= */
// ==== Instagramアプリ内ブラウザ検出 → デフォルトブラウザで開き直し ====
(function() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  // Instagramアプリ内ブラウザを検出
  const isInstagram = /Instagram/i.test(ua);

  if (isInstagram) {
    // 現在のURLをそのまま外部ブラウザで開く
    const current = window.location.href;

    // iPhone / iPad → Safariで開く
    if (/iPhone|iPad|iPod/i.test(ua)) {
      window.location = 'x-web-search://?' + encodeURIComponent(current);
    }

    // Android → Chromeなどで開く
    else if (/Android/i.test(ua)) {
      window.location = 'intent://' + current.replace(/^https?:\/\//, '') +
                        '#Intent;scheme=https;package=com.android.chrome;end';
    }
  }
})();

(() => {

  // ---------- Utility ----------
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function parseImages(str) {
    return (str || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(pair => {
        const [src, cap] = pair.split("|").map(t => (t || "").trim());
        return { src, cap };
      })
      .filter(it => it.src);
  }

  // ==========================================================
  //  Overview Modal
  // ==========================================================
  (() => {
    const modal = document.getElementById("overviewModal");
    if (!modal) return;
    const panel = $(".modal__panel", modal);
    const btnClose = $("[data-close]", modal);

      // === Overview内の画像クリックを無効化 ===
  const overview = modal.querySelector('#overview');
  if (overview) {
    overview.addEventListener('click', (e) => {
      if (e.target.closest('a[href]')) {
        e.preventDefault();   // リンク動作を止める
        e.stopPropagation();  // Lightboxへの伝播も止める
      }
    });
  }


    document.addEventListener("click", (e) => {
      const btn = e.target.closest('.icon[data-type="overview"]');
      if (!btn) return;
      modal.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";
    });

    function closeOverview() {
      modal.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
    }

    if (btnClose) btnClose.addEventListener("click", closeOverview);
    modal.addEventListener("click", (e) => {
      if (!panel) return;
      if (!panel.contains(e.target)) closeOverview();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") closeOverview();
    });
  })();

  // ==== Simple Viewer (image | text) ====
// ==== Simple Viewer (image | text/html) ====
(() => {
  const sv = document.getElementById('simple-viewer');
  if (!sv) return;

  const img = sv.querySelector('.simple-viewer__img');
  const textBox = sv.querySelector('.simple-viewer__text');

   const openSimple = async (src) => {
  const lower = (src || '').toLowerCase();
  const isText = /\.(txt|log|md|html?)$/i.test(lower);

  img.hidden = false;
  textBox.hidden = true;

  if (isText) {
    try {
      const url = new URL(src, document.baseURI).href; // ← 絶対URLに
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();

      let html = raw;
      if (/<html/i.test(raw)) {
        const doc = new DOMParser().parseFromString(raw, 'text/html');
        html = doc.body ? doc.body.innerHTML : raw;
      }
      textBox.innerHTML = html;
      img.hidden = true;
      textBox.hidden = false;
    } catch (e) {
      textBox.textContent = 'Failed to load text.';
      img.hidden = true;
      textBox.hidden = false;
    }
  } else {
    img.src = src;
  }

  sv.classList.add('open');
  document.documentElement.style.overflow = 'hidden';
};

  const closeSimple = () => {
    sv.classList.remove('open');
    document.documentElement.style.overflow = '';
    img.src = '';
    if (textBox) textBox.textContent = '';
  };

// 1) クリックでテンプレから中身を流し込んで開く
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.icon[data-type="overview"]');
  if (!btn) return;

  const sel = btn.getAttribute('data-ov'); // 例: "#ov-skin"
  const src = sel ? document.querySelector(sel) : null;
  const modal = document.getElementById('overviewModal');
  const container = document.getElementById('overview');

  if (!src || !modal || !container) return;

  // 中身を差し替え（毎回クリーンに）
  container.innerHTML = '';
  // 子要素をクローンして投入
  Array.from(src.children).forEach(node => {
    container.appendChild(node.cloneNode(true));
  });

  // 縦ビューア用のクラス付与等が必要ならここで container に付与
  // container.classList.add('vertical-viewer');

  modal.setAttribute('aria-hidden', 'false');
});

// 2) 閉じるボタン・背景クリックで閉じる
document.addEventListener('click', (e) => {
  const modal = document.getElementById('overviewModal');
  if (!modal) return;

  const isCloseBtn = e.target.matches('[data-close]');
  const clickedBackdrop = e.target === modal; // モーダル直下(背景)をクリック

  if (isCloseBtn || clickedBackdrop) {
    modal.setAttribute('aria-hidden', 'true');
    const container = document.getElementById('overview');
    if (container) container.innerHTML = ''; // お好みで掃除
  }
});

// 3) ESCで閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('overviewModal');
    if (modal) modal.setAttribute('aria-hidden', 'true');
    const container = document.getElementById('overview');
    if (container) container.innerHTML = '';
  }
});

})();


// ==========================================================
//  Draggable icons (final alignment fix)
// ==========================================================
(() => {
  const DRAG_THRESHOLD = 3; // px
  const icons = document.querySelectorAll(".icon");
  if (!icons.length) return;

  // ドラッグ直後クリック抑止
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".icon");
    if (!btn) return;
    if (btn.__skipClickUntil && Date.now() < btn.__skipClickUntil) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  icons.forEach((btn) => {
    btn.style.touchAction = "none";
    btn.style.position = "absolute"; // 念のため明示
    btn.addEventListener("mousedown", onDown);
    btn.addEventListener("touchstart", onDown, { passive: true });

    function onDown(ev) {
      const isTouch = ev.type === "touchstart";
      const startX = isTouch ? ev.touches[0].clientX : ev.clientX;
      const startY = isTouch ? ev.touches[0].clientY : ev.clientY;

      // 要素の現在位置（ピクセル値を取得）
      const rect = btn.getBoundingClientRect();
      const parentRect = btn.offsetParent
        ? btn.offsetParent.getBoundingClientRect()
        : { left: 0, top: 0 };

      const startLeft = rect.left - parentRect.left;
      const startTop  = rect.top  - parentRect.top;

      let moved = false;

      function onMove(e2) {
        const x = e2.touches ? e2.touches[0].clientX : e2.clientX;
        const y = e2.touches ? e2.touches[0].clientY : e2.clientY;

        const dx = x - startX;
        const dy = y - startY;

        if (!moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
          moved = true;
        }
        if (moved) {
          btn.style.left = `${startLeft + dx}px`;
          btn.style.top  = `${startTop + dy}px`;
        }
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onUp);
        if (moved) btn.__skipClickUntil = Date.now() + 300;
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchmove", onMove, { passive: true });
      document.addEventListener("touchend", onUp);
    }
  });
})();



// === 初回オートレイアウト ===
document.addEventListener("click", (e) => {
// overview内クリックは無視
if (e.target.closest("#overviewModal")) return;
const btn = e.target.closest('.icon[data-action="link"]');
if (!btn) return;
const url = (btn.dataset.href || "").trim();
if (!url) return;
// _self なら同一タブ、それ以外は新規タブ
const target = btn.dataset.target === "_self" ? "_self" : "_blank";
window.open(url, target);
});



// ==== Lightbox ====
(() => {
  const modal = document.getElementById("gallery-modal");
  if (!modal) return;

  const frame = modal.querySelector(".gm-frame");
  const imgEl = modal.querySelector(".gm-image");
  const capEl = modal.querySelector(".gm-caption");
  const cntEl = modal.querySelector(".gm-counter");
  const btnClose = modal.querySelectorAll("[data-close]");


  let gallery = [];
  let index = 0;

  const parseImages = (str) => {
    if (!str) return [];
    return str.split(",").map(s => {
      const [src, cap] = s.split("|").map(v => v.trim());
      return { src, cap };
    }).filter(it => it.src);
  };

const update = () => {
  const item = gallery[index];
  imgEl.src = item.src;
  imgEl.alt = item.cap || "";
  if (capEl) capEl.textContent = item.cap || "";
  if (cntEl) cntEl.textContent = `${index + 1} / ${gallery.length}`;

  const preloadNext = () => {
    const nextItem = gallery[(index + 1) % gallery.length];
    if (!nextItem) return;
    const preload = new Image();
    preload.src = nextItem.src;
  };
  preloadNext(); // ← 呼ぶ
};

const open = (list, start=0) => {
  gallery = list.slice();
  index = start;
  imgEl.decoding = 'async';
  update();
  modal.classList.add('open');
  document.documentElement.style.overflow = 'hidden';
};

  const close = () => {
    modal.classList.remove("open");
    document.documentElement.style.overflow = "";
    imgEl.src = "";
  };

   // ここは既にあるやつ
  const next = () => { index = (index + 1) % gallery.length; update(); };
  const prev = () => { index = (index - 1 + gallery.length) % gallery.length; update(); };

  // ★ 追加：ボタンを取得してイベントを直結
  const btnPrev = modal.querySelector('.lb-nav--prev');
  const btnNext = modal.querySelector('.lb-nav--next');
  const btnCloseEls = modal.querySelectorAll('[data-close], .gm-close');

  if (btnPrev) btnPrev.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  if (btnNext) btnNext.addEventListener('click', (e) => { e.stopPropagation(); next(); });
  btnCloseEls.forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); close(); }));


  // アイコンクリックで開く
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('.icon[data-action="gallery"]');
    if (!btn) return;
    const list = parseImages(btn.dataset.images);
    open(list, 0);
  });

  // 閉じる（× / 背景）
  btnClose.forEach(el => el.addEventListener("click", close));

  // 余白クリック
  frame.addEventListener("click", (e) => { if (e.target === frame) close(); });

  // キーボード
  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });




  // === Desktop swipe / drag navigation (PC & touch共通) マウスドラッグ／タッチ版（===
(() => {
  const frame = modal.querySelector('.gm-frame');
  if (!frame) return;

  // 調整しやすい定数
  const SWIPE_MIN_PX = 50;   // これ以上の横移動でスワイプ成立
  const SWIPE_MAX_MS = 600;  // この時間以内なら軽快スワイプ扱い
  const ANGLE_GUARD = 0.5;   // 縦より横の比率が大きいときだけ横スワイプ扱い

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let startTime = 0;
  let moved = false;

  const onPointerDown = (e) => {
    // 左クリック / タッチのみ対象
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = lastX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();
    frame.setPointerCapture?.(e.pointerId);
    // 画像のドラッグ選択防止
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = Math.abs(e.clientY - startY);
    lastX = e.clientX;

    // 横意図でなければ何もしない（縦スクロール誤判定を防ぐ）
    if (Math.abs(dx) > 4) moved = true;
    // 必要なら画像の“ちらつき防止”に、軽いパララックスを入れてもOK
    // image.style.transform = `translateX(${dx * 0.08}px)`;
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;

    const totalDx = lastX - startX;
    const totalDy = Math.abs(e.clientY - startY);
    const dt = performance.now() - startTime;

    // 後始末
    frame.releasePointerCapture?.(e.pointerId);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // クリック（ほぼ動いていない）なら何もしないで終了
    if (!moved || Math.abs(totalDx) < 3) {
      // image.style.transform = '';
      return;
    }

    // 横方向優位かつ距離・時間を満たす場合にのみページ送り
    const horizontalEnough = Math.abs(totalDx) / Math.max(1, totalDy) > ANGLE_GUARD;
    const distanceEnough = Math.abs(totalDx) >= SWIPE_MIN_PX;
    const timeEnough = dt <= SWIPE_MAX_MS || distanceEnough; // 距離十分なら時間は多少長くてもOK

    if (horizontalEnough && (distanceEnough || timeEnough)) {
      if (totalDx < 0) {
        // 左へドラッグ → 次へ
        next();
      } else {
        // 右へドラッグ → 前へ
        prev();
      }
    }

    // image.style.transform = '';
  };

  // バブリングで矢印や×から来るイベントを拾わない
  frame.addEventListener('pointerdown', onPointerDown);
  frame.addEventListener('pointermove', onPointerMove);
  frame.addEventListener('pointerup', onPointerUp);
  frame.addEventListener('pointercancel', onPointerUp);
})();



// === Mac 二本指スワイプ（wheel deltaX）: トラックパッド（wheelイベント）」 ===
(() => {
  const frame = modal.querySelector('.gm-frame');
  if (!frame) return;

  // 調整ポイント
  const THRESHOLD   = 120;  // 蓄積ゴール（大きいほど発火しにくい）
  const MIN_STEP    = 4;    // 微小ノイズ除去
  const DECAY_MS    = 260;  // 減衰の速さ（小さいほど早くブレーキ）
  const COOLDOWN_MS = 350;  // 連発防止
  const INVERT      = false; // 方向が逆に感じたら true

  let accum = 0;
  let lastT = 0;
  let sign  = 0;
  let locked = false;

  frame.addEventListener('wheel', (e) => {
    if (!modal.classList.contains('open')) return;

    // 横が優勢のときだけ介入
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

    // ページへの水平スクロールを止める
    e.preventDefault(); // ← 必ず passive:false で登録すること
    if (locked) return;

    const now = performance.now();
    const dt  = lastT ? (now - lastT) : 16;
    lastT = now;

    // 減衰（指数）
    const decay = Math.exp(-dt / DECAY_MS);
    accum *= decay;

    // 微小揺れは無視
    if (Math.abs(e.deltaX) < MIN_STEP) return;

    // 方向管理（反転時はリセット）
    const s = Math.sign(e.deltaX);
    if (s === 0) return;
     if (sign === 0 || s === sign) {
     accum -= e.deltaX; // ← 符号を逆に
    } else {
     sign = s;
     accum = -e.deltaX; // ← こちらも逆に
    }
    sign = s;

    // 閾値超えでページ送り
    if (Math.abs(accum) >= THRESHOLD) {
      let dir = accum < 0 ? 1 : -1; // 右へスワイプ→次へ
      if (INVERT) dir = -dir;

      if (dir > 0) next(); else prev();

      // リセット＋クールダウン
      accum = 0;
      sign  = 0;
      locked = true;
      setTimeout(() => { locked = false; }, COOLDOWN_MS);
    }
  }, { passive: false });
})();

})();



  
  // ==== Simple Viewer (image or video) ====
(() => {
  const mq = window.matchMedia("(max-width: 480px)");
  if (!mq.matches) return;

  const PAD = 8;      // 画面端の余白
  const GAP = 8;      // 最低間隔
  const STEP_Y = 12;  // 下へ送る量
  const STEP_X = 16;  // 右へ送る量
  const MAX_ITERS = 600;

  // A) いったん全アイコンの left/top を px に“固定”する
  function lockToPx(el) {
    const cs = getComputedStyle(el);
    const left = parseFloat(cs.left) || el.offsetLeft || 0;
    const top  = parseFloat(cs.top)  || el.offsetTop  || 0;
    el.style.left = Math.round(left) + "px";
    el.style.top  = Math.round(top)  + "px";
  }

  function rectOf(el) {
    const x = parseFloat(el.style.left) || 0;
    const y = parseFloat(el.style.top)  || 0;
    const w = el.offsetWidth  || 80;
    const h = el.offsetHeight || 100;
    return { left:x, top:y, right:x+w, bottom:y+h, w, h };
  }

  function collide(a, b) {
    return !(a.right + GAP <= b.left ||
             a.left  >= b.right + GAP ||
             a.bottom + GAP <= b.top  ||
             a.top   >= b.bottom + GAP);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function resolveOverlaps() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const icons = Array.from(document.querySelectorAll(".icon"))
      .filter(el => el.dataset.keep !== "true");

    if (!icons.length) return;

    // A) まず px に固定
    icons.forEach(lockToPx);

    // 元の並びをなるべく尊重
    icons.sort((a,b)=>(a.offsetTop - b.offsetTop) || (a.offsetLeft - b.offsetLeft));

    const placed = [];

    icons.forEach(el => {
      let x = clamp(parseFloat(el.style.left) || el.offsetLeft || PAD, PAD, vw - (el.offsetWidth||80)  - PAD);
      let y = clamp(parseFloat(el.style.top)  || el.offsetTop  || PAD, PAD, vh - (el.offsetHeight||100) - PAD);

      let i = 0;
      while (i++ < MAX_ITERS) {
        const r = { left:x, top:y, w:(el.offsetWidth||80), h:(el.offsetHeight||100) };
        r.right = r.left + r.w;
        r.bottom= r.top  + r.h;

        const hit = placed.find(p => collide(r, p));
        if (!hit) {
          r.left  = clamp(r.left,  PAD, vw - r.w - PAD);
          r.top   = clamp(r.top,   PAD, vh - r.h - PAD);
          r.right = r.left + r.w;
          r.bottom= r.top  + r.h;

          el.style.left = r.left + "px";
          el.style.top  = r.top  + "px";
          placed.push(r);
          break;
        }
        // ぶつかったら下へ送る→下端で折り返して右へ
        y += STEP_Y;
        if (y + (el.offsetHeight||100) + PAD > vh) {
          y = PAD;
          x += STEP_X;
          if (x + (el.offsetWidth||80) + PAD > vw) {
            x = PAD;
            y += STEP_Y * 2; // 最終退避
          }
        }
      }
    });
  }

  // B) 画像ロード完了後に実行（重要）
  function whenImagesReady(cb){
    const imgs = Array.from(document.images);
    const pend = imgs.filter(img => !img.complete);
    if (!pend.length) { cb(); return; }
    let left = pend.length;
    const done = () => { if (--left === 0) cb(); };
    pend.forEach(img => {
      img.addEventListener("load",  done, {once:true});
      img.addEventListener("error", done, {once:true});
    });
  }

  window.addEventListener("load", () => {
    whenImagesReady(() => {
      requestAnimationFrame(() => {
        resolveOverlaps();
        setTimeout(resolveOverlaps, 60); // 二度打ちで安定
      });
    });
  });

  // C) 向き変更・リサイズでも再実行
  window.addEventListener("orientationchange", () => setTimeout(resolveOverlaps, 200));
  window.addEventListener("resize", () => setTimeout(resolveOverlaps, 200));

  // これに置き換え（open/move/listSet を公開）
window.__v2_api__ = {
  open:  i => v2.open(i),
  move:  d => v2.move(d),
  listSet: list => { v2.list = Array.isArray(list) ? list : []; }
};

})();




/* =========================================================
   ov2/v2 (Overview v2 & Viewer v2) — thumbsだけでも動く版
   ========================================================= */
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

   const v2 = {
    modal:  $('#v2-viewer'),
    img:    $('#v2-img'),
    closeB: $('#v2-viewer .v2-close'),
    prevB:  $('#v2-viewer .v2-prev'),
    nextB:  $('#v2-viewer .v2-next'),
    list:   [],
    index:  0,
    touchX: 0,
    open(i){
      this.index = i;
      this.modal.removeAttribute('hidden');
      this.modal.setAttribute('aria-hidden','false');
      this.load(this.list[this.index], true);
    },
    hide(){
    this.modal.setAttribute('hidden','');
    this.modal.setAttribute('aria-hidden','true');
    this.img.removeAttribute('src');
    this.origin = null;
  },
    load(src, first=false){
      this.img.style.opacity = 0;
      const im = new Image();
      im.src = src;
      im.decode?.().catch(()=>{}).finally(() => {
        this.img.src = src;
        requestAnimationFrame(() => this.img.style.opacity = 1);
        if (first) this.preloadNeighbors();
      });
    },
    move(d){
      if(!this.list.length) return;
      this.index = (this.index + d + this.list.length) % this.list.length;
      this.load(this.list[this.index]);
      this.preloadNeighbors();
    },
        preloadNeighbors(){
      if(!this.list.length) return;
      const prev = this.list[(this.index-1+this.list.length)%this.list.length];
      const next = this.list[(this.index+1)%this.list.length];
      [prev, next].forEach(src => {
        const p = new Image();
        p.loading = 'lazy';
        p.src = src;
      });
    }
  };
  
    window.__v2_api__ = {
    open:   i => v2.open(i),
    move:   d => v2.move(d),
    listSet: list => { v2.list = Array.isArray(list) ? list : []; }
  };


  // === ov2 起動（イベント委譲：いつDOMにあっても拾える） ===
// === ov2 起動（最優先で拾って確実に開く） ===
document.addEventListener('click', ev => {
  const btn = ev.target.closest('.icon[data-ov2-thumbs]');
  if (!btn) return;

  // 他のリスナより先に実行
  ev.preventDefault();
  ev.stopImmediatePropagation();

  // 必要なDOMが無ければ生成
  let ov2Modal = document.querySelector('#ov2-modal');
  if (!ov2Modal) {
    ov2Modal = document.createElement('div');
    ov2Modal.id = 'ov2-modal';
    ov2Modal.setAttribute('aria-hidden','true');
    ov2Modal.innerHTML = `
      <div class="ov2-backdrop"></div>
      <div class="ov2-panel">
        <button class="ov2-close" aria-label="Close">×</button>
        <div id="ov2-grid"></div>
      </div>`;
    document.body.appendChild(ov2Modal);
  }
  const grid = ov2Modal.querySelector('#ov2-grid');

  // 全角・区切り対応のパーサ
  // カンマ区切りだけを許す（改行や全角はtrimだけ）
const parseCSV = (el, attr) =>
  (el.getAttribute(attr) || '')
    .replace(/\u3000/g, ' ')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const thumbs = parseCSV(btn, 'data-ov2-thumbs');      // URLのみ
let   large  = parseCSV(btn, 'data-ov2-large');       // "url|caption" 文字列をそのまま保持



  if (!thumbs.length) { console.warn('[OV2] data-ov2-thumbs が空'); return; }
  if (!large.length || large.length !== thumbs.length) large = thumbs.slice();

  // サムネ生成
  grid.innerHTML = '';
  thumbs.forEach((src, i) => {
  const a = document.createElement('a');
  a.href = '#';
  const img = document.createElement('img');
  img.src = src;                // ← thumbs[i] を使う
  img.loading = 'lazy';
  a.appendChild(img);

  // caption 部分
const capRaw = large[i] || '';
const parts = capRaw.split('|');
const caption = parts[1] ? parts[1].trim() : '';
if (caption) {
  const capEl = document.createElement('span');
  capEl.className = 'ov2-caption';
  capEl.textContent = caption;
  a.appendChild(capEl);
  a.classList.add('has-cap');      // ← これを追加（hover対象の印）
}


  // クリックで viewer へ
  a.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    window.__v2_api__?.listSet(large.map(s => (s.split('|')[0] || '').trim())); // viewer にはURLだけ渡す
    window.__v2_api__?.open(i);
  });
  ov2.grid.appendChild(a);
});


  // モーダルを開く
  ov2Modal.removeAttribute('hidden');
  ov2Modal.setAttribute('aria-hidden','false');

  // 閉じる操作
  ov2Modal.querySelector('.ov2-close')?.addEventListener('click', () => {
    ov2Modal.setAttribute('aria-hidden','true');
  }, { once:true });

  ov2Modal.querySelector('.ov2-backdrop')?.addEventListener('click', () => {
    ov2Modal.setAttribute('aria-hidden','true');
  }, { once:true });

  console.log('[OV2] open thumbs=%d large=%d', thumbs.length, large.length);
}, true); // capture=true で最優先



// 閉じる操作（未宣言エラーを避けるため window 経由＋存在チェック）
document.querySelector('#ov2-modal .ov2-close')
  ?.addEventListener('click', () => window.ov2?.hide?.());
document.querySelector('#ov2-modal .ov2-backdrop')
  ?.addEventListener('click', () => window.ov2?.hide?.());

document.querySelector('#v2-viewer .v2-close')
  ?.addEventListener('click', () => window.v2?.hide?.());
document.querySelector('#v2-viewer .v2-backdrop')
  ?.addEventListener('click', () => window.v2?.hide?.());
document.querySelector('#v2-viewer .v2-prev')
  ?.addEventListener('click', () => window.v2?.move?.(-1));
document.querySelector('#v2-viewer .v2-next')
  ?.addEventListener('click', () => window.v2?.move?.(1));

// キー操作（表示状態の確認はDOMで判定）
window.addEventListener('keydown', e => {
  if (document.querySelector('#v2-viewer[aria-hidden="false"]')) {
    if (e.key === 'ArrowLeft')  window.v2?.move?.(-1);
    else if (e.key === 'ArrowRight') window.v2?.move?.(1);
    else if (e.key === 'Escape') window.v2?.hide?.();
  } else if (document.querySelector('#ov2-modal[aria-hidden="false"]')) {
    if (e.key === 'Escape') window.ov2?.hide?.();
  }
});

// タッチスワイプ（v2が未用意でも落ちない）
(() => {
  const v2root = document.querySelector('#v2-viewer');
  if (!v2root) return;

  v2root.addEventListener('touchstart', e => {
    if (!window.v2) return;
    window.v2.touchX = e.changedTouches[0].clientX;
  }, { passive: true });

  v2root.addEventListener('touchend', e => {
    if (!window.v2) return;
    const dx = e.changedTouches[0].clientX - (window.v2.touchX ?? 0);
    if (Math.abs(dx) > 40) window.v2.move(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

})();// ← ここで終わり（この IIFE だけ残す）




/* ==== Mac 二本指スワイプ：トラックパッド版　トラックパッド／ホイール版 ==== */
(() => {
  const frame = document.querySelector('#v2-viewer .v2-frame');
  if (!frame) return;

  // 調整ポイント
  const THRESHOLD   = 120;   // ゴールの蓄積量（大きいほど発火しにくい）
  const MIN_STEP    = 4;     // 1イベントの最小感度（小さな揺れを無視）
  const DECAY_MS    = 260;   // 減衰時間（ms）。大きいほど余韻が残る
  const COOLDOWN_MS = 350;   // 連発防止のクールダウン
  const INVERT      = false; // 方向が逆に感じたら true

  let accum = 0;       // 方向一貫時の蓄積
  let lastT = 0;       // 前回時刻
  let sign  = 0;       // 現在の方向（-1 / 0 / +1）
  let locked = false;  // クールダウン中フラグ

  const go = (dir) => {
    const api = window.__v2_api__;
    if (api && typeof api.move === 'function') api.move(dir);
  };

  frame.addEventListener('wheel', (e) => {
    const opened = document.querySelector('#v2-viewer[aria-hidden="false"]');
    if (!opened) return;

    // 水平が優勢のときだけ介入（ページスクロールを止める）
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

    e.preventDefault(); // ページ側へ伝えない
    if (locked) return;

    const now = performance.now();
    const dt  = lastT ? (now - lastT) : 16; // ms
    lastT = now;

    // 減衰（指数減衰）。dtが空くほど蓄積が自然減
    const decay = Math.exp(-dt / DECAY_MS);
    accum *= decay;

    // 微小な揺れは無視
    if (Math.abs(e.deltaX) < MIN_STEP) return;

    // 方向判定（前回と逆なら蓄積をリセットしてからその方向へ）
    const s = Math.sign(e.deltaX); // -1 or +1
    if (s === 0) return;
    if (sign === 0 || s === sign) {
     accum -= e.deltaX; // ← 符号を逆に
    } else {
     sign = s;
     accum = -e.deltaX; // ← こちらも逆に
    } 
    sign = s;

    // 閾値を超えたら発火
    if (Math.abs(accum) >= THRESHOLD) {
      // accum<0（右へスワイプ）を next(=+1) にする
      let dir = accum < 0 ? 1 : -1;
      if (INVERT) dir = -dir;

      go(dir);

      // リセット＋クールダウン
      accum = 0;
      sign  = 0;
      locked = true;
      setTimeout(() => { locked = false; }, COOLDOWN_MS);
    }
  }, { passive: false });
})();

// ==== Simple Viewer: open/close (IDは #simple-viewer を前提) ====
(function () {
  const sv = document.getElementById('simple-viewer');
  if (!sv) return;
  const svImg = sv.querySelector('.simple-viewer__img');
  const svText = sv.querySelector('.simple-viewer__text');

  // クリック委譲（競合を避けるため prevent/stop を先制）
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon[data-type="simple-view"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const src = btn.dataset.src;
    if (!src) return;

    // 画像/動画/テキスト(HTMLスニペット)を判定
    const isVideo = /\.mp4(\?.*)?$/i.test(src);
    const isImage = /\.(webp|jpg|jpeg|png|gif|avif)(\?.*)?$/i.test(src);
    const isHtml  = /\.html?(\?.*)?$/i.test(src);

    // 初期化
    sv.classList.add('open');
    sv.removeAttribute('hidden');
    if (svText) { svText.hidden = true; svText.innerHTML = ''; }
    if (svImg)  { svImg.removeAttribute('src'); svImg.style.display = 'none'; }

    if (isVideo) {
      // 動画要素を都度生成（前回の残骸を削除）
      const old = sv.querySelector('video');
      if (old) old.remove();
      const v = document.createElement('video');
      v.src = src;
      v.autoplay = true;
      v.muted = true;
      v.controls = true;
      v.playsInline = true;
      v.style.maxWidth = '60%';
      v.style.maxHeight = '60%';
      sv.appendChild(v);
      v.play().catch(()=>{});
      return;
    }

    // 画像
    const old = sv.querySelector('video');
    if (old) old.remove();

    if (isImage) {
      svImg.style.display = 'block';
      svImg.loading = 'lazy';
      svImg.decoding = 'async';
      svImg.src = src;
      return;
    }

    // HTMLスニペット（例: ./credits/credits_snippet.html）
    if (isHtml && svText) {
      fetch(src)
        .then(r => r.text())
        .then(html => {
          svText.innerHTML = html;
          svText.hidden = false;
        })
        .catch(() => {
          svText.innerHTML = '<div style="padding:1rem">Failed to load.</div>';
          svText.hidden = false;
        });
      return;
    }
  });

  // 閉じる：ESC か、ビューワ領域クリックで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSV();
  });
  sv.addEventListener('click', () => closeSV());

  function closeSV() {
    sv.classList.remove('open');
    sv.setAttribute('hidden', 'true');
    const v = sv.querySelector('video');
    if (v) { try { v.pause(); } catch(_){} v.remove(); }
    if (svImg) { svImg.removeAttribute('src'); svImg.style.display = 'none'; }
    if (svText) { svText.hidden = true; svText.innerHTML = ''; }
  }
})();



})(); // ← IIFE