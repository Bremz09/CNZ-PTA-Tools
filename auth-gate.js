(function () {
  'use strict';

  var STORAGE_KEY = 'cnz-pta-unlocked';
  var EXPECTED_HASH =
    '086eec074ad18d1159de3c076d7f7d8a55f5bc8d134f6f9f5b3cc306181ced80';

  try {
    if (window.localStorage && localStorage.getItem(STORAGE_KEY) === '1') {
      return;
    }
  } catch (e) {
    // localStorage may be unavailable (private mode, file://); fall through to prompt.
  }

  // Hide page content immediately to prevent any flash of unauthenticated UI.
  var hideStyle = document.createElement('style');
  hideStyle.id = 'cnz-auth-hide';
  hideStyle.textContent =
    'html.cnz-locked body > *:not(#cnz-auth-overlay){visibility:hidden!important;}' +
    'html.cnz-locked{overflow:hidden!important;}';
  document.documentElement.appendChild(hideStyle);
  document.documentElement.classList.add('cnz-locked');

  function sha256Hex(text) {
    var enc = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', enc).then(function (buf) {
      var bytes = new Uint8Array(buf);
      var hex = '';
      for (var i = 0; i < bytes.length; i++) {
        var h = bytes[i].toString(16);
        if (h.length < 2) h = '0' + h;
        hex += h;
      }
      return hex;
    });
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'cnz-auth-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Password required');
    overlay.innerHTML = [
      '<style>',
      '#cnz-auth-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;',
      'align-items:center;justify-content:center;',
      'background:radial-gradient(circle at top left,rgba(0,174,199,.25),transparent 35%),',
      'radial-gradient(circle at right top,rgba(219,107,48,.25),transparent 32%),',
      'linear-gradient(180deg,#1A1A1A 0%,#0E4174 100%);',
      'font-family:Arial,Helvetica,sans-serif;color:#fff;}',
      '#cnz-auth-overlay .cnz-auth-card{background:rgba(26,26,26,.9);',
      'border:1px solid rgba(255,255,255,.12);border-radius:14px;',
      'padding:28px 32px;width:min(360px,90vw);box-shadow:0 18px 40px rgba(0,0,0,.45);',
      'backdrop-filter:blur(6px);}',
      '#cnz-auth-overlay h2{margin:0 0 6px;font-size:20px;font-weight:600;}',
      '#cnz-auth-overlay p{margin:0 0 18px;font-size:13px;color:#BBBCBC;}',
      '#cnz-auth-overlay form{display:flex;flex-direction:column;gap:10px;}',
      '#cnz-auth-overlay input{width:100%;padding:10px 12px;border-radius:8px;',
      'border:1px solid #3A3A3A;background:#2A2A2A;color:#fff;font-size:14px;',
      'outline:none;transition:border-color .15s;}',
      '#cnz-auth-overlay input:focus{border-color:#00AEC7;}',
      '#cnz-auth-overlay button{padding:10px 12px;border-radius:8px;border:0;',
      'background:#DB6B30;color:#fff;font-size:14px;font-weight:600;cursor:pointer;',
      'transition:background .15s;}',
      '#cnz-auth-overlay button:hover{background:#c45e29;}',
      '#cnz-auth-overlay button:disabled{opacity:.6;cursor:wait;}',
      '#cnz-auth-overlay .cnz-auth-error{min-height:16px;font-size:12px;color:#EE5340;}',
      '</style>',
      '<div class="cnz-auth-card">',
      '<h2>CNZ PTA Tools</h2>',
      '<p>Enter the access keyword to continue.</p>',
      '<form id="cnz-auth-form" autocomplete="off">',
      '<input id="cnz-auth-input" type="password" autocomplete="off" ',
      'autofocus placeholder="Keyword" />',
      '<button type="submit" id="cnz-auth-submit">Unlock</button>',
      '<div class="cnz-auth-error" id="cnz-auth-error" aria-live="polite"></div>',
      '</form>',
      '</div>'
    ].join('');
    return overlay;
  }

  function mount() {
    if (document.getElementById('cnz-auth-overlay')) return;
    var overlay = buildOverlay();
    document.body.appendChild(overlay);

    var form = overlay.querySelector('#cnz-auth-form');
    var input = overlay.querySelector('#cnz-auth-input');
    var submit = overlay.querySelector('#cnz-auth-submit');
    var errorEl = overlay.querySelector('#cnz-auth-error');

    setTimeout(function () { try { input.focus(); } catch (e) {} }, 30);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var value = input.value || '';
      errorEl.textContent = '';
      submit.disabled = true;
      sha256Hex(value)
        .then(function (hex) {
          if (hex === EXPECTED_HASH) {
            try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
            document.documentElement.classList.remove('cnz-locked');
            overlay.remove();
            var s = document.getElementById('cnz-auth-hide');
            if (s) s.remove();
          } else {
            errorEl.textContent = 'Incorrect keyword.';
            input.value = '';
            input.focus();
            submit.disabled = false;
          }
        })
        .catch(function () {
          errorEl.textContent = 'Unable to verify keyword in this browser.';
          submit.disabled = false;
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
