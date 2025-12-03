
// Simple viewer test
(function () {
  const sv = document.getElementById('simple-viewer');
  if (!sv) return;

  const svImg  = sv.querySelector('.simple-viewer__img');
  const svText = sv.querySelector('.simple-viewer__text');

  const svVideoWrap = sv.querySelector('.sv-video');
  const svVideoTag  = sv.querySelector('.sv-video__tag');
  const svProgBar   = sv.querySelector('.sv-progress__bar');
  const svProgTrack = sv.querySelector('.sv-progress');
  const svPlayBtn   = sv.querySelector('.sv-btn--play');
  const svFsBtn     = sv.querySelector('.sv-btn--fs');

  // 進捗バーシーク
  if (svProgTrack && svVideoTag) {
    const seekFromClientX = (clientX) => {
      const rect = svProgTrack.getBoundingClientRect();
      if (!rect.width || !svVideoTag.duration) return;

      let ratio = (clientX - rect.left) / rect.width;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;

      svVideoTag.currentTime = ratio * svVideoTag.duration;
    };

    svProgTrack.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      seekFromClientX(e.clientX);
    });
  }

  // プログレスバー更新
  if (svVideoTag && svProgBar) {
    svVideoTag.addEventListener('timeupdate', () => {
      if (!svVideoTag.duration) return;
      const ratio = svVideoTag.currentTime / svVideoTag.duration;
      svProgBar.style.width = `${ratio * 100}%`;
    });
  }

  // 再生 / 一時停止
  if (svPlayBtn && svVideoTag) {
    svPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (svVideoTag.paused) {
        svVideoTag.play().catch(() => {});
        svPlayBtn.textContent = 'PAUSE';
      } else {
        svVideoTag.pause();
        svPlayBtn.textContent = 'PLAY';
      }
    });
  }

  // フルスクリーン
  if (svFsBtn && svVideoTag) {
    svFsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (svVideoTag.requestFullscreen) {
        svVideoTag.requestFullscreen();
      } else if (svVideoTag.webkitEnterFullscreen) {
        svVideoTag.webkitEnterFullscreen();
      }
    });
  }

  // シンプルな open ロジック
  const openSimpleViewer = (btn, e) => {
    e.preventDefault();
    e.stopPropagation();

    const src = btn.dataset.src || '';
    if (!src) return;

    const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(src);
    const isImage = /\.(webp|jpg|jpeg|png|gif|avif)(\?.*)?$/i.test(src);
    const isHtml  = /\.html?(\?.*)?$/i.test(src);

    sv.classList.add('open');

    // 全ビューを一旦隠す
    if (svVideoWrap) svVideoWrap.style.display = 'none';
    if (svImg) {
      svImg.style.display = 'none';
      svImg.removeAttribute('src');
    }
    if (svText) {
      svText.style.display = 'none';
      svText.innerHTML = '';
    }

    // 動画
    if (isVideo && svVideoWrap && svVideoTag) {
      svVideoWrap.style.display = 'block';

      if (svProgBar) svProgBar.style.width = '0%';
      if (svPlayBtn) svPlayBtn.textContent = 'PAUSE';

      svVideoTag.src = src;
      svVideoTag.muted = true;
      svVideoTag.playsInline = true;
      svVideoTag.autoplay = true;
      svVideoTag.currentTime = 0;
      svVideoTag.play().catch(() => {});
      return;
    }

    // 画像
    if (isImage && svImg) {
      svImg.style.display = 'block';
      svImg.src = src;
      return;
    }

    // HTML
    if (isHtml && svText) {
      fetch(src)
        .then(r => r.text())
        .then(html => {
          svText.innerHTML = html;
          svText.style.display = 'block';
        })
        .catch(() => {
          svText.innerHTML = 'Failed to load.';
          svText.style.display = 'block';
        });
    }
  };

  // アイコンに pointerdown をつける
  const svButtons = document.querySelectorAll('.icon[data-type="simple-view"]');

  svButtons.forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      openSimpleViewer(btn, e);
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
  });

  // 閉じる
  function closeSV() {
    sv.classList.remove('open');

    if (svVideoWrap && svVideoTag) {
      try { svVideoTag.pause(); } catch (_) {}
      svVideoTag.removeAttribute('src');
      svVideoTag.load();
    }
  }

  sv.addEventListener('click', (e) => {
    if (e.target === sv) {
      closeSV();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSV();
  });
})();
