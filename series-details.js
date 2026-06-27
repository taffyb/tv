#!/usr/bin/env node
/**
 * tvseries_fetch.js
 *
 * Calls the Anthropic API to retrieve a full episode breakdown for ANY TV series
 * supplied as a command-line argument, and stores the parsed JSON in a variable.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "Black Books"
 *   ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "The Almighty Johnsons"
 *   ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "Fawlty Towers"
 *
 * Requires: Node 18+ (native fetch) — OR install node-fetch for older versions:
 *   npm install node-fetch
 */

// ── Use native fetch (Node 18+) or fall back to node-fetch ──────────────────
let fetchFn;
try {
  fetchFn = fetch; // Node 18+ global
} catch {
  fetchFn = (...args) =>
    import("node-fetch").then(({ default: f }) => f(...args));
}

// ── Read series name from CLI argument ───────────────────────────────────────
const seriesName = process.argv[2]?.trim();

if (!seriesName) {
  console.error(
    "❌  No series name provided.\n\n" +
    "Usage:\n" +
    '  ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "Series Name"\n\n' +
    "Examples:\n" +
    '  ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "Black Books"\n' +
    '  ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "Fawlty Towers"\n' +
    '  ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "The Almighty Johnsons"'
  );
  process.exit(1);
}

// ── Build prompt dynamically from the series name ───────────────────────────
function buildPrompt(name) {
  return `
For the TV Series "${name}" include a full episode breakdown for all episodes.
Return ONLY a valid JSON object — no markdown fences, no preamble, no commentary —
following exactly this structure:

{
  "tv_series": [
    {
      "name": "Show Title",
      "imdbId": "tt0000000",
      "start_date": "dd-MMM-yyyy",
      "end_date": "dd-MMM-yyyy",
      "season_count": 1,
      "seasons": [
        {
          "season_number": 1,
          "season_aired": "dd-MMM-yyyy",
          "episode_count": 1,
          "episodes": [
            {
              "id": "tt0000000",
              "name": "Episode Title",
              "date_aired": "dd-MMM-yyyy",
              "cast": [
                {
                  "imdbId": "nm0000000",
                  "characterName": "Character Name",
                  "actorFirstName": "First",
                  "actorLastName": "Last",
                  "actorFullName": "First Last",
                  "type": "regular" // or "guest star" // or "extra"
                }
              ]
              "writers": [
                {
                    "imdbId": "nm0000000",
                    "name": "Writer Name"
                }
              ],
              "directors": [
                {
                    "imdbId": "nm0000000",
                    "name": "Director Name"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- "name"              : official title of the TV series
- "imdbId"            : IMDB unique series tt ID (e.g. tt0262150)
- "start_date"        : date first episode aired, dd-MMM-yyyy format
- "end_date"          : date final episode aired, dd-MMM-yyyy; use "NA" if still airing
- "season_count"      : total number of seasons aired
- Season "season_aired": date the first episode of that season aired, dd-MMM-yyyy
- Episode "id"        : individual IMDB episode tt ID
- Episode "date_aired": date the episode originally aired, dd-MMM-yyyy
- All dates           : dd-MMM-yyyy format (e.g. 29-Sep-2000)
- Cast "imdbId"       : individual actor nm ID from IMDB (e.g. nm0602836)
- Note the type of cast member: "regular" for series regulars, "guest star" for notable guest stars, and "extra" for minor roles
- Include ALL episodes across ALL seasons — do not omit any
- Include principal cast (series regulars + notable guest stars) for every episode
- Return ONLY the raw JSON object, nothing else — no markdown, no explanation
`.trim();
}

// ── API call ─────────────────────────────────────────────────────────────────
async function fetchSeriesData(name) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY environment variable.\n" +
      `Run:  ANTHROPIC_API_KEY=your_key node tvseries_fetch.js "${name}"`
    );
  }

  console.log(`⏳  Fetching episode data for: "${name}" …`);

  const response = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: buildPrompt(name) }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API request failed — HTTP ${response.status}: ${errorBody}`
    );
  }

  const apiResponse = await response.json();

  // ── Extract text blocks from the response ───────────────────────────────
  const rawText = apiResponse.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!rawText) {
    throw new Error("No text content found in API response.");
  }

  // ── Strip accidental markdown fences and parse ───────────────────────────
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")   // opening fence
    .replace(/\s*```\s*$/i, "")         // closing fence
    .trim();

  let parsedData;
  try {
    parsedData = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error(
      "⚠️  Could not parse response as JSON.\n" +
      "Raw response (first 500 chars):\n" +
      rawText.slice(0, 500)
    );
    throw new Error(`JSON parse error: ${parseErr.message}`);
  }

  return parsedData;
}

// ── Print a human-readable summary ───────────────────────────────────────────
function printSummary(data) {
  const series = data?.tv_series?.[0];
  if (!series) {
    console.log("⚠️  No series data found in response.");
    return;
  }

  const divider = "─".repeat(50);
  console.log(`\n${divider}`);
  console.log(`📺  ${series.name}`);
  console.log(`${divider}`);
  console.log(`🆔  IMDB ID : ${series.imdbId}`);
  console.log(`📅  Aired   : ${series.start_date} → ${series.end_date}`);
  console.log(`🗂️   Seasons : ${series.season_count}`);
  console.log();

  let totalEpisodes = 0;
  for (const season of series.seasons ?? []) {
    const eps = season.episodes?.length ?? 0;
    totalEpisodes += eps;
    console.log(
      `   Season ${String(season.season_number).padStart(2, "0")}` +
      `  (${season.season_aired})` +
      `  —  ${eps} episode${eps !== 1 ? "s" : ""}`
    );
  }
  console.log(`${divider}`);
  console.log(`   Total    :  ${totalEpisodes} episodes`);
  console.log(`${divider}\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // ── tvSeriesData holds the full parsed JSON response ───────────────────
    const tvSeriesData = await fetchSeriesData(seriesName);

    printSummary(tvSeriesData);

    console.log("📄  Full JSON response:\n");
    console.log(JSON.stringify(tvSeriesData, null, 2));

    // tvSeriesData is available here for further use, e.g.:
    //   const first = tvSeriesData.tv_series[0];
    //   const ep1   = first.seasons[0].episodes[0];
    //   console.log(ep1.name, ep1.cast.map(c => c.actorFullName));

    return tvSeriesData;
  } catch (err) {
    console.error(`\n❌  Error: ${err.message}`);
    process.exit(1);
  }
})();
