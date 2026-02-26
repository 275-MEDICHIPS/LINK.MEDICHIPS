"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

const DEMO_INTRO_URL =
  "https://storage.googleapis.com/medichips-link-assets/videos/demo-intro.mp4";

const ROTATION_VIDEOS = [
  "https://storage.googleapis.com/medichips-link-assets/videos/dental-resin-treatment.mp4",
  "https://storage.googleapis.com/medichips-link-assets/videos/dental-production-workflow.mp4",
  "https://storage.googleapis.com/medichips-link-assets/videos/dental-advanced-procedure.mp4",
];

export function HeroSection() {
  const t = useTranslations("landing");

  // Intro state
  const [showIntro, setShowIntro] = useState(false);
  const [introFading, setIntroFading] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const introRef = useRef<HTMLVideoElement>(null);

  // Rotation state — always plays after intro (or immediately for return visitors)
  const [rotationIndex, setRotationIndex] = useState(0);
  const rotationRef = useRef<HTMLVideoElement>(null);

  // On mount: check first visit
  useEffect(() => {
    const visited = localStorage.getItem("medichips_visited");
    if (!visited) {
      setShowIntro(true);
      localStorage.setItem("medichips_visited", "1");
    } else {
      // Return visitor — skip intro, go straight to rotation
      setIntroDone(true);
    }
  }, []);

  // Intro: stop 1s before end, fade out 0.7s, then start rotation
  const handleIntroTimeUpdate = useCallback(() => {
    const v = introRef.current;
    if (!v || introFading) return;
    if (v.duration > 0 && v.currentTime >= v.duration - 1) {
      v.pause();
      setIntroFading(true);
      setTimeout(() => {
        setShowIntro(false);
        setIntroDone(true);
      }, 700);
    }
  }, [introFading]);

  // Rotation: on video end, advance to next
  const handleRotationEnded = useCallback(() => {
    setRotationIndex((prev) => (prev + 1) % ROTATION_VIDEOS.length);
  }, []);

  // Auto-play rotation video when ready or index changes
  useEffect(() => {
    if (introDone && rotationRef.current) {
      rotationRef.current.load();
      rotationRef.current.play().catch(() => {});
    }
  }, [rotationIndex, introDone]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/30 to-white pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute top-20 -left-40 h-[400px] w-[400px] rounded-full bg-accent-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-brand-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            {t("heroTitle")}
            <br />
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 bg-clip-text text-transparent">
              {t("heroTitleHighlight")}
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            {t("heroSubtitle")}
          </p>

        </div>

        {/* Video / Product Preview */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-2xl shadow-gray-900/20">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-800 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 rounded-md bg-gray-700 px-4 py-1 text-xs text-gray-400">
                link.medichips.ai/dashboard
              </div>
            </div>

            {/* Video area */}
            <div className="relative aspect-video bg-gradient-to-br from-brand-900 to-gray-900">
              {/* First-visit intro video */}
              {showIntro && (
                <div
                  className="absolute inset-0 z-20"
                  style={{
                    opacity: introFading ? 0 : 1,
                    transition: "opacity 0.7s ease-out",
                  }}
                >
                  <video
                    ref={introRef}
                    src={DEMO_INTRO_URL}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    onTimeUpdate={handleIntroTimeUpdate}
                  />
                </div>
              )}

              {/* Rotation videos — always play after intro */}
              {introDone && (
                <div className="absolute inset-0 z-10">
                  <video
                    ref={rotationRef}
                    src={ROTATION_VIDEOS[rotationIndex]}
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    onEnded={handleRotationEnded}
                  />
                  {/* Indicator dots */}
                  <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                    {ROTATION_VIDEOS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setRotationIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === rotationIndex
                            ? "w-6 bg-white"
                            : "w-1.5 bg-white/40"
                        }`}
                        aria-label={`Video ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
