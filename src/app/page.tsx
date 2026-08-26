import { redirect } from "next/navigation";

export default function RootPage() {
  // The proxy (middleware) sends unauthenticated visitors to /login.
  redirect("/calendar");
}
