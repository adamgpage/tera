import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ domain: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("knowledge_commons_entries")
    .select("anonymised_summary, domain_tags, geographic_context_tags")
    .eq("seo_slug", slug)
    .single();

  if (!entry) {
    return { title: "Not Found | Tera Knowledge Commons" };
  }

  const e = entry as Record<string, unknown>;
  const domains = (e.domain_tags as string[]) || [];
  const summary = (e.anonymised_summary as string) || "";
  const title = `${domains.join(", ")} — Tera Knowledge Commons`;
  const description = summary.slice(0, 160);

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function KnowledgeEntryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("knowledge_commons_entries")
    .select("*")
    .eq("seo_slug", slug)
    .single();

  if (!entry) {
    notFound();
  }

  const e = entry as Record<string, unknown>;
  const domains = (e.domain_tags as string[]) || [];
  const geoTags = (e.geographic_context_tags as string[]) || [];
  const summary = (e.anonymised_summary as string) || "";
  const datePublished = e.date_published
    ? new Date(e.date_published as string).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const pageViews = (e.page_views as number) || 0;

  // Increment page view (non-blocking)
  supabase
    .from("knowledge_commons_entries")
    .update({ page_views: pageViews + 1 })
    .eq("id", e.id)
    .then(() => {});

  return (
    <div className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Tera-verified badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium border border-teal-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Tera Verified
          </span>
          <span className="text-sm text-gray-500">{datePublished}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {domains.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {geoTags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Summary content */}
        <div className="prose prose-lg max-w-none">
          {summary.split("\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              This knowledge entry was created from a real conversation between a
              person with a problem and an expert who had solved it. Both parties
              consented to its publication.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
            <h3 className="font-semibold text-lg mb-2">
              Have a similar problem?
            </h3>
            <p className="text-gray-600 mb-4">
              Tera connects you with someone who has relevant direct experience.
            </p>
            <a
              href="/requests/new"
              className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              Describe Your Problem
            </a>
          </div>
        </footer>
      </article>

      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: domains.join(", "),
            description: summary.slice(0, 160),
            datePublished: e.date_published,
            publisher: {
              "@type": "Organization",
              name: "Tera",
              url: "https://tera.com",
            },
          }),
        }}
      />
    </div>
  );
}
