const fs = require('fs');
let content = fs.readFileSync('src/components/TransitModal.tsx', 'utf8');

const helper = `
  const safeFetchJson = async (url: string) => {
    const res = await fetch(url, { credentials: "include" });
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error("Netzwerk/WAF-Fehler. Bitte lade die Seite kurz neu.");
    }
    if (!res.ok) {
      throw new Error("API-Verbindungsfehler oder überlastet.");
    }
    return res.json();
  };
`;

content = content.replace('const handleSearchJourneys', helper + '\n  const handleSearchJourneys');

content = content.replace(
  /const res = await fetch\(`\/api\/transit\/locations\?query=\$\{encodeURIComponent\(fromQuery\)\}&results=5`, \{ credentials: "include" \}\);\n\s*if \(!res\.ok\) throw new Error\("API-Verbindungsfehler"\);\n\s*const data = await res\.json\(\);/g,
  'const data = await safeFetchJson(`/api/transit/locations?query=${encodeURIComponent(fromQuery)}&results=5`);'
);

content = content.replace(
  /const res = await fetch\(`\/api\/transit\/locations\?query=\$\{encodeURIComponent\(toQuery\)\}&results=5`, \{ credentials: "include" \}\);\n\s*if \(!res\.ok\) throw new Error\("API-Verbindungsfehler"\);\n\s*const data = await res\.json\(\);/g,
  'const data = await safeFetchJson(`/api/transit/locations?query=${encodeURIComponent(toQuery)}&results=5`);'
);

content = content.replace(
  /const res = await fetch\(`\/api\/transit\/locations\?query=\$\{encodeURIComponent\(fromQuery\)\}&results=1`, \{ credentials: "include" \}\);\n\s*if \(!res\.ok\) throw new Error\("Fehler: Start-Haltestelle konnte über die DB API nicht aufgelöst werden \(API überlastet\)\."\);\n\s*const data = await res\.json\(\);/g,
  'const data = await safeFetchJson(`/api/transit/locations?query=${encodeURIComponent(fromQuery)}&results=1`);'
);

content = content.replace(
  /const res = await fetch\(`\/api\/transit\/locations\?query=\$\{encodeURIComponent\(toQuery\)\}&results=1`, \{ credentials: "include" \}\);\n\s*if \(!res\.ok\) throw new Error\("Fehler: Ziel-Haltestelle konnte über die DB API nicht aufgelöst werden \(API überlastet\)\."\);\n\s*const data = await res\.json\(\);/g,
  'const data = await safeFetchJson(`/api/transit/locations?query=${encodeURIComponent(toQuery)}&results=1`);'
);

content = content.replace(
  /const res = await fetch\(`\/api\/transit\/journeys\?from=\$\{finalFromStation\.id\}&to=\$\{finalToStation\.id\}&results=4`, \{ credentials: "include" \}\);\n\s*if \(!res\.ok\) throw new Error\("Fehler beim Abrufen der Fahrpläne\. Die DB API \(transport\.rest\) ist aktuell offline oder überlastet\."\);\n\s*const data = await res\.json\(\);/g,
  'const data = await safeFetchJson(`/api/transit/journeys?from=${finalFromStation.id}&to=${finalToStation.id}&results=4`);'
);

fs.writeFileSync('src/components/TransitModal.tsx', content);
