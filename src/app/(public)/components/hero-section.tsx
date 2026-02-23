"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useState } from "react";

export function HeroSection() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-100/30 blur-3xl" />
        <div className="absolute top-20 -left-40 h-[400px] w-[400px] rounded-full bg-accent-100/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            Turn Medical Expertise
            <br />
            <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
              Into Global Impact
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            AI-powered microlearning that systematically trains healthcare
            workers in developing countries. Deliver consistent, verifiable
            clinical competency — even offline.
          </p>

          {/* Dual CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-xl hover:-translate-y-0.5"
            >
              Request Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:border-brand-200 hover:bg-brand-50"
            >
              Try MEDICHIPS-LINK Now
            </Link>
          </div>
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

            {/* Product screenshot / video area */}
            <div className="relative aspect-video bg-gradient-to-br from-brand-900 to-gray-900">
              {!showVideo ? (
                <button
                  onClick={() => setShowVideo(true)}
                  className="group absolute inset-0 flex flex-col items-center justify-center gap-4"
                  aria-label="Play demo video"
                >
                  {/* Mock dashboard preview */}
                  <div className="absolute inset-0 opacity-40">
                    <div className="grid h-full grid-cols-12 gap-2 p-6">
                      <div className="col-span-3 space-y-2">
                        <div className="h-8 rounded bg-white/10" />
                        <div className="h-4 w-3/4 rounded bg-white/5" />
                        <div className="h-4 w-1/2 rounded bg-white/5" />
                        <div className="mt-4 h-4 w-full rounded bg-brand-500/30" />
                        <div className="h-4 w-full rounded bg-white/5" />
                        <div className="h-4 w-full rounded bg-white/5" />
                        <div className="h-4 w-full rounded bg-white/5" />
                      </div>
                      <div className="col-span-9 space-y-3">
                        <div className="h-10 rounded bg-white/10" />
                        <div className="grid grid-cols-4 gap-3">
                          <div className="h-24 rounded-lg bg-brand-500/20" />
                          <div className="h-24 rounded-lg bg-accent-500/20" />
                          <div className="h-24 rounded-lg bg-purple-500/20" />
                          <div className="h-24 rounded-lg bg-amber-500/20" />
                        </div>
                        <div className="h-48 rounded-lg bg-white/5" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
                    <Play className="h-6 w-6 text-brand-600 ml-1" />
                  </div>
                  <span className="relative z-10 text-sm font-medium text-white/80">
                    Watch 2-min Demo
                  </span>
                </button>
              ) : (
                <div className="flex h-full items-center justify-center text-white/60">
                  {/* Video embed placeholder - replace with actual Mux or YouTube embed */}
                  <p className="text-sm">Demo video loading...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
