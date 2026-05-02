import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

function Stub({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <Construction className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Coming soon — this section is part of the next iteration.</p>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_app/$")({
  component: () => {
    const splat = Route.useParams()._splat ?? "";
    const title = splat.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Page";
    return <Stub title={title} />;
  },
});
