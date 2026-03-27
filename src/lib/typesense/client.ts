import Typesense from "typesense";

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "localhost";
const TYPESENSE_PORT = parseInt(process.env.TYPESENSE_PORT || "8108");
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || "http";
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || "";

export const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: TYPESENSE_PORT,
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 5,
  retryIntervalSeconds: 0.1,
  numRetries: 3,
});

/**
 * Knowledge Commons collection schema.
 */
export const COMMONS_COLLECTION = "knowledge_commons";

export const commonsSchema = {
  name: COMMONS_COLLECTION,
  fields: [
    { name: "id", type: "string" as const },
    { name: "summary", type: "string" as const },
    { name: "domain_tags", type: "string[]" as const, facet: true },
    { name: "geographic_tags", type: "string[]" as const, facet: true },
    { name: "seo_slug", type: "string" as const },
    { name: "date_published", type: "int64" as const, sort: true },
    { name: "page_views", type: "int32" as const, sort: true },
    { name: "tera_verified", type: "bool" as const, facet: true },
  ],
  default_sorting_field: "date_published",
};

/**
 * Initialize the Knowledge Commons collection.
 * Idempotent — safe to call on startup.
 */
export async function initCommonsCollection(): Promise<void> {
  try {
    await typesenseClient.collections(COMMONS_COLLECTION).retrieve();
  } catch {
    // Collection doesn't exist — create it
    await typesenseClient.collections().create(commonsSchema);
    console.log("Created Typesense collection:", COMMONS_COLLECTION);
  }
}

/**
 * Index a Knowledge Commons entry in Typesense.
 */
export async function indexCommonsEntry(entry: {
  id: string;
  summary: string;
  domain_tags: string[];
  geographic_tags: string[];
  seo_slug: string;
  date_published: Date;
  tera_verified: boolean;
}): Promise<void> {
  await typesenseClient
    .collections(COMMONS_COLLECTION)
    .documents()
    .upsert({
      id: entry.id,
      summary: entry.summary,
      domain_tags: entry.domain_tags,
      geographic_tags: entry.geographic_tags,
      seo_slug: entry.seo_slug,
      date_published: Math.floor(entry.date_published.getTime() / 1000),
      page_views: 0,
      tera_verified: entry.tera_verified,
    });
}

/**
 * Search the Knowledge Commons.
 */
export async function searchCommons(params: {
  query: string;
  domainFilter?: string;
  geographyFilter?: string;
  page?: number;
  perPage?: number;
}) {
  const { query, domainFilter, geographyFilter, page = 1, perPage = 20 } = params;

  const filterParts: string[] = [];
  if (domainFilter) {
    filterParts.push(`domain_tags:=[${domainFilter}]`);
  }
  if (geographyFilter) {
    filterParts.push(`geographic_tags:=[${geographyFilter}]`);
  }

  const result = await typesenseClient
    .collections(COMMONS_COLLECTION)
    .documents()
    .search({
      q: query || "*",
      query_by: "summary,domain_tags,geographic_tags",
      filter_by: filterParts.length > 0 ? filterParts.join(" && ") : undefined,
      sort_by: query ? "_text_match:desc,page_views:desc" : "date_published:desc",
      page,
      per_page: perPage,
      highlight_full_fields: "summary",
    });

  return {
    entries: (result.hits || []).map((hit) => ({
      ...hit.document,
      highlight: hit.highlight,
    })),
    totalFound: result.found,
    page,
    totalPages: Math.ceil((result.found || 0) / perPage),
  };
}

/**
 * Increment page views for a Knowledge Commons entry.
 */
export async function incrementPageViews(id: string): Promise<void> {
  try {
    const doc = await typesenseClient
      .collections(COMMONS_COLLECTION)
      .documents(id)
      .retrieve();

    await typesenseClient
      .collections(COMMONS_COLLECTION)
      .documents(id)
      .update({
        page_views: ((doc as Record<string, unknown>).page_views as number || 0) + 1,
      });
  } catch {
    // Entry may not exist yet — ignore
  }
}
