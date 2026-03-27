import { Metadata } from "next";
import { KnowledgeSearch } from "@/components/knowledge/knowledge-search";

export const metadata: Metadata = {
  title: "Knowledge Commons | Tera",
  description:
    "Browse the Tera Knowledge Commons — verified, experience-sourced knowledge from real human conversations across every domain and geography.",
  openGraph: {
    title: "Tera Knowledge Commons",
    description:
      "Verified knowledge from real human conversations, spanning every domain and geography.",
  },
};

export default function KnowledgeCommonsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Knowledge Commons
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Verified, experience-sourced knowledge from real human conversations.
            Every entry is Tera-verified — sourced from a real person with a real
            problem speaking to a real expert who had solved it.
          </p>
        </div>
      </header>

      {/* Search */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <KnowledgeSearch />
      </main>
    </div>
  );
}
