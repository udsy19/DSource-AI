import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET(_request, { params }) {
  try {
    const { path: imagePath } = await params;

    // Join the path segments
    const fullPath = Array.isArray(imagePath) ? imagePath.join("/") : imagePath;

    // Security: Prevent path traversal
    if (fullPath.includes("..") || path.isAbsolute(fullPath)) {
      return new NextResponse("Invalid image path", { status: 400 });
    }

    // Construct the public file path
    const publicPath = path.join(process.cwd(), "public", fullPath);

    // Security: Ensure the resolved path is within the public directory.
    // Using the path.sep boundary avoids a sibling-prefix bypass (e.g. a
    // "public-secrets" directory sharing the "public" prefix).
    const publicDir = path.resolve(process.cwd(), "public");
    const resolvedPath = path.resolve(publicPath);

    if (
      resolvedPath !== publicDir &&
      !resolvedPath.startsWith(publicDir + path.sep)
    ) {
      return new NextResponse("Invalid image path", { status: 400 });
    }

    // Read the file without blocking the event loop
    let fileBuffer;
    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isFile()) {
        return new NextResponse("Image not found", { status: 404 });
      }
      fileBuffer = await fs.readFile(resolvedPath);
    } catch (_error) {
      return new NextResponse("Image not found", { status: 404 });
    }

    // Get the file extension to determine MIME type
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".avif": "image/avif",
      ".svg": "image/svg+xml",
    };

    const contentType = mimeTypes[ext] || "image/jpeg";

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    // SVGs can carry inline scripts (XSS). Prevent inline execution by
    // forcing a download and locking down the content security policy.
    if (ext === ".svg") {
      headers["Content-Disposition"] = "attachment";
      headers["Content-Security-Policy"] = "default-src 'none'; sandbox";
    }

    // Return the image with proper headers
    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Error serving image", { status: 500 });
  }
}
