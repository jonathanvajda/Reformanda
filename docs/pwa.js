(() => {
  const buttons = ['nav-install-app', 'install-app'].map(id => document.getElementById(id));
  const status = document.getElementById('install-status');
  const dialog = document.getElementById('install-help');
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installPrompt, registration, installed = standalone(), updateRequested = false, reloading = false;
  const render = () => {
    const update = !!(registration?.waiting && navigator.serviceWorker.controller);
    buttons.forEach(button => {
      button.hidden = !update && (installed || !isSecureContext);
      button.textContent = update ? 'Update available' : 'Install App for offline mode';
      button.disabled = updateRequested;
    });
    status.textContent = update ? 'An update is ready. Select Update available to apply it and reload.' : installed ? 'Reformanda is installed on this device.' : 'Install for one-tap access and offline study.';
  };
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event; render();
  });
  addEventListener('appinstalled', () => { installPrompt = null; installed = true; render(); });
  buttons.forEach(button => button.addEventListener('click', async () => {
    if (registration?.waiting && navigator.serviceWorker.controller) {
      if (state.session && !confirm('Update Reformanda now? This will end your current study session. Saved progress will be kept.')) return;
      updateRequested = true; render();
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; }
      catch { showInstallHelp(); }
      render();
    } else showInstallHelp();
  }));
  function showInstallHelp() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    document.getElementById('ios-install-steps').hidden = !ios;
    document.getElementById('browser-install-steps').hidden = ios;
    dialog.showModal();
  }
  document.getElementById('close-install-help').addEventListener('click', () => dialog.close());
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updateRequested && !reloading) { reloading = true; location.reload(); }
    });
    addEventListener('load', async () => {
      try {
        registration = await navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' });
        render();
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', render);
        });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
      } catch { /* Installation help remains available if offline registration fails. */ }
    });
  }
})();
