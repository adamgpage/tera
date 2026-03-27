import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, targetTable, targetId, embeddingColumn } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Voyage AI for embeddings
    const voyageApiKey = Deno.env.get("VOYAGE_API_KEY");
    if (!voyageApiKey) {
      return new Response(
        JSON.stringify({ error: "VOYAGE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const voyageResponse = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageApiKey}`,
      },
      body: JSON.stringify({
        input: [text],
        model: "voyage-3",
        input_type: "document",
      }),
    });

    if (!voyageResponse.ok) {
      const errText = await voyageResponse.text();
      return new Response(
        JSON.stringify({ error: `Voyage API error: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const voyageData = await voyageResponse.json();
    const embedding = voyageData.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      return new Response(
        JSON.stringify({ error: "No embedding returned from Voyage API" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If target table and ID provided, store the embedding directly
    if (targetTable && targetId && embeddingColumn) {
      const supabase = createServiceClient();

      // Use raw SQL to update the vector column since supabase-js
      // doesn't handle vector types natively
      const { error: updateError } = await supabase.rpc("update_embedding", {
        p_table: targetTable,
        p_id: targetId,
        p_column: embeddingColumn,
        p_embedding: JSON.stringify(embedding),
      });

      // Fallback: direct update if RPC doesn't exist yet
      if (updateError) {
        const { error: directError } = await supabase
          .from(targetTable)
          .update({ [embeddingColumn]: JSON.stringify(embedding) })
          .eq("id", targetId);

        if (directError) {
          return new Response(
            JSON.stringify({ error: `Failed to store embedding: ${directError.message}` }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ embedding, dimensions: embedding.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
