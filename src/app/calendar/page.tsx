import CalendarApp from "@/components/CalendarApp";

export default function CalendarPage() {
  // Reaching this page at all means the proxy already validated the
  // password cookie — no per-user account system to look up here.
  return <CalendarApp />;
}
