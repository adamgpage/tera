"use client";

import { TeraGlobe } from "./tera-globe";
import { type GlobeArc, getDomainColor } from "@/lib/globe/data-service";
import { Card } from "@/components/ui/card";

interface PersonalConversation {
  id: string;
  domain: string;
  asker_country: string;
  asker_lat: number;
  asker_lng: number;
  helper_country: string;
  helper_lat: number;
  helper_lng: number;
}

interface PersonalGlobeProps {
  conversations: PersonalConversation[];
  userName: string;
  totalHelped: number;
  totalCountries: number;
  totalDomains: number;
}

export function PersonalGlobe({
  conversations,
  userName,
  totalHelped,
  totalCountries,
  totalDomains,
}: PersonalGlobeProps) {
  const arcs: GlobeArc[] = conversations.map((conv) => ({
    id: conv.id,
    startLat: conv.helper_lat,
    startLng: conv.helper_lng,
    endLat: conv.asker_lat,
    endLng: conv.asker_lng,
    domain: conv.domain,
    color: getDomainColor(conv.domain),
  }));

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">{userName}&apos;s Impact Globe</h3>
        <div className="flex gap-6 mt-2 text-sm text-gray-600">
          <div>
            <span className="font-bold text-gray-900">{totalHelped}</span> people helped
          </div>
          <div>
            <span className="font-bold text-gray-900">{totalCountries}</span> countries
          </div>
          <div>
            <span className="font-bold text-gray-900">{totalDomains}</span> domains
          </div>
        </div>
      </div>

      <TeraGlobe
        personalArcs={arcs}
        interactive={false}
        className="h-[400px]"
      />
    </Card>
  );
}
