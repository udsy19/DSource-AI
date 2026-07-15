import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { sanitizeString } from "@/utils/product-normalize";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firstName = sanitizeString(body.firstName);
  const lastName = sanitizeString(body.lastName);
  const email = sanitizeString(body.email);
  const country = sanitizeString(body.country);
  const message = sanitizeString(body.message);

  if (!firstName || !lastName || !email || !country || !message) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message must be 5000 characters or fewer" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const { error } = await supabase.from("contact_messages").insert({
    first_name: firstName,
    last_name: lastName,
    email,
    country,
    message,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json(
      { error: "Failed to submit message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
