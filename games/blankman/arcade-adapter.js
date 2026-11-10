// Report actual run results to the hosting cabinet. Practice never earns scores.
export function createReporter(send) {
  let previous = 'menu', playing = false;
  return state => {
    if (!state) return;
    if (state.mode === 'playing') playing = true;
    if (playing && state.mode !== previous && ['clear', 'victory', 'gameover'].includes(state.mode)) {
      if (!state.training && Number.isFinite(state.score) && state.score >= 0) {
        send({ bba: 'score', game: 'blankman', score: Math.min(1e9, Math.floor(state.score)) });
      }
      playing = false;
    }
    previous = state.mode;
  };
}

if (typeof window !== 'undefined' && window.parent !== window) {
  const parentOrigin = new URL(document.referrer || location.href).origin;
  if (parentOrigin === location.origin) {
    const report = createReporter(data => parent.postMessage(data, parentOrigin));
    const timer = setInterval(() => {
      if (window.blankman?.ready()) report(window.blankman.state());
    }, 500);
    addEventListener('pagehide', () => clearInterval(timer), { once: true });
  }
}
