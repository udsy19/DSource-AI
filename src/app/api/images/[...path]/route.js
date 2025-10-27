import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request, { params }) {
  try {
    const { path: imagePath } = params;

    // Join the path segments
    const fullPath = Array.isArray(imagePath) ? imagePath.join("/") : imagePath;

    // Security: Prevent path traversal
    if (fullPath.includes("..") || path.isAbsolute(fullPath)) {
      return new NextResponse("Invalid image path", { status: 400 });
    }

    // Construct the public file path
    const publicPath = path.join(process.cwd(), "public", fullPath);

    // Security: Ensure the resolved path is within the public directory
    const publicDir = path.resolve(process.cwd(), "public");
    const resolvedPath = path.resolve(publicPath);

    if (!resolvedPath.startsWith(publicDir)) {
      return new NextResponse("Invalid image path", { status: 400 });
    }

    // Check if file exists
    if (!fs.existsSync(publicPath)) {
      return new NextResponse("Image not found", { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(publicPath);

    // Get the file extension to determine MIME type
    const ext = path.extname(publicPath).toLowerCase();
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

    // Return the image with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse("Error serving image", { status: 500 });
  }
}
