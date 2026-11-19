import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/vip")({
  component: () => <Navigate to="/clubs" />,
});
