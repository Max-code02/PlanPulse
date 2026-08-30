const fs = require('fs');

const videos = [
  { id: '2m0jz2Ol7zA', file: 'video-quick-guide.html', title: 'PlanPulse Quick Guide - Digitaler Stundenplan & KI', tag: 'Stundenplan' },
  { id: '93j80fc5hDs', file: 'video-features.html', title: 'PlanPulse Features & Vertretungsplan Shorts', tag: 'Hausaufgaben' },
  { id: 'uGu4qeZTYKo', file: 'video-short-1.html', title: 'PlanPulse Stundenplan & Vertretungsplan YouTube Short', tag: 'Stundenplan' },
  { id: 'z1NAiYe4DLY', file: 'video-short-2.html', title: 'PlanPulse Stundenplan & Schul-Hub YouTube Short', tag: 'Schulplan' },
  { id: 'BGZyCyJyjpk', file: 'video-short-3.html', title: 'PlanPulse KI Stundenplan YouTube Short Update 3', tag: 'KI Stundenplan' },
  { id: 'o_3LgMRbazE', file: 'video-short-4.html', title: 'PlanPulse Notenrechner & Hausaufgaben YouTube Short Update 4', tag: 'Notenrechner' },
  { id: 'tzqDIFXZwaw', file: 'video-short-5.html', title: 'PlanPulse Schul-Hub & Extras YouTube Short Update 5', tag: 'Schul-Hub' },
  { id: '1MNY68ycki8', file: 'video-short-6.html', title: 'PlanPulse Organisation pur YouTube Short Update 6', tag: 'Organisation' }
];

const staticPaths = [
  // Core files
  { path: 'index.html', priority: '1.0', freq: 'daily' },
  
  // Existing hashes
  { path: '#timetable', priority: '0.9', freq: 'daily' },
  { path: '#school-hub', priority: '0.8', freq: 'daily' },
  { path: '#homework', priority: '0.8', freq: 'daily' },
  { path: '#grades', priority: '0.8', freq: 'weekly' },
  { path: '#ai-assistant', priority: '0.7', freq: 'weekly' },
  { path: '#billing', priority: '0.6', freq: 'monthly' },
  
  // NEW: Expanded deep links / hash routes for SEO footprint
  { path: '#vertretungsplan', priority: '0.9', freq: 'daily' },
  { path: '#stundenplan', priority: '0.9', freq: 'daily' },
  { path: '#notenrechner', priority: '0.8', freq: 'weekly' },
  { path: '#klausuren', priority: '0.8', freq: 'weekly' },
  { path: '#ferien', priority: '0.7', freq: 'monthly' },
  { path: '#ki-scanner', priority: '0.8', freq: 'weekly' },
  { path: '#premium', priority: '0.6', freq: 'monthly' },
  { path: '#einstellungen', priority: '0.5', freq: 'monthly' },
  { path: '#profil', priority: '0.5', freq: 'monthly' },
  { path: '#features', priority: '0.8', freq: 'monthly' },
  { path: '#faq', priority: '0.7', freq: 'monthly' },
  { path: '#support', priority: '0.7', freq: 'monthly' },
  { path: '#contact', priority: '0.7', freq: 'monthly' },
  
  // App Routes & Features
  { path: 'download/apk', priority: '0.85', freq: 'weekly' },
  { path: 'betadrop', priority: '0.85', freq: 'weekly' },
  
  // Mobile Landing Pages (Tippfehler & Korrekte)
  { path: 'handyandroid.html', priority: '0.8', freq: 'weekly' },
  { path: 'handyapple.html', priority: '0.8', freq: 'weekly' },
  { path: 'handyadriod.html', priority: '0.8', freq: 'weekly' },
  { path: 'handyappel.html', priority: '0.8', freq: 'weekly' },
  
  // Legal & Text
  { path: 'impressum.html', priority: '0.6', freq: 'monthly' },
  { path: 'impressium.html', priority: '0.6', freq: 'monthly' },
  { path: 'datenschutz.html', priority: '0.6', freq: 'monthly' },
  
  // Assets / Bots
  { path: 'robust.txt', priority: '0.3', freq: 'monthly' },
  { path: 'robots.txt', priority: '0.3', freq: 'monthly' },
  { path: 'manifest.json', priority: '0.4', freq: 'monthly' }
];

const domains = ['https://planpulse.mypi.co', 'https://plan-pulse-five.vercel.app'];

function buildVideoTag(v) {
  return `    <video:video>
      <video:thumbnail_loc>https://i.ytimg.com/vi/${v.id}/hqdefault.jpg</video:thumbnail_loc>
      <video:title>${v.title.replace(/&/g, '&amp;')}</video:title>
      <video:description>Entdecke PlanPulse für deinen Stundenplan, Vertretungsplan und Schulalltag.</video:description>
      <video:player_loc>https://www.youtube.com/embed/${v.id}</video:player_loc>
      <video:publication_date>2026-08-27T08:00:00+02:00</video:publication_date>
      <video:tag>PlanPulse</video:tag>
      <video:tag>${v.tag}</video:tag>
      <video:tag>Shorts</video:tag>
      <video:category>Education</video:category>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>`;
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
        http://www.google.com/schemas/sitemap-video/1.1
        http://www.google.com/schemas/sitemap-video/1.1/sitemap-video.xsd
        http://www.google.com/schemas/sitemap-image/1.1
        http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">\n`;

for (const domain of domains) {
  xml += `\n  <!-- ==================== Domain: ${domain.split('//')[1]} ==================== -->\n\n`;
  
  // Root URL with all 8 video tags embedded + Image tag
  xml += `  <url>\n    <loc>${domain}/</loc>\n    <lastmod>2026-08-30</lastmod>\n    <changefreq>always</changefreq>\n    <priority>1.0</priority>\n`;
  xml += `    <image:image>\n      <image:loc>${domain}/icon.png</image:loc>\n      <image:title>PlanPulse App Icon</image:title>\n    </image:image>\n`;
  for (const v of videos) {
    xml += buildVideoTag(v) + '\n';
  }
  xml += `  </url>\n\n`;

  // Dedicated video pages
  xml += `  <!-- Dedizierte Video-Wiedergabeseiten -->\n`;
  for (const v of videos) {
    xml += `  <url>\n    <loc>${domain}/${v.file}</loc>\n    <lastmod>2026-08-30</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n`;
    xml += `    <image:image>\n      <image:loc>${domain}/icon.png</image:loc>\n    </image:image>\n`;
    xml += buildVideoTag(v) + '\n';
    xml += `  </url>\n\n`;
  }

  // Other static pages
  xml += `  <!-- App Sections & Unterseiten -->\n`;
  for (const p of staticPaths) {
    xml += `  <url>\n    <loc>${domain}/${p.path}</loc>\n    <lastmod>2026-08-30</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }
}

xml += `</urlset>\n`;
fs.writeFileSync('./public/sitemap.xml', xml);
console.log('Sitemap generated successfully.');
