import Link from "next/link";

export const metadata = {
  title: "How It Works | DSource.AI",
  description:
    "Learn how the DSource.AI material finder turns a room photo into matched materials, visualizations, and specs.",
};

const steps = [
  {
    title: "Upload a room photo",
    description:
      "Start with a photo of the space you're designing. Our AI reads the room to understand surfaces, lighting, and existing materials.",
  },
  {
    title: "Get AI-matched materials",
    description:
      "DSource.AI detects the materials in your image and surfaces matching products from the marketplace, so you can compare real options in seconds.",
  },
  {
    title: "Visualize swaps",
    description:
      "Preview how different materials look in your space before you commit, helping you move from inspiration to a confident decision.",
  },
  {
    title: "Build your spec",
    description:
      "Save the products you like and assemble them into a shareable specification, keeping every detail organized in one place.",
  },
];

export default function Tutorial() {
  return (
    <div className="w-full min-h-screen mt-24 sm:mt-32 md:mt-40 px-4 sm:px-8 md:px-16 lg:px-24 pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            How It Works
          </h1>
          <p className="text-gray-600 text-base sm:text-lg mt-3">
            From a single room photo to a finished material spec in a few steps.
          </p>
        </div>

        <ol className="space-y-6 sm:space-y-8">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 sm:gap-6 bg-white rounded-2xl p-5 sm:p-6 shadow-sm"
            >
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg sm:text-xl">
                {index + 1}
              </div>
              <div>
                <h2 className="font-bold text-lg sm:text-xl mb-1.5">
                  {step.title}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="text-center mt-10 sm:mt-14">
          <Link
            href="/help-center"
            className="text-gray-900 underline underline-offset-2"
          >
            Need more help? Visit the Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
