/**
 * Globe Data Service — Client-side consumer.
 * Connects to the Globe Data Service WebSocket and receives throttled
 * aggregated activity updates (max 1 update per 3 seconds).
 *
 * In production the Globe Data Service is a standalone Node.js process
 * that aggregates Supabase Realtime events. At MVP this client
 * falls back to polling the REST API.
 */

export interface GlobeArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  domain: string;
  color: string;
}

export interface GlobePulse {
  lat: number;
  lng: number;
  intensity: number; // 0-1
}

export interface GlobeData {
  arcs: GlobeArc[];
  pulses: GlobePulse[];
  activeConversations: number;
  timestamp: number;
}

type GlobeDataCallback = (data: GlobeData) => void;

const DOMAIN_COLORS: Record<string, string> = {
  agriculture: "#22c55e",
  technology: "#3b82f6",
  finance: "#f59e0b",
  education: "#8b5cf6",
  healthcare: "#ef4444",
  law: "#6366f1",
  engineering: "#06b6d4",
  business: "#f97316",
  default: "#14b8a6",
};

export function getDomainColor(domain: string): string {
  return DOMAIN_COLORS[domain.toLowerCase()] || DOMAIN_COLORS.default;
}

/**
 * Create a Globe Data Service connection.
 * At MVP, uses polling with simulated data.
 * In production, connects to the WebSocket-based Globe Data Service.
 */
export function createGlobeDataService(callback: GlobeDataCallback) {
  const wsUrl = process.env.NEXT_PUBLIC_GLOBE_WS_URL;
  let ws: WebSocket | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  function connect() {
    if (destroyed) return;

    if (wsUrl) {
      // Production: WebSocket connection to Globe Data Service
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as GlobeData;
          callback(data);
        } catch {
          // Invalid data — ignore
        }
      };

      ws.onclose = () => {
        if (!destroyed) {
          // Reconnect after 5 seconds
          setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    } else {
      // MVP fallback: poll REST endpoint
      async function poll() {
        if (destroyed) return;
        try {
          const res = await fetch("/api/globe/activity");
          if (res.ok) {
            const data = await res.json();
            callback(data);
          }
        } catch {
          // Ignore poll errors
        }
      }

      poll();
      pollInterval = setInterval(poll, 3000); // 3-second throttle as spec requires
    }
  }

  connect();

  return {
    destroy() {
      destroyed = true;
      ws?.close();
      if (pollInterval) clearInterval(pollInterval);
    },
  };
}

/**
 * Generate sample globe data for development and demo.
 */
export function generateSampleGlobeData(): GlobeData {
  const cities = [
    { lat: 51.5, lng: -0.1, name: "London" },
    { lat: -1.3, lng: 36.8, name: "Nairobi" },
    { lat: 40.7, lng: -74.0, name: "New York" },
    { lat: -23.5, lng: -46.6, name: "São Paulo" },
    { lat: 35.7, lng: 139.7, name: "Tokyo" },
    { lat: 30.0, lng: 31.2, name: "Cairo" },
    { lat: 60.2, lng: 24.9, name: "Helsinki" },
    { lat: 10.8, lng: 106.6, name: "Ho Chi Minh" },
    { lat: 28.6, lng: 77.2, name: "Delhi" },
    { lat: -33.9, lng: 18.4, name: "Cape Town" },
    { lat: 48.9, lng: 2.3, name: "Paris" },
    { lat: 1.3, lng: 103.8, name: "Singapore" },
  ];

  const domains = Object.keys(DOMAIN_COLORS).filter((k) => k !== "default");
  const arcCount = 5 + Math.floor(Math.random() * 8);
  const arcs: GlobeArc[] = [];

  for (let i = 0; i < arcCount; i++) {
    const from = cities[Math.floor(Math.random() * cities.length)];
    let to = cities[Math.floor(Math.random() * cities.length)];
    while (to === from) {
      to = cities[Math.floor(Math.random() * cities.length)];
    }
    const domain = domains[Math.floor(Math.random() * domains.length)];
    arcs.push({
      id: `arc-${i}-${Date.now()}`,
      startLat: from.lat,
      startLng: from.lng,
      endLat: to.lat,
      endLng: to.lng,
      domain,
      color: getDomainColor(domain),
    });
  }

  const pulses: GlobePulse[] = cities.map((c) => ({
    lat: c.lat,
    lng: c.lng,
    intensity: Math.random(),
  }));

  return {
    arcs,
    pulses,
    activeConversations: 50 + Math.floor(Math.random() * 200),
    timestamp: Date.now(),
  };
}
