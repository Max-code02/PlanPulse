const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `        const targetUrl = \`https://v6.db.transport.rest/journeys?from=\${encodeURIComponent(from)}&to=\${encodeURIComponent(to)}&results=\${resultsLimit}\`;
        const response = await fetch(targetUrl, { headers: { 'User-Agent': 'PlanPulse App' } });
        if (!response.ok) throw new Error("DB API returned status: " + response.status);
        data = await response.json();`;

const replacementStr = `        try {
          const targetUrl = \`https://v6.db.transport.rest/journeys?from=\${encodeURIComponent(from)}&to=\${encodeURIComponent(to)}&results=\${resultsLimit}\`;
          const response = await fetch(targetUrl, { headers: { 'User-Agent': 'PlanPulse App' } });
          if (!response.ok) throw new Error("DB API returned status: " + response.status);
          data = await response.json();
        } catch (restError: any) {
          console.warn("Auch v6.db.transport.rest fehlgeschlagen. Nutze Mock-Daten zur Fehlervermeidung...");
          // Fallback zu Mock-Daten, damit die App nicht crasht/blockiert, wenn externe APIs ausfallen
          data = {
            journeys: [
              {
                type: "journey",
                legs: [
                  {
                    origin: { name: "Start (API Demo-Fallback)" },
                    destination: { name: "Ziel (API Demo-Fallback)" },
                    departure: new Date(Date.now() + 10 * 60000).toISOString(),
                    arrival: new Date(Date.now() + 45 * 60000).toISOString(),
                    line: { name: "ICE Demo", mode: "train", product: "nationalExpress" },
                    delay: 0
                  }
                ]
              }
            ]
          };
        }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', content);
