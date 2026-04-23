import Link from "next/link";

export const metadata = {
  title: "Terms of Service | DSource.AI",
  description: "DSource.AI terms of service",
};

export default function TermsPage() {
  return (
    <div className="w-full min-h-screen mt-24 sm:mt-32 px-4 sm:px-8 md:px-16 lg:px-24 pb-16 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-gray-600 leading-relaxed">
        This page will host the full DSource.AI terms of service. If you need
        help, visit our{" "}
        <Link
          className="text-gray-900 underline underline-offset-2"
          href="/help-center"
        >
          Help Center
        </Link>
        .
      </p>
    </div>
  );
}
