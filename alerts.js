// Boss alerts: an opt-in browser notification when a boss spawns. Nothing is sent unless the player turns it on,
// and turning it off removes this browser from the list.
const KEY = 'BFpbW8q1cOOBDJhtBrV1Ds4tVRDxzbqvFxICr-71fQpD9KcEcaAxa79kBX_u_-xC_7deQ4UDpKm3zNNBc6iB1h8';
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };
export function createAlerts({ call, toast, hub }) {
  const can = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
  let on = false, busy = false;
  const sub = async () => { const r = await navigator.serviceWorker.getRegistration('/'); return r ? r.pushManager.getSubscription() : null; };
  if (can) sub().then(s => { on = !!s && Notification.permission === 'granted'; }).catch(() => {});
  async function turnOn() {
    if (!can) return toast(ios ? 'ON IPHONE: ADD THE ARCADE TO YOUR HOME SCREEN FIRST' : 'THIS BROWSER CANNOT SHOW ALERTS');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return toast('ALERTS ARE BLOCKED FOR THIS SITE IN YOUR BROWSER SETTINGS');
    const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
    const s = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(KEY) })), j = s.toJSON();
    await call('sub', { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
    on = true; hub('alerts_on'); toast('BOSS ALERTS ARE ON');
  }
  async function turnOff() {
    const s = can ? await sub() : null;
    if (s) { try { await call('unsub', { endpoint: s.endpoint }); } catch {} await s.unsubscribe(); }
    on = false; hub('alerts_off'); toast('BOSS ALERTS ARE OFF');
  }
  async function toggle(want) { if (busy) return; busy = true; try { await (want === 'off' ? turnOff() : turnOn()); } catch (e) { toast('COULD NOT CHANGE ALERTS: ' + String(e.message || e).toUpperCase().slice(0, 60)); } busy = false; }
  const html = () => !can ? `<p class="dim">🔔 Boss alerts: ${ios ? 'on iPhone, tap Share, then Add to Home Screen, open the arcade from there and come back to this panel.' : 'this browser cannot show notifications.'}</p>`
    : on ? `<p>🔔 Boss alerts are ON for this browser. <button class="btn" data-alerts="off">TURN OFF</button></p>`
      : `<p>Get a notification the moment a boss spawns, even with the arcade closed. <button class="btn go" data-alerts="on">🔔 GET BOSS ALERTS</button></p>`;
  return { toggle, html, get on() { return on; }, can };
}
