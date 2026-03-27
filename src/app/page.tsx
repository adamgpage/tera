"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";

// Lazy import — globe loads after initial paint, never on server
const TeraGlobe = lazy(() =>
  import("@/components/globe/tera-globe").then((m) => ({ default: m.TeraGlobe }))
);

function GlobeLoader() {
  return (
    <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
      <div className="animate-pulse text-gray-600 text-lg">Loading…</div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [showInput, setShowInput] = useState(false);
  const [requestText, setRequestText] = useState("");

  const handleGlobeClick = useCallback((_lat: number, _lng: number) => {
    setShowInput(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (requestText.trim()) {
      // Store draft text and navigate to request page
      sessionStorage.setItem("tera_draft_request", requestText);
      router.push("/requests/new");
    }
  }, [requestText, router]);

  return (
    <main className="relative min-h-screen bg-gray-950 overflow-hidden">
      {/* Globe background */}
      <div className="absolute inset-0">
        <Suspense fallback={<GlobeLoader />}>
          <TeraGlobe
            onRegionClick={handleGlobeClick}
            interactive
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {/* Overlay content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {!showInput ? (
          // Landing state
          <div className="text-center max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4">
              Tera
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-2">
              Connect with people who have solved the problem you&apos;re facing.
            </p>
            <p className="text-gray-500 mb-10">
              Real experience. Real conversation. Matched by AI.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => setShowInput(true)}
                className="rounded-xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-teal-500 transition-all hover:shadow-teal-500/25 hover:shadow-xl"
              >
                Describe Your Problem
              </button>
              <a
                href="/login"
                className="rounded-xl border border-gray-700 px-8 py-4 text-lg font-semibold text-gray-300 hover:bg-gray-800/50 transition-colors"
              >
                Sign In
              </a>
            </div>

            <p className="mt-6 text-sm text-gray-600">
              Click anywhere on the globe or tap the button to start
            </p>
          </div>
        ) : (
          // Request input state — globe fades
          <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">
                What do you need help with?
              </h2>
              <p className="text-gray-400 mb-6 text-sm">
                Describe your problem in plain language. Any language. No jargon required.
              </p>

              <textarea
                autoFocus
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder="I'm trying to figure out why my cassava crop keeps failing despite following all the recommended practices…"
                className="w-full h-40 bg-gray-800 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSubmit}
                  disabled={!requestText.trim()}
                  className="flex-1 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Find Someone Who Knows
                </button>
                <button
                  onClick={() => setShowInput(false)}
                  className="rounded-xl border border-gray-700 px-4 py-3 text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="flex justify-center gap-8 py-4 bg-gradient-to-t from-gray-950 to-transparent">
          <a href="/knowledge" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Knowledge Commons
          </a>
          <a href="/register" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Become a Helper
          </a>
          <a href="/knowledge" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Browse Expertise
          </a>
        </div>
      </div>
    </main>
  );
}
