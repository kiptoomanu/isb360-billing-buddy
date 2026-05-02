import { createFileRoute } from "@tanstack/react-router";
import { ClientsPage } from "@/components/ClientsPage";
export const Route = createFileRoute("/_app/clients/hotspot")({ component: () => <ClientsPage type="hotspot" /> });
