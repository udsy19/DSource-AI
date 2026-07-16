import { redirect } from "next/navigation";

// The folio cabinet lives on the studio home now — this index only redirects.
// Folio detail pages (/folios/[id]) remain.
export default function FoliosIndex() {
  redirect("/studio");
}
