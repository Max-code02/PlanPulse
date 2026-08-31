const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = content.substring(content.indexOf('// Transit API Proxy (to avoid CORS / Failed to fetch on client side)'), content.indexOf('app.get("/api/transit/journeys"') + 1000);

// Just replace everything from // Transit API Proxy down to the end of the journeys route
const startIndex = content.indexOf('// Transit API Proxy (to avoid CORS / Failed to fetch on client side)');
const endString = 'res.status(503).json({ error: "Fehler beim Abrufen der Fahrpläne" });\n    }\n  });';
const endIndex = content.indexOf(endString) + endString.length;

if (startIndex === -1 || content.indexOf(endString) === -1) {
  console.log("Not found!");
  process.exit(1);
}

const replacement = `// Transit API Proxy (to avoid CORS / Failed to fetch on client side)
  let vendoClient: any = null;
  let allStations: any[] | null = null;

  async function loadStations() {
    if (allStations) return allStations;
    allStations = [];
    try {
      const { readStations } = await import('db-stations');
      for await (const station of readStations()) {
        allStations.push(station);
      }
      console.log("PlanPulse Transit: Geladene Offline-Haltestellen (db-stations):", allStations.length);
    } catch (e) {
      console.error("Failed to load db-stations:", e);
    }
    return allStations;
  }
  
  async function getVendoClient() {
    if (vendoClient) return vendoClient;
    try {
      const { createClient } = await import('db-vendo-client');
      const { profile: dbnavProfile } = await import('db-vendo-client/p/dbnav/index.js');
      vendoClient = createClient(dbnavProfile, 'planpulse-backend-api');
    } catch (e) {
      console.error("Failed to init vendo client:", e);
    }
    return vendoClient;
  }

  // Preload stations in background
  loadStations();

  app.get("/api/transit/locations", async (req, res) => {
    try {
      const query = (req.query.query || "").toString().toLowerCase();
      const resultsLimit = parseInt((req.query.results as string) || "5", 10);
      if (!query) return res.status(400).json({ error: "Query is required" });
      
      const stations = await loadStations();
      if (stations && stations.length > 0) {
        // Filter locally to avoid API blocks and Rate Limits
        const matches = stations
          .filter(s => s.name.toLowerCase().includes(query))
          .slice(0, resultsLimit);
        return res.json(matches);
      }
      
      // Fallback if local stations failed to load
      const targetUrl = \`https://v6.db.transport.rest/locations?query=\${encodeURIComponent(query)}&results=\${resultsLimit}\`;
      const response = await fetch(targetUrl, { headers: { 'User-Agent': 'PlanPulse App' } });
      if (!response.ok) throw new Error("DB API returned status: " + response.status);
      res.json(await response.json());
    } catch (err: any) {
      console.error("Transit locations error:", err.message);
      res.status(503).json({ error: "Fehler beim Abrufen der Haltestellen" });
    }
  });

  app.get("/api/transit/journeys", async (req, res) => {
    try {
      const from = req.query.from as string;
      const to = req.query.to as string;
      const resultsLimit = parseInt((req.query.results as string) || "4", 10);
      if (!from || !to) return res.status(400).json({ error: "From and To are required" });

      let data;
      try {
        const client = await getVendoClient();
        if (client) {
          console.log("Versuche Abfrage via DB Vendo...");
          data = await client.journeys(from, to, { results: resultsLimit });
        } else {
          throw new Error("Vendo Client not initialized");
        }
      } catch (vendoError: any) {
        console.warn("DB Vendo fehlgeschlagen oder Rate-Limit erreicht. Wechsle zu Fallback...", vendoError.message);
        const targetUrl = \`https://v6.db.transport.rest/journeys?from=\${encodeURIComponent(from)}&to=\${encodeURIComponent(to)}&results=\${resultsLimit}\`;
        const response = await fetch(targetUrl, { headers: { 'User-Agent': 'PlanPulse App' } });
        if (!response.ok) throw new Error("DB API returned status: " + response.status);
        data = await response.json();
      }
      
      res.json(data);
    } catch (err: any) {
      console.error("Transit journeys error:", err.message);
      res.status(503).json({ error: "Fehler beim Abrufen der Fahrpläne" });
    }
  });`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('server.ts', content);
