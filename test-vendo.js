import { createClient } from 'db-vendo-client';
import { profile as dbnavProfile } from 'db-vendo-client/p/dbnav/index.js';

const client = createClient(dbnavProfile, 'test-app-' + Math.random());
async function run() {
  const journeys = await client.journeys('8098160', '8000261', { results: 1 });
  console.log("Journeys length:", journeys.journeys.length);
}
run().catch(console.error);
