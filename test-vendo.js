import { createClient } from 'db-vendo-client';
import { profile as dbregioguideProfile } from 'db-vendo-client/p/dbregioguide/index.js';
const client = createClient(dbregioguideProfile, 'planpulse');
client.journeys('8098160', '8000261', { results: 1 }).then(j => console.log(j.journeys.length)).catch(console.error);
