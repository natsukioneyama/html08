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
// ==========================================================
//  Overview Modal（テンプレ注入＋開閉を1か所に統合）
// ==========================================================
  const modal = document.getElementById('overviewModal');
  if (!modal) return;

  const panel     = modal.querySelector('.modal__panel');
  const container = modal.querySelector('#overview');
  const btnClose  = modal.querySelector('[data-close]');

  // overview 内のリンクを無効化（Lightbox などへ飛ばないように）
  if (container) {
    container.addEventListener('click', (e) => {
      if (e.target.closest('a[href]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  // 開く処理：アイコンから data-ov でテンプレを呼び出す
  function openOverviewFromIcon(btn) {
    if (!container) return;

    const sel = btn.getAttribute('data-ov'); // 例: "#ov-skin"
    const src = sel ? document.querySelector(sel) : null;
    if (!src) return;

    // 中身を差し替え（毎回クリーンに）
    container.innerHTML = '';
    Array.from(src.children).forEach(node => {
      container.appendChild(node.cloneNode(true));
    });

    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  // 閉じる処理（共通）
  function closeOverview() {
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    if (container) container.innerHTML = '';
  }
  

  // 1) デスクトップアイコンから開く
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon[data-type="overview"]');
    if (!btn) return;
    openOverviewFromIcon(btn);
  });

  // 2) 閉じるボタン（[data-close]）で閉じる
  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeOverview();
    });
  }

  // 3) パネル外（背景）クリックで閉じる
  modal.addEventListener('click', (e) => {
    if (!panel) return;
    if (!panel.contains(e.target)) {
      closeOverview();
    }
  });

  // 4) Esc キーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal.getAttribute('aria-hidden') === 'false') {
      closeOverview();
    }
  });
})();


// ==== Simple Viewer: open (画像 or 動画 or HTML snippet) ====
(function () {
  const sv = document.getElementById('simple-viewer');
  if (!sv) return;
  const svImg  = sv.querySelector('.simple-viewer__img');
  const svText = sv.querySelector('.simple-viewer__text');

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon[data-type="simple-view"]');
    if (!btn) return;

    const src = btn.dataset.src || '';
    if (!src) return;
    
    const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(src);
    const isImage = /\.(webp|jpg|jpeg|png|gif|avif)(\?.*)?$/i.test(src);
    const isHtml  = /\.html?(\?.*)?$/i.test(src);

    // 動画
    if (isVideo) {
      e.preventDefault();
      e.stopPropagation();

      sv.classList.add('open');
      sv.removeAttribute('hidden');

      const old = sv.querySelector('video');
      if (old) old.remove();

      const v = document.createElement('video');
      v.src = src;
      v.controls = true;
      v.autoplay = true;
      v.muted = true;
      v.playsInline = true;
      v.style.maxWidth = '90vw';
      v.style.maxHeight = '80vh';
      v.style.objectFit = 'contain';

      sv.appendChild(v);
      return;
    }

    // 画像 or HTML を開くときだけイベントを握る
    if (!(isImage || isHtml)) return;
    e.preventDefault();
    e.stopPropagation();

    sv.classList.add('open');
    sv.removeAttribute('hidden');
    if (svText) { svText.hidden = true; svText.innerHTML = ''; }
    if (svImg)  { svImg.removeAttribute('src'); svImg.style.display = 'none'; }

    // 画像
    if (isImage) {
      const old = sv.querySelector('video');
      if (old) old.remove();
      svImg.style.display = 'block';
      svImg.loading = 'lazy';
      svImg.decoding = 'async';
      svImg.src = src;
      return;
    }

    // HTMLスニペット（例: ./credits/credits_snippet.html）
    if (isHtml && svText) {
      const old = sv.querySelector('video');
      if (old) old.remove();
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
  
  // 閉じる：ESC か、背景クリックで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSV();
  });

  sv.addEventListener('click', (e) => {
    // sv 自身（背景）をクリックしたときだけ閉じる
    if (e.target === sv) {
      closeSV();
    }
  });

  function closeSV() {
    sv.classList.remove('open');
    sv.setAttribute('hidden', 'true');
    const v = sv.querySelector('video');
    if (v) { try { v.pause(); } catch(_){} v.remove(); }
    if (svImg) { svImg.removeAttribute('src'); svImg.style.display = 'none'; }
    if (svText) { svText.hidden = true; svText.innerHTML = ''; }
  }
})();

