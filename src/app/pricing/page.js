"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// Import gallery images
import madeImage1 from "../../../public/made-1.jpg";
import madeImage2 from "../../../public/made-2.avif";
import madeImage3 from "../../../public/made-3.avif";
import madeImage4 from "../../../public/made-4.jpg";
import madeImage5 from "../../../public/made-5.jpg";
import madeImage6 from "../../../public/made-6.avif";

const PricingPage = () => {
    const [billingPeriod, setBillingPeriod] = useState("monthly"); // "monthly" or "yearly"
    const [openFaq, setOpenFaq] = useState(null);

    const pricingPlans = {
        monthly: [
            {
                name: "Basic",
                price: "Free",
                priceSubtext: "",
                features: [
                    { text: "Generate 4 images", included: true },
                    { text: "Basic marketplace browsing", included: true },
                    { text: "Limited Spec Sheet", included: true },
                    { text: "Save images you love", included: true },
                    { text: "Basic exports (view-only or watermark)", included: true },
                ],
                buttonText: "Sign Up",
                buttonHighlight: null,
                buttonStyle: "outline",
                highlighted: false,
            },
            {
                name: "Plus",
                price: "$15",
                priceSubtext: "/Mo",
                features: [
                    { text: "Unlimited image generation", included: true },
                    { text: "Limited marketplace browsing", included: true },
                    { text: "Limited Spec Sheet", included: true },
                    { text: "Save images you love", included: true },
                    { text: "Advanced AI tools", included: true },
                    { text: "Unlimited exports (view-only or watermark)", included: true },
                ],
                buttonText: "Start your 7 day",
                buttonHighlight: "Plus",
                buttonSuffix: "trial",
                buttonStyle: "outline",
                highlighted: false,
            },
            {
                name: "Pro",
                price: "$48",
                priceSubtext: "/Mo",
                features: [
                    { text: "Unlimited image generation", included: true },
                    { text: "Unlimited marketplace browsing", included: true },
                    { text: "Unlimited Spec Sheet", included: true },
                    { text: "Save images you love", included: true },
                    { text: "Advanced AI tools", included: true },
                    { text: "Unlimited exports (view-only or watermark)", included: true },
                ],
                buttonText: "Upgrade to",
                buttonHighlight: "Pro",
                buttonSuffix: null,
                buttonStyle: "outline",
                highlighted: true,
            },
        ],
        yearly: [
            {
                name: "Basic",
                price: "Free",
                priceSubtext: "",
                features: [
                    { text: "Generate 4 images", included: true },
                    { text: "Basic marketplace browsing", included: true },
                    { text: "Limited Spec Sheet", included: true },
                    { text: "Save images you love", included: true },
                    { text: "Basic exports (view-only or watermark)", included: true },
                ],
                buttonText: "Sign Up",
                buttonHighlight: null,
                buttonStyle: "outline",
                highlighted: false,
            },
            {
                name: "Plus",
                price: "$10",
                priceSubtext: "/Mo, $120 billed yearly",
                features: [
                    { text: "Unlimited image generation", included: true },
                    { text: "Limited marketplace browsing", included: true },
                    { text: "Limited Spec Sheet", included: true },
                    { text: "Save images you love", included: true },
                    { text: "Advanced AI tools", included: true },
                    { text: "Unlimited exports (view-only or watermark)", included: true },
                ],
                buttonText: "Start your 7 day",
                buttonHighlight: "Plus",
                buttonSuffix: "trial",
                buttonStyle: "outline",
                highlighted: false,
            },
            {
                name: "Pro",
                price: "$32",
                priceSubtext: "/Mo, $384 billed yearly",
                features: [
                    { text: "Unlimited image generation", included: true },
                    { text: "Unlimited marketplace browsing", included: true },
                    { text: "Unlimited Spec Sheet", included: true },
                    { text: "Save images you love", included: true },
                    { text: "Advanced AI tools", included: true },
                    { text: "Unlimited exports (view-only or watermark)", included: true },
                ],
                buttonText: "Upgrade to",
                buttonHighlight: "Pro",
                buttonSuffix: null,
                buttonStyle: "outline",
                highlighted: true,
            },
        ],
    };

    const faqItems = [
        {
            question: "Do you offer a free trial or demo?",
            answer:
                "Yes! We offer a 7-day free trial for both Plus and Pro plans. You can explore all premium features risk-free before committing to a subscription.",
        },
        {
            question: "How does yearly plan work?",
            answer:
                "When you choose yearly billing, you pay upfront for 12 months and receive a significant discount compared to monthly billing. Your subscription auto-renews annually unless cancelled.",
        },
    ];

    const galleryImages = [
        madeImage1,
        madeImage2,
        madeImage3,
        madeImage4,
        madeImage5,
        madeImage6,
    ];

    const currentPlans = pricingPlans[billingPeriod];

    return (
        <div className="w-full min-h-screen">
            <div className="mt-24 sm:mt-32 md:mt-40 px-4 sm:px-8 md:px-16 lg:px-24 pb-16">
                {/* Header */}
                <div className="text-center mb-8 sm:mb-12">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                        Pricing
                    </h1>
                    <h2 className="text-xl sm:text-2xl font-semibold mb-3">
                        Step into the future of material sourcing
                    </h2>
                    <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">
                        Get access to AI-powered tools that help architects and interior
                        designers discover materials faster, visualize ideas instantly, and
                        generate project-ready details with ease.
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center mb-10 sm:mb-14">
                    <div className="bg-gray-100 rounded-full p-1 flex">
                        <button
                            onClick={() => setBillingPeriod("monthly")}
                            className={`px-6 sm:px-8 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billingPeriod === "monthly"
                                ? "bg-black text-white"
                                : "text-gray-700 hover:text-gray-900"
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingPeriod("yearly")}
                            className={`px-6 sm:px-8 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billingPeriod === "yearly"
                                ? "bg-black text-white"
                                : "text-gray-700 hover:text-gray-900"
                                }`}
                        >
                            Yearly
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16 sm:mb-24">
                    {currentPlans.map((plan, index) => (
                        <div
                            key={index}
                            className="rounded-2xl p-6 sm:p-8 flex flex-col bg-black text-white"
                        >
                            {/* Plan Header */}
                            <div className="mb-6">
                                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                                    {plan.name}
                                </p>
                                <div className="flex items-baseline">
                                    <span className="text-3xl sm:text-4xl font-bold">
                                        {plan.price}
                                    </span>
                                    {plan.priceSubtext && (
                                        <span className="text-sm text-gray-400 ml-1">
                                            {plan.priceSubtext}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8 flex-grow">
                                {plan.features.map((feature, featureIndex) => (
                                    <li key={featureIndex} className="flex items-start gap-2">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-5 h-5 flex-shrink-0 mt-0.5 text-white"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="text-sm text-gray-300">
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <Link
                                href="/signup"
                                className={`w-full py-3 rounded-full text-center font-medium text-sm transition-colors ${plan.buttonStyle === "filled"
                                    ? "bg-orange-500 text-white hover:bg-orange-600"
                                    : "bg-transparent text-white border border-white hover:bg-white/10"
                                    }`}
                            >
                                {plan.buttonText}
                                {plan.buttonHighlight && (
                                    <span className="text-orange-500">
                                        {" "}{plan.buttonHighlight}
                                    </span>
                                )}
                                {plan.buttonSuffix && ` ${plan.buttonSuffix}`}
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Questions about pricing */}
                <div className="max-w-4xl mx-auto mb-16 sm:mb-24">
                    <h2 className="text-xl sm:text-2xl font-bold mb-6">
                        Questions about pricing?
                    </h2>
                    <div className="space-y-2">
                        {faqItems.map((item, index) => (
                            <div key={index} className="border-b border-gray-200">
                                <button
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-sm sm:text-base text-gray-700">
                                        {item.question}
                                    </span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${openFaq === index ? "rotate-180" : ""
                                            }`}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                        />
                                    </svg>
                                </button>
                                {openFaq === index && (
                                    <div className="pb-4 pr-8">
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {item.answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Made with Dsource.AI */}
                <div className="max-w-6xl mx-auto mb-16 sm:mb-24">
                    <div className="mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold">Made with Dsource. AI</h2>
                        <p className="text-gray-500 text-sm">
                            See how designers are using Dsource.AI
                        </p>
                    </div>
                    {/* Masonry Grid Layout */}
                    <div className="grid grid-cols-4 gap-4 auto-rows-[120px]">
                        {/* Column 1 - Top image */}
                        <div className="relative row-span-2 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                            <Image
                                src={galleryImages[0]}
                                alt="Made with DSource.AI 1"
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Column 2 - Top image */}
                        <div className="relative row-span-1 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                            <Image
                                src={galleryImages[1]}
                                alt="Made with DSource.AI 2"
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Column 3 - Full height image */}
                        <div className="relative row-span-3 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                            <Image
                                src={galleryImages[2]}
                                alt="Made with DSource.AI 3"
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Column 4 - Top image */}
                        <div className="relative row-span-1 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                            <Image
                                src={galleryImages[3]}
                                alt="Made with DSource.AI 4"
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Column 1 - Bottom (staircase) */}
                        <div className="relative row-span-1 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                            <Image
                                src={galleryImages[4]}
                                alt="Made with DSource.AI 5"
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Column 2 - Bottom (cozy room) */}
                        <div className="relative row-span-2 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                            <Image
                                src={galleryImages[5]}
                                alt="Made with DSource.AI 6"
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Column 4 - Gray placeholder */}
                        <div className="relative row-span-1 rounded-2xl bg-gray-200"></div>

                        {/* Column 4 - Bottom kitchen image */}
                        <div className="relative row-span-1 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                            <Image
                                src={galleryImages[0]}
                                alt="Made with DSource.AI 7"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
