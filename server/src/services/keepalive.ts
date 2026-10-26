/**
 * Self keep-alive pinger.
 *
 * Render's free web services spin down after ~15 minutes without inbound traffic.
 * This pings the service's own public URL every few minutes; because the request goes
 * out through Render's edge and back in, it counts as inbound traffic and keeps the
 * instance awake.
 *
 * Enabled automatically on Render (RENDER_EXTERNAL_URL is set there) or anywhere else
 * by setting KEEPALIVE_URL. Set KEEPALIVE_DISABLED=1 to turn it off. The interval can be
 * changed with KEEPALIVE_INTERVAL_MINUTES (default 5).
 */
export function startKeepAlive(): void {
  if (process.env.KEEPALIVE_DISABLED === '1') return;

  const base = (process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
  if (!base) return;

  const minutes = Number(process.env.KEEPALIVE_INTERVAL_MINUTES);
  const intervalMs = (Number.isFinite(minutes) && minutes >= 1 ? minutes : 5) * 60_000;
  const url = `${base}/api/ping`;

  const ping = async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) console.warn(`[keepalive] ${url} answered ${res.status}`);
    } catch (err: any) {
      console.warn(`[keepalive] ping failed: ${err?.message ?? err}`);
    }
  };

  setInterval(ping, intervalMs).unref();
  console.log(`[keepalive] pinging ${url} every ${intervalMs / 60_000} min`);
}