// ==========================================================
//  Draggable icons — PCは --dx/--dy、Mobileは --mx/--my を更新
// ==========================================================
(() => {
  const DRAG_THRESHOLD = 3; // px
  const icons = document.querySelectorAll(".icon");
  if (!icons.length) return;

  // ドラッグ直後の誤クリック抑止
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".icon");
    if (!btn) return;
    if (btn.__skipClickUntil && Date.now() < btn.__skipClickUntil) {
      e.stopPropagation(); e.preventDefault();
    }
  }, true);

  icons.forEach((btn) => {
    if (!btn.style.position) btn.style.position = "absolute"; // PC安全策
    btn.addEventListener("mousedown", onDown);
    btn.addEventListener("touchstart", onDown, { passive: false }); // ← 必ず false

    function onDown(ev){
      const isTouch = ev.type === "touchstart";
      const startX = isTouch ? ev.touches[0].clientX : ev.clientX;
      const startY = isTouch ? ev.touches[0].clientY : ev.clientY;
      const cs = getComputedStyle(btn);
      const isMobile = window.matchMedia("(max-width: 768px)").matches;

      // PC用（中心基準）
      const baseDX = parseFloat(cs.getPropertyValue("--dx")) || 0;
      const baseDY = parseFloat(cs.getPropertyValue("--dy")) || 0;
      // Mobile用（グリッド上での相対移動）
      const baseMX = parseFloat(cs.getPropertyValue("--mx")) || 0;
      const baseMY = parseFloat(cs.getPropertyValue("--my")) || 0;

      let moved = false;
      if (isMobile) btn.style.touchAction = "none"; // ドラッグ中はスクロール抑止

      function onMove(e2){
        const x = e2.touches ? e2.touches[0].clientX : e2.clientX;
        const y = e2.touches ? e2.touches[0].clientY : e2.clientY;
        const dx = x - startX, dy = y - startY;

        if (!moved && (Math.abs(dx)>DRAG_THRESHOLD || Math.abs(dy)>DRAG_THRESHOLD)){
          moved = true;
          btn.style.left = ""; btn.style.top = ""; // 古い方式の痕跡を無効化
        }
        if (moved){
          if (e2.cancelable) e2.preventDefault(); // ドラッグ中のみページスクロール停止
          if (isMobile){
            btn.style.setProperty("--mx", (baseMX + dx) + "px");
            btn.style.setProperty("--my", (baseMY + dy) + "px");
          } else {
            btn.style.setProperty("--dx", (baseDX + dx) + "px");
            btn.style.setProperty("--dy", (baseDY + dy) + "px");
          }
        }
      }

      function onUp(){
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onUp);
        if (isMobile) btn.style.touchAction = ""; // pan-y に戻す
        if (moved) btn.__skipClickUntil = Date.now() + 300;
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchmove", onMove, { passive: false }); // ← 必ず false
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

})();// IILF← IILFの終わり



// ==== Mobile icons: overlap resolver (max-width:480px) ====
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

})(); // IILF← IILFの終わり





// === Mobile layout (keep order but allow jitter) ===
(function () {
  const mq = window.matchMedia('(max-width: 768px)');

  // 偏りの少ないFisher–Yates（cryptoで乱数）
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const r = new Uint32Array(1);
      crypto.getRandomValues(r);
      const j = r[0] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 見た目の“崩し”（ランダムにわずかにずらす）
  function jitterIcons(px = 10) {
    document.querySelectorAll('.icon-layer .icon').forEach(el => {
      const jx = (Math.random() * 2 - 1) * px; // -px〜+px
      const jy = (Math.random() * 2 - 1) * px;
      el.style.setProperty('--jx', jx + 'px');
      el.style.setProperty('--jy', jy + 'px');
    });
  }

  function applyMobileRandom() {
    if (!mq.matches) return; // PC/タブは何もしない
    const layer = document.querySelector('.icon-layer');
    if (!layer) return;

    // ==== 並び順は固定（シャッフル無効）====
    // shuffle(main) や shuffle(util) は行わない

    // ただしジッターは残す
    jitterIcons(10);
  }

  // 初回＆レイアウト切替時だけ適用
  window.addEventListener('DOMContentLoaded', applyMobileRandom);
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(applyMobileRandom, 200);
  });
})();  // IILF← IILFの終わり



