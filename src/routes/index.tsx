import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/desk/app-shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AppShell />;
}
