    (function () {
      const screen = document.querySelector('.screen');
      if (!screen) return;
      const root = document.documentElement;
      const readShrink = () => {
        const full = parseFloat(getComputedStyle(root).getPropertyValue('--hero-full')) || 468;
        const min = parseFloat(getComputedStyle(root).getPropertyValue('--hero-min')) || 96;
        return Math.max(1, full - min);
      };
      let shrinkDistance = readShrink();
      let ticking = false;
      let lastP = -1;
      const update = () => {
        const raw = screen.scrollTop / shrinkDistance;
        const clamped = Math.min(1, Math.max(0, raw));
        const p = Math.round(clamped * 100) / 100;
        if (p !== lastP) {
          screen.style.setProperty('--scroll-progress', p);
          // Pause video once hero collapses meaningfully — higher threshold
          // so a finger-tap's micro-scroll does not instantly pause playback.
          if (p > 0.35 && lastP <= 0.35) {
            const v = document.getElementById('reelVideo');
            if (v && !v.paused) v.pause();
          }
          lastP = p;
        }
        ticking = false;
      };
      screen.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      }, { passive: true });
      window.addEventListener('resize', () => {
        shrinkDistance = readShrink();
        update();
      });
      update();
    })();

    /* Reels carousel — sync active dot with slide scroll position; click-to-go */
    (() => {
      const slider = document.getElementById('reelSlider');
      const dotsWrap = document.getElementById('reelDots');
      if (!slider || !dotsWrap) return;
      const dots = Array.from(dotsWrap.querySelectorAll('.reel-dot'));
      let activeIdx = 0;
      let ticking = false;

      const setActive = (i) => {
        if (i === activeIdx) return;
        // Pause video when swiping away from slide 0 (video slide)
        if (activeIdx === 0 && i !== 0) {
          const v = document.getElementById('reelVideo');
          if (v && !v.paused) v.pause();
        }
        activeIdx = i;
        dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
      };

      const update = () => {
        const idx = Math.round(slider.scrollLeft / slider.clientWidth);
        setActive(Math.min(dots.length - 1, Math.max(0, idx)));
        ticking = false;
      };

      slider.addEventListener('scroll', () => {
        if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
      }, { passive: true });

      dots.forEach((d, i) => {
        d.addEventListener('click', () => {
          slider.scrollTo({ left: i * slider.clientWidth, behavior: 'smooth' });
        });
      });

      const videoSlide = document.getElementById('videoSlide');
      const video = document.getElementById('reelVideo');
      const playBtn = document.getElementById('playBtn');
      const soundBtn = document.getElementById('soundBtn');

      if (videoSlide && video && playBtn && soundBtn) {
        let hideTimer = null;
        const HIDE_DELAY = 3000;

        videoSlide.classList.add('muted');
        video.muted = true;

        const clearHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } };
        const scheduleHide = () => {
          clearHide();
          hideTimer = setTimeout(() => videoSlide.classList.add('btn-hidden'), HIDE_DELAY);
        };
        const showBtn = () => {
          videoSlide.classList.remove('btn-hidden');
          clearHide();
        };

        const doPlay = () => {
          showBtn();
          if (video.muted && !videoSlide.dataset.soundInitialized) {
            video.muted = false;
            videoSlide.classList.remove('muted');
            soundBtn.setAttribute('aria-pressed', 'true');
            videoSlide.dataset.soundInitialized = '1';
          }
          const p = video.play();
          if (p && typeof p.catch === 'function') {
            p.catch(() => {
              if (!video.muted) {
                video.muted = true;
                videoSlide.classList.add('muted');
                soundBtn.setAttribute('aria-pressed', 'false');
                video.play().catch(() => {});
              }
            });
          }
        };

        const doPause = () => {
          showBtn();
          video.pause();
        };

        video.addEventListener('play', () => {
          videoSlide.classList.add('playing');
          showBtn();
          scheduleHide();
        });
        video.addEventListener('pause', () => {
          videoSlide.classList.remove('playing');
          showBtn();
        });
        video.addEventListener('ended', () => {
          videoSlide.classList.remove('playing');
          showBtn();
          try { video.currentTime = 0; } catch (e) {}
        });

        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (video.paused) doPlay(); else doPause();
        });

        videoSlide.addEventListener('click', (e) => {
          if (e.target.closest('.sound-btn') || e.target.closest('.play-btn')) return;
          if (video.paused) doPlay(); else doPause();
        });

        soundBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showBtn();
          if (video.muted || video.paused) scheduleHide();
          video.muted = !video.muted;
          videoSlide.classList.toggle('muted', video.muted);
          soundBtn.setAttribute('aria-pressed', String(!video.muted));
          videoSlide.dataset.soundInitialized = '1';
          if (!video.paused) scheduleHide();
        });
      }
    })();
