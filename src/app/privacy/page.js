import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | DSource.AI",
  description: "DSource.AI privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="w-full min-h-screen mt-24 sm:mt-32 px-4 sm:px-8 md:px-16 lg:px-24 pb-16 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-4">Last updated: July 14, 2026</p>

      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-8 text-sm text-gray-700 leading-relaxed">
        <strong>Template notice:</strong> This document is a starting-point
        template. It has not been reviewed by legal counsel and must be reviewed
        and adapted by a qualified attorney before DSource.AI launches or relies
        on it.
      </div>

      <p className="text-gray-700 leading-relaxed mb-8">
        DSource.AI ("DSource", "we", "us", or "our") operates an AI-powered
        interior-materials sourcing and visualization marketplace. This Privacy
        Policy explains what information we collect, how we use it, who we share
        it with, and the choices you have. By using our services, you agree to
        the practices described here.
      </p>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          1. Information We Collect
        </h2>
        <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
          <li>
            <strong>Account information.</strong> When you register, we collect
            your name, email address, and authentication credentials. Accounts
            and sign-in are managed through our authentication provider,
            Supabase.
          </li>
          <li>
            <strong>Uploaded room photos and images.</strong> When you use our
            AI material-matching and visualization tools, we process the images
            you upload of your rooms and spaces.
          </li>
          <li>
            <strong>Vendor and product data.</strong> If you are a brand or
            supplier, we collect the product listings, specifications, pricing,
            and related content you submit to the marketplace.
          </li>
          <li>
            <strong>Usage and device data.</strong> We collect information such
            as pages viewed, features used, browser type, device identifiers,
            and IP address to operate and improve the service.
          </li>
          <li>
            <strong>Cookies and session data.</strong> We use cookies and
            similar technologies to keep you signed in, remember preferences,
            and understand how the service is used.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          2. How We Use Your Information
        </h2>
        <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
          <li>Provide, maintain, and secure your account and the service.</li>
          <li>
            Process uploaded room photos to detect materials, generate matches,
            and produce visualizations.
          </li>
          <li>Display vendor products and enable marketplace features.</li>
          <li>Communicate with you about support requests and updates.</li>
          <li>Analyze usage to improve product features and reliability.</li>
          <li>
            Detect, prevent, and respond to fraud, abuse, and security
            incidents.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          3. Third-Party Services
        </h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          We rely on trusted third-party providers to deliver the service. These
          providers process data on our behalf and are bound by their own terms
          and privacy commitments:
        </p>
        <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
          <li>
            <strong>Supabase</strong> — authentication, database, and storage
            for account and application data.
          </li>
          <li>
            <strong>Google Gemini</strong> — AI processing of uploaded room
            photos to power material matching and visualization. Images may be
            transmitted to Google's Gemini API for processing.
          </li>
        </ul>
        <p className="text-gray-700 leading-relaxed mt-3">
          We do not sell your personal information. We may disclose information
          when required by law or to protect the rights, safety, and property of
          DSource.AI and its users.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          4. Data Retention
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We retain personal information for as long as your account is active
          or as needed to provide the service, comply with legal obligations,
          resolve disputes, and enforce our agreements. Uploaded room photos are
          retained only as long as necessary to provide matching and
          visualization results, after which they may be deleted or anonymized.
          You may request deletion of your data as described below.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">5. Your Rights</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          Depending on your location, you may have the right to access, correct,
          export, or delete your personal information, and to object to or
          restrict certain processing. To exercise these rights, contact us
          using the details below. You can also close your account at any time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">6. Cookies</h2>
        <p className="text-gray-700 leading-relaxed">
          You can control cookies through your browser settings. Disabling
          cookies may affect your ability to stay signed in or use certain
          features of the service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">
          7. Changes to This Policy
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We may update this Privacy Policy from time to time. When we do, we
          will revise the "Last updated" date above and, where appropriate,
          provide additional notice.
        </p>
      </section>

      <section>
        <h2 className="text-xl sm:text-2xl font-bold mb-3">8. Contact Us</h2>
        <p className="text-gray-700 leading-relaxed">
          If you have questions about this Privacy Policy or how we handle your
          data, contact us at{" "}
          <a
            className="text-gray-900 underline underline-offset-2"
            href="mailto:legal@dsource.ai"
          >
            legal@dsource.ai
          </a>{" "}
          or by mail at [Company Address]. You can also reach us through the{" "}
          <Link
            className="text-gray-900 underline underline-offset-2"
            href="/help-center#contact"
          >
            Help Center
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
