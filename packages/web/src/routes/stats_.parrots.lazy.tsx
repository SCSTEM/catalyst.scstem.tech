import { createLazyFileRoute } from "@tanstack/react-router";
import { GlowingText } from "@/components/GlowingText";
import {
  type ParrotProfile,
  ParrotProfileCard,
} from "@/components/parrots/ParrotProfileCard";
import { VaporwaveCanvas } from "@/components/parrots/VaporwaveCanvas";

export const Route = createLazyFileRoute("/stats_/parrots")({
  component: RouteComponent,
});

const parrots: ParrotProfile[] = [
  {
    emoji: "60fps_parrot",
    prose: (
      <>
        The crown jewel. Smooth, uncompromising, refuses to drop a frame. Lives
        rent-free in the top right of every page on this site.
      </>
    ),
    firstUsedAt: "Sep 2023",
    firstUser: "carson",
    topUser: "alice",
    totalCount: 412,
  },
  {
    emoji: "party_parrot",
    prose: (
      <>
        The OG. Where it all started. Every parrot that came after owes this
        bird royalties.
      </>
    ),
    firstUsedAt: "Jan 2022",
    firstUser: "bob",
    topUser: "carson",
    totalCount: 1287,
  },
  {
    emoji: "fast_parrot",
    prose: (
      <>
        Same energy as the OG, just with the speed knob cranked. Reserved for
        Friday afternoons.
      </>
    ),
    firstUsedAt: "Mar 2022",
    firstUser: "dana",
    topUser: "ezra",
    totalCount: 643,
  },
  {
    emoji: "sad_parrot",
    prose: (
      <>For when the deploy fails at 4:55pm. The emotional support parrot.</>
    ),
    firstUsedAt: "May 2022",
    firstUser: "frank",
    topUser: "gina",
    totalCount: 198,
  },
];

function RouteComponent() {
  return (
    <>
      <VaporwaveCanvas />
      <div className="flex flex-col gap-4 md:gap-6 mx-auto max-w-2xl p-3 pt-4 md:py-8">
        <GlowingText text="Parrots" className="text-parrot text-4xl mx-auto" />
        {parrots.map((p) => (
          <ParrotProfileCard key={p.emoji} {...p} />
        ))}
      </div>
    </>
  );
}
