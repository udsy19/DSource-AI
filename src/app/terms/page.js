import Link from "next/link";

export const metadata = {
  title: "Terms of Service | DSource.AI",
  description: "DSource.AI terms of service",
};

export default function TermsPage() {
  return (
    <div className="w-full min-h-screen mt-24 sm:mt-32 px-4 sm:px-8 md:px-16 lg:px-24 pb-16 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-4">Last updated: July 14, 2026</p>

      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-8 text-sm text-gray-700 leading-relaxed">
        <strong>Template notice:</strong> This document is a starting-point
        template. It has not been reviewed by legal counsel and must be reviewed
        and adapted by a qualified attorney before DSource.AI launches or relies
        on it.
      </div>

      <p className="text-gray-700 leading-relaxed mb-8">
        These Terms of Service ("Terms") govern your access to and use of the
        DSource.AI platform, an AI-powered interior-materials sourcing and
        visualization marketplace operated by DSource.AI ("DSource", "we", "us",
        or "our"). Please read them carefully.
      </p>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          1. Acceptance of Terms
        </h2>
        <p className="text-gray-700 leading-relaxed">
          By accessing or using the service, you agree to be bound by these
          Terms and by our{" "}
          <Link
            className="text-gray-900 underline underline-offset-2"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          . If you do not agree, you may not use the service. If you use the
          service on behalf of an organization, you represent that you are
          authorized to bind that organization to these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">2. Accounts</h2>
        <p className="text-gray-700 leading-relaxed">
          You must provide accurate information when creating an account, which
          is managed through our authentication provider, Supabase. You are
          responsible for safeguarding your credentials and for all activity
          under your account. Notify us promptly of any unauthorized use.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          3. Acceptable Use
        </h2>
        <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
          <li>
            Do not use the service for any unlawful or infringing purpose.
          </li>
          <li>
            Do not upload content you do not have the right to share, or images
            that depict others without appropriate consent.
          </li>
          <li>
            Do not attempt to disrupt, reverse engineer, or gain unauthorized
            access to the service or its systems.
          </li>
          <li>
            Do not misuse the AI tools to generate misleading, harmful, or
            infringing content.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          4. Vendor Obligations
        </h2>
        <p className="text-gray-700 leading-relaxed">
          If you list products as a brand or supplier, you are responsible for
          the accuracy of your product data, specifications, pricing, and
          imagery, and for ensuring you have the rights to publish it. You must
          comply with applicable laws and honor the terms you represent to
          buyers. We may remove listings that violate these Terms or applicable
          law.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          5. Intellectual Property
        </h2>
        <p className="text-gray-700 leading-relaxed">
          The service, including its software, design, and branding, is owned by
          DSource.AI and protected by intellectual property laws. You retain
          ownership of content you upload, and you grant us a limited license to
          host, process, and display that content solely to operate and provide
          the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          6. AI Output Disclaimer
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Material matches, visualizations, and other AI-generated results are
          produced with the assistance of third-party AI models, including
          Google Gemini, and are provided for informational and inspirational
          purposes only. AI output may be inaccurate or incomplete and does not
          guarantee that a material, color, finish, or product will match
          real-world results. Verify materials and specifications directly with
          vendors before making purchasing decisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          7. Limitation of Liability
        </h2>
        <p className="text-gray-700 leading-relaxed">
          To the maximum extent permitted by law, the service is provided "as
          is" without warranties of any kind. DSource.AI will not be liable for
          any indirect, incidental, special, consequential, or punitive damages,
          or for any loss of data, profits, or goodwill arising from your use of
          the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">8. Termination</h2>
        <p className="text-gray-700 leading-relaxed">
          We may suspend or terminate your access to the service at any time if
          you violate these Terms or if we discontinue the service. You may stop
          using the service and close your account at any time. Provisions that
          by their nature should survive termination will do so.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          9. Changes to These Terms
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We may update these Terms from time to time. When we do, we will
          revise the "Last updated" date above and, where appropriate, provide
          additional notice. Continued use of the service after changes take
          effect constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-3">10. Contact Us</h2>
        <p className="text-gray-700 leading-relaxed">
          Questions about these Terms can be sent to{" "}
          <a
            className="text-gray-900 underline underline-offset-2"
            href="mailto:legal@dsource.ai"
          >
            legal@dsource.ai
          </a>{" "}
          or by mail at [Company Address]. If you need help, visit our{" "}
          <Link
            className="text-gray-900 underline underline-offset-2"
            href="/help-center"
          >
            Help Center
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
