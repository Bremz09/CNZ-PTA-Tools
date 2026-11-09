(function (global) {
  let nextPlayerId = 0;

  function extractVideoId(value) {
    const raw = String(value || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
    try {
      const url = new URL(raw);
      if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) {
        return url.pathname.split('/').filter(Boolean)[0] || '';
      }
      if (!url.hostname.endsWith('youtube.com') && !url.hostname.endsWith('.youtube.com')) return '';
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      const markerIndex = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));
      return markerIndex >= 0 ? parts[markerIndex + 1] || '' : '';
    } catch (_) {
      return '';
    }
  }

  function ensureApiLoaded(state) {
    if (global.YT && global.YT.Player) return Promise.resolve(global.YT);
    if (state.apiPromise) return state.apiPromise;
    state.apiPromise = new Promise((resolve, reject) => {
      const previousReady = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = () => {
        try {
          if (typeof previousReady === 'function') previousReady();
        } finally {
          resolve(global.YT);
        }
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => reject(new Error('YouTube player API could not be loaded.'));
      document.head.appendChild(script);
    });
    return state.apiPromise;
  }

  global.createYouTubeVideoAdapter = function (localVideo, container) {
    const state = { player: null, active: false, apiPromise: null, loadToken: 0 };
    const dispatch = (name) => localVideo.dispatchEvent(new Event(name));

    function clear() {
      state.loadToken++;
      state.active = false;
      if (state.player) {
        try { state.player.destroy(); } catch (_) {}
      }
      state.player = null;
      container.innerHTML = '';
      container.style.display = 'none';
      dispatch('timeupdate');
    }

    async function load(url, callbacks = {}) {
      const videoId = extractVideoId(url);
      if (!videoId) {
        clear();
        return false;
      }
      const loadToken = ++state.loadToken;
      if (state.player) {
        try { state.player.destroy(); } catch (_) {}
      }
      state.player = null;
      state.active = false;
      localVideo.style.display = 'none';
      container.innerHTML = '';
      container.style.display = 'block';
      const mount = document.createElement('div');
      mount.id = `youtube-player-${++nextPlayerId}`;
      container.appendChild(mount);

      try {
        await ensureApiLoaded(state);
        if (loadToken !== state.loadToken) return false;
        const playerVars = { controls: 1, playsinline: 1, rel: 0 };
        if (global.location.origin && global.location.origin !== 'null') playerVars.origin = global.location.origin;
        state.player = new global.YT.Player(mount.id, {
          videoId,
          playerVars,
          events: {
            onReady: () => {
              if (loadToken !== state.loadToken) return;
              state.active = true;
              dispatch('loadedmetadata');
              dispatch('timeupdate');
              callbacks.onReady?.();
            },
            onStateChange: () => dispatch('timeupdate'),
            onError: (event) => callbacks.onError?.(event)
          }
        });
        return true;
      } catch (error) {
        if (loadToken === state.loadToken) {
          clear();
          callbacks.onLoadError?.(error);
        }
        return false;
      }
    }

    const video = new Proxy(localVideo, {
      get(target, property) {
        const player = state.active ? state.player : null;
        if (player) {
          if (property === 'currentTime') return player.getCurrentTime() || 0;
          if (property === 'duration') return player.getDuration() || 0;
          if (property === 'paused') return player.getPlayerState() !== global.YT.PlayerState.PLAYING;
          if (property === 'readyState') return global.HTMLMediaElement.HAVE_METADATA;
          if (property === 'play') return () => { player.playVideo(); return Promise.resolve(); };
          if (property === 'pause') return () => player.pauseVideo();
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, property, value) {
        const player = state.active ? state.player : null;
        if (player && property === 'currentTime') {
          player.seekTo(Math.max(0, Number(value) || 0), true);
          return true;
        }
        if (property === 'src') clear();
        return Reflect.set(target, property, value, target);
      }
    });

    global.setInterval(() => {
      if (state.active) dispatch('timeupdate');
    }, 250);

    return {
      video,
      load,
      clear,
      get active() { return state.active && Boolean(state.player); }
    };
  };
})(window);