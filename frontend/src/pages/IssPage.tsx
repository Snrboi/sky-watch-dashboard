import { PageHeader } from "@/components/common/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { useLocation } from "@/features/location/location-context";
import { AstrosCard } from "@/features/iss/AstrosCard";
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
        description="User to ISS Live Distance"
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Reveal index={0} className="lg:col-span-3">
          <IssMapCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={1}>
          <IssDetailsCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={2} className="lg:col-span-4">
          <AstrosCard className="h-full" />
        </Reveal>
        <Reveal index={3} className="lg:col-span-4">
          <IssPassesCard place={place} />
        </Reveal>
      </div>
    </div>
  );
}
