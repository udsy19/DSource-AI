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
      { label: "SnapFind", href: "/" },
      { label: "RenderRoom", href: "/" },
      { label: "QuoteBoard", href: "/" },
      { label: "Vendor Directory", href: "/" },
    ],
    [
      { label: "How it Works", href: "/" },
      { label: "FAQ", href: "/" },
      { label: "Help Center", href: "/" },
      { label: "Contact Us", href: "/" },
    ],
    [
      { label: "About Us", href: "/" },
      { label: "Careers", href: "/" },
      { label: "Privacy Policy", href: "/" },
      { label: "Terms of Service", href: "/" },
    ],
  ];

  return (
    <div className="w-full h-full py-12 px-24" id="quick-links">
      <div className="grid grid-cols-5 px-12">
        {linkSections.map((links, index) => (
          <LinkSection key={index} links={links} />
        ))}
        <div></div>
        <div>
          <h1 className="text-2xl mb-4">DSource.AI</h1>
          <p className="text-gray-500">
            The ultimate platform for material sourcing and project
            visualization.
          </p>
        </div>
      </div>
      <div className="mt-24 px-12 mb-8">
        <h4 className="text-gray-500">
          © 2025 DSource.AI. All rights reserved.
        </h4>
      </div>
    </div>
  );
};

export default QuickLinks;
