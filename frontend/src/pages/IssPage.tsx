import { PageHeader } from "@/components/common/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { useLocation } from "@/features/location/location-context";
import { IssDetailsCard } from "@/features/iss/IssDetailsCard";
import { IssMapCard } from "@/features/iss/IssMapCard";
import { IssPassesCard } from "@/features/iss/IssPassesCard";

export default function IssPage() {
  const { place } = useLocation();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Live"
        title="ISS tracker"
        description={`The position refreshes every 5 seconds. Passes are calculated for ${place.name}.`}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal index={0} className="lg:col-span-2">
          <IssMapCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={1}>
          <IssDetailsCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={2} className="lg:col-span-3">
          <IssPassesCard place={place} />
        </Reveal>
      </div>
    </div>
  );
}
