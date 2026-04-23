import React from "react";
import Link from "next/link";

const LinkSection = ({ links }) => {
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {links.map((link, index) => (
          <li key={index}>
            <Link className="text-gray-500" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const QuickLinks = () => {
  const linkSections = [
    [
      { label: "SnapFind", href: "/ai-material-finder/find" },
      { label: "RenderRoom", href: "/ai-visualizer" },
      { label: "QuoteBoard", href: "/spec-builder" },
      { label: "Vendor Directory", href: "/marketplace" },
    ],
    [
      { label: "How it Works", href: "/ai-material-finder" },
      { label: "FAQ", href: "/faq" },
      { label: "Help Center", href: "/help-center" },
      { label: "Contact Us", href: "/help-center#contact" },
    ],
    [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  ];

  return (
    <div className="w-full h-full py-6 sm:py-8 md:py-12 px-4 sm:px-8 md:px-16 lg:px-24" id="quick-links">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 px-4 sm:px-8 md:px-12">
        {linkSections.map((links, index) => (
          <LinkSection key={index} links={links} />
        ))}
        <div className="hidden lg:block"></div>
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
          <Link href="/" className="block">
            <h1 className="text-xl sm:text-2xl mb-2 sm:mb-4">DSource.AI</h1>
            <p className="text-gray-500 text-sm sm:text-base">
              The ultimate platform for material sourcing and project
              visualization.
            </p>
          </Link>
        </div>
      </div>
      <div className="mt-12 sm:mt-16 md:mt-24 px-4 sm:px-8 md:px-12 mb-4 sm:mb-6 md:mb-8">
        <h4 className="text-gray-500 text-sm sm:text-base">
          © 2026 DSource.AI. All rights reserved.
        </h4>
      </div>
    </div>
  );
};

export default QuickLinks;
