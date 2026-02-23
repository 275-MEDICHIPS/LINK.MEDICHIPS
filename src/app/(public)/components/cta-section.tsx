import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

export function CtaSection() {
  return (
    <section id="contact" className="scroll-mt-20 bg-brand-500 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Transform Healthcare Training?
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Start a pilot program in weeks, not months. Our team will help you
            set up courses, configure your organization, and onboard your first
            cohort of healthcare workers.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-brand-600 shadow-lg transition-all hover:bg-brand-50 hover:-translate-y-0.5"
            >
              Request Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:contact@medichips.ai"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              <Mail className="h-4 w-4" />
              Contact Us
            </a>
          </div>

          <p className="mt-8 text-sm text-brand-200">
            No credit card required. Free pilot for qualifying healthcare
            organizations.
          </p>
        </div>
      </div>
    </section>
  );
}
