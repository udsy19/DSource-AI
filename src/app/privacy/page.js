import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | DSource.AI",
  description: "DSource.AI privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="w-full min-h-screen mt-24 sm:mt-32 px-4 sm:px-8 md:px-16 lg:px-24 pb-16 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-gray-600 leading-relaxed">
        This page will host the full DSource.AI privacy policy. For questions
        about how we handle your data, please use{" "}
        <Link
          className="text-gray-900 underline underline-offset-2"
          href="/help-center#contact"
        >
          Contact
        </Link>{" "}
        on the Help Center.
      </p>
    </div>
  );
}
