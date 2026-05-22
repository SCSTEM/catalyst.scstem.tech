import { createLazyFileRoute } from "@tanstack/react-router";
import { GlowingText } from "@/components/GlowingText";
import { ParrotProfileCard } from "@/components/parrots/ParrotProfileCard";
import { VaporwaveCanvas } from "@/components/parrots/VaporwaveCanvas";
import { useParrotEmojis } from "@/hooks/queries";

export const Route = createLazyFileRoute("/stats_/parrots")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: parrots } = useParrotEmojis();

  const visibleParrots = (parrots ?? [])
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <VaporwaveCanvas />
      <div className="flex flex-col gap-6 mx-auto md:max-w-2xl py-4 px-2 md:py-8">
        <GlowingText text="Parrots" className="text-parrot text-4xl mx-auto" />
        {visibleParrots.map((p) => (
          <ParrotProfileCard key={p.name} emoji={p.name} />
        ))}
      </div>
    </>
  );
}
