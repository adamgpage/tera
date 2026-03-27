"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createGlobeDataService,
  generateSampleGlobeData,
  type GlobeData,
  type GlobeArc,
} from "@/lib/globe/data-service";

interface TeraGlobeProps {
  onRegionClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  personalArcs?: GlobeArc[];
  className?: string;
  simplified?: boolean; // Mobile mode
}

export function TeraGlobe({
  onRegionClick,
  interactive = true,
  personalArcs,
  className = "",
  simplified = false,
}: TeraGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [data, setData] = useState<GlobeData>(generateSampleGlobeData());
  const [isLoaded, setIsLoaded] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Globe Data Service connection
  useEffect(() => {
    if (personalArcs) return; // Personal globe uses static data

    const service = createGlobeDataService((newData) => {
      setData(newData);
    });

    return () => service.destroy();
  }, [personalArcs]);

  // Initialize globe.gl
  useEffect(() => {
    if (!containerRef.current || !webglSupported) return;

    let cancelled = false;

    async function initGlobe() {
      try {
        const GlobeModule = await import("globe.gl");
        // globe.gl exports a constructor that returns a factory
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Globe = GlobeModule.default as any;

        if (cancelled || !containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const globe = Globe()(containerRef.current)
          .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
          .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
          .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
          .width(width)
          .height(height)
          .animateIn(true)
          .atmosphereColor("#14b8a6")
          .atmosphereAltitude(0.15);

        // Arcs for active conversations
        globe
          .arcsData([])
          .arcColor("color" as never)
          .arcDashLength(0.4)
          .arcDashGap(0.2)
          .arcDashAnimateTime(1500)
          .arcStroke(0.5)
          .arcAltitudeAutoScale(0.3);

        // Pulses for activity
        globe
          .pointsData([])
          .pointColor(() => "#14b8a6")
          .pointAltitude(0.01)
          .pointRadius(0.3)
          .pointsMerge(true);

        if (interactive && onRegionClick) {
          globe.onGlobeClick(({ lat, lng }: { lat: number; lng: number }) => {
            onRegionClick(lat, lng);
          });
        }

        if (!interactive) {
          globe.enablePointerInteraction(false);
        }

        // Simplified mode for mobile
        if (simplified) {
          globe
            .atmosphereAltitude(0.1)
            .pointRadius(0.2);
        }

        // Auto-rotate
        const controls = globe.controls();
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.5;
          controls.enableZoom = interactive;
        }

        globeRef.current = globe;
        setIsLoaded(true);
      } catch (err) {
        console.error("Globe init error:", err);
        setWebglSupported(false);
      }
    }

    initGlobe();

    return () => {
      cancelled = true;
    };
  }, [webglSupported, interactive, onRegionClick, simplified]);

  // Update globe data when it changes
  useEffect(() => {
    if (!globeRef.current || !isLoaded) return;

    const arcs = personalArcs || data.arcs;
    globeRef.current.arcsData(arcs);
    globeRef.current.pointsData(data.pulses.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      size: p.intensity,
    })));
  }, [data, personalArcs, isLoaded]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !globeRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        globeRef.current?.width(width).height(height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isLoaded]);

  const handleGlobeClick = useCallback(() => {
    if (onRegionClick) {
      // Globe click passes through to globe.gl onGlobeClick
    }
  }, [onRegionClick]);

  // WebGL fallback: flat world map
  if (!webglSupported) {
    return (
      <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium mb-1">Live Activity Map</p>
            <p className="text-sm">{data.activeConversations} active conversations worldwide</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleGlobeClick}
      className={`relative ${className}`}
      style={{ minHeight: simplified ? 300 : 500 }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading globe…</p>
          </div>
        </div>
      )}

      {/* Activity counter overlay */}
      {isLoaded && (
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
          <div className="text-2xl font-bold text-teal-400">{data.activeConversations}</div>
          <div className="text-xs text-gray-300">active conversations</div>
        </div>
      )}
    </div>
  );
}
