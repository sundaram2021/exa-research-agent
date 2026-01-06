import Exa from "exa-js";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string | null;
};

export async function search(
  apiKey: string,
  queries: string[]
): Promise<SearchResult[]> {
  const exa = new Exa(apiKey);

  const results = await Promise.all(
    queries.map(async (query) => {
      try {
        const response = await exa.search(query, {
          numResults: 5,
          type: "auto",
          contents: {
            text: { maxCharacters: 800 },
          },
        });
        return response.results || [];
      } catch {
        return [];
      }
    })
  );

  // Flatten and dedupe by URL
  const seen = new Set<string>();
  const allResults: SearchResult[] = [];

  for (const batch of results) {
    for (const r of batch) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        allResults.push({
          title: r.title || "Untitled",
          url: r.url,
          snippet: (r as { text?: string }).text || "",
          publishedDate:
            (r as { publishedDate?: string }).publishedDate || null,
        });
      }
    }
  }

  return allResults.slice(0, 10);
}
