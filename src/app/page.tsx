import { redirect } from "next/navigation";

// Temporary until the marketing homepage ships (Phase 2).
export default function Home() {
  redirect("/login");
}
