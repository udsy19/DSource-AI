"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useRef, useState } from "react";
import demoImage from "../../../public/banner-image.jpg";
// Import images from public folder
import contactImage from "../../../public/spacejoy.jpg";

const HelpCenterPage = () => {
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    country: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
    formRef.current?.querySelector("input")?.focus();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // There is no ticketing backend yet, so we hand the message off to the
  // user's own mail client via a mailto: link. This is honest — nothing is
  // silently dropped, and the user can see and send the email themselves.
  const handleSubmit = (e) => {
    e.preventDefault();

    const subject =
      `Help Center inquiry from ${formData.firstName} ${formData.lastName}`.trim();
    const body = [
      `Name: ${formData.firstName} ${formData.lastName}`,
      `Email: ${formData.email}`,
      `Country: ${formData.country}`,
      "",
      "Message:",
      formData.message,
    ].join("\n");

    window.location.href = `mailto:support@dsource.ai?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setSubmitStatus("mail-opened");

    // Clear status after 3 seconds
    setTimeout(() => setSubmitStatus(null), 3000);
  };

  const helpCategories = [
    {
      title: "Designers & Architects Information",
      description:
        "Questions and support related to dscource.ai for interior designers and architects.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7"
        >
          <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
          <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
        </svg>
      ),
    },
    {
      title: "Brands & Suppliers Inquiries",
      description:
        "Questions and support for brands, suppliers, and distributors.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7"
        >
          <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
          <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
          <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
          <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
        </svg>
      ),
    },
    {
      title: "AI Tools Help & Support",
      description:
        "Learn how to use dscource.ai's AI features get tips for best results, and find troubleshooting help.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7"
        >
          <path
            fillRule="evenodd"
            d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full min-h-screen">
      <div className="mt-24 sm:mt-32 md:mt-40 px-4 sm:px-8 md:px-16 lg:px-24 pb-16">
        {/* Title */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Help Center
          </h1>
        </div>

        {/* Contact Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto mb-16 sm:mb-24">
          {/* Image */}
          <div className="relative h-[300px] sm:h-[400px] lg:h-full min-h-[300px] rounded-2xl overflow-hidden">
            <Image
              src={contactImage}
              alt="Contact Us"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <button
                onClick={scrollToForm}
                className="text-white text-2xl sm:text-3xl font-bold bg-transparent border-2 border-white px-8 py-4 rounded-lg hover:bg-white/20 transition-colors"
              >
                Contact Us
              </button>
            </div>
          </div>

          {/* Contact Form */}
          <div
            id="contact"
            ref={formRef}
            className="bg-white rounded-2xl p-6 sm:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name*
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email*
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country*
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message*
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Submit
              </button>

              <p className="text-gray-500 text-center text-xs">
                Submitting opens your email app with this message pre-filled.
                You can also email us directly at{" "}
                <a
                  href="mailto:support@dsource.ai"
                  className="underline underline-offset-2"
                >
                  support@dsource.ai
                </a>
                .
              </p>

              {submitStatus === "mail-opened" && (
                <p className="text-gray-700 text-center text-sm">
                  Your email app should have opened with your message ready to
                  send. If it didn&apos;t, email us at{" "}
                  <a
                    href="mailto:support@dsource.ai"
                    className="underline underline-offset-2"
                  >
                    support@dsource.ai
                  </a>
                  .
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Can we help? Section */}
        <div className="max-w-6xl mx-auto mb-16 sm:mb-24">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Can we help?</h2>
            <p className="text-gray-500">
              Any questions you have can be resolved here.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {helpCategories.map((category, index) => (
              <div
                key={index}
                className="bg-gray-200 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-shadow cursor-pointer min-h-[200px] flex flex-col"
              >
                <h3 className="font-bold text-base sm:text-lg mb-3">
                  {category.title}
                </h3>
                <p className="text-gray-600 text-sm mb-6 flex-grow">
                  {category.description}
                </p>
                <div className="text-black mt-auto">{category.icon}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Section */}
        <div className="relative w-full max-w-6xl mx-auto rounded-2xl overflow-hidden">
          <div className="relative h-[250px] sm:h-[300px] md:h-[350px]">
            <Image
              src={demoImage}
              alt="Watch Demo"
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-between px-6 sm:px-12">
              <div>
                <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                  Explore Dsource.AI -
                  <br />
                  watch the demo anytime.
                </h2>
              </div>
              <Link
                href="#"
                className="bg-white text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-semibold text-sm sm:text-base hover:bg-gray-100 transition-colors shadow-lg"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
