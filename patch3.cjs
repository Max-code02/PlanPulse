const fs = require('fs');
let content = fs.readFileSync('src/components/BottomLegalBar.tsx', 'utf8');

const target = `        </a>
        <span className="text-slate-600 font-bold">•</span>
        <a
          id="btn-bottom-left-linktree"
          href="https://linktr.ee/Planpulse"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-slate-500 hover:text-slate-400 transition-colors py-0.5 px-1 rounded hover:bg-slate-800 opacity-60 hover:opacity-100"
          title="PlanPulse Links"
        >
          <span className="font-medium text-[9px]">Links</span>
        </a>`;

content = content.replace(target, '        </a>');
fs.writeFileSync('src/components/BottomLegalBar.tsx', content);
