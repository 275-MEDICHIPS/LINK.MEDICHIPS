import Link from "next/link";

const footerLinks = {
  Platform: [
    { label: "Microlearning", href: "#features" },
    { label: "Practice Tasks", href: "#features" },
    { label: "Verification", href: "#features" },
    { label: "AI Course Builder", href: "#features" },
    { label: "Offline Learning", href: "#features" },
  ],
  Solutions: [
    { label: "KOICA Programs", href: "#contact" },
    { label: "Hospital Training", href: "#contact" },
    { label: "NGO Partnerships", href: "#contact" },
    { label: "Community Health", href: "#contact" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Case Studies", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#contact" },
    { label: "Careers", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                MEDICHIPS<span className="text-brand-500">-LINK</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Korean medical expertise to the world. AI-powered training for
              healthcare workers.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900">
                {category}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 transition-colors hover:text-brand-500"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} MEDICHIPS. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>link.medichips.ai</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
