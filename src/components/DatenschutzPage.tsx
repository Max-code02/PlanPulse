import React from "react";
import { ArrowLeft, ShieldCheck, Lock, Database, Server, Sparkles, Scale, Printer, ExternalLink, Mail } from "lucide-react";

interface DatenschutzPageProps {
  onNavigateBack: () => void;
  onNavigateImpressum: () => void;
}

export const DatenschutzPage: React.FC<DatenschutzPageProps> = ({
  onNavigateBack,
  onNavigateImpressum,
}) => {
  // Retrieve saved address if customized
  const [responsibleName] = React.useState(() => {
    try {
      const saved = localStorage.getItem("planpulse_legal_address");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      }
    } catch {
      // ignore
    }
    return "[Vor- und Nachname des Betreibers]";
  });
  return (
    <div id="datenschutz-page" className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-slate-800">
        <button
          id="datenschutz-back-top-btn"
          onClick={onNavigateBack}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 transition-colors text-sm font-semibold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>← Zurück zur App</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs flex items-center space-x-1.5 transition-colors"
            title="Seite drucken"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Drucken</span>
          </button>

          <button
            id="datenschutz-to-impressum-btn"
            onClick={onNavigateImpressum}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-400 border border-slate-800 transition-colors text-xs font-semibold"
          >
            <Scale className="w-4 h-4 text-blue-400" />
            <span>Zum Impressum →</span>
          </button>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl space-y-8 text-slate-300">
        
        {/* Header */}
        <div className="space-y-2 border-b border-slate-800 pb-5">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Datenschutz-Grundverordnung (DSGVO / GDPR)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Datenschutzerklärung
          </h1>
          <p className="text-xs text-slate-400">
            Informationen über die Erhebung und Verarbeitung personenbezogener Daten in <strong>PlanPulse</strong>
          </p>
        </div>

        {/* 1. Datenschutz auf einen Blick */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>1. Datenschutz auf einen Blick</span>
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website <strong>PlanPulse</strong> (https://planpulse.mypi.co) besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
          </p>
        </section>

        {/* 2. Verantwortliche Stelle */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Lock className="w-5 h-5 text-blue-400" />
            <span>2. Verantwortliche Stelle</span>
          </h2>
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-sm">
            <p className="font-bold text-white">PlanPulse</p>
            <p>Verantwortlicher: {responsibleName}</p>
            <p className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-slate-400">E-Mail:</span>
              <a href="mailto:blockcom130@gmail.com" className="text-blue-400 hover:underline font-medium">
                blockcom130@gmail.com
              </a>
            </p>
          </div>
        </section>

        {/* 3. Datenerfassung in PlanPulse */}
        <section className="space-y-4 border-t border-slate-800/80 pt-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span>3. Datenerfassung in dieser App</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
              <h3 className="font-semibold text-white text-sm">Stundenplan &amp; Vertretungen</h3>
              <p className="text-slate-400 text-xs">
                Die von Ihnen eingegebenen Fächer, Räume und Notizen werden zur Anzeige und Organisation Ihres Stundenplans verarbeitet.
              </p>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
              <h3 className="font-semibold text-white text-sm">Hausaufgaben &amp; Noten</h3>
              <p className="text-slate-400 text-xs">
                Aufgaben, Fälligkeiten und Notenwerte werden zur Berechnung von Durchschnitten und Fristenanzeigen verarbeitet.
              </p>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
              <h3 className="font-semibold text-white text-sm">Benutzerkonto (Optional)</h3>
              <p className="text-slate-400 text-xs">
                Bei freiwilliger Registrierung wird Ihre E-Mail-Adresse zur geräteübergreifenden Synchronisation gespeichert.
              </p>
            </div>

            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5">
              <h3 className="font-semibold text-white text-sm">Lokaler Speicher (LocalStorage)</h3>
              <p className="text-slate-400 text-xs">
                Ansichtseinstellungen und Klassenfilter werden direkt auf Ihrem Endgerät im Browser gespeichert.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Firebase Cloud Speicherung */}
        <section className="space-y-3 border-t border-slate-800/80 pt-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-400" />
            <span>4. Hosting &amp; Cloud-Datenbank (Google Firebase)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Für die Speicherung von Stundenplandaten und Nutzerauthentifizierung nutzen wir Google Firebase (Google Ireland Limited, Dublin, Irland). Die Datenübertragung erfolgt verschlüsselt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. Bereitstellung der App-Dienste).
          </p>
        </section>

        {/* 5. Google Gemini KI */}
        <section className="space-y-3 border-t border-slate-800/80 pt-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>5. KI-Funktionen (Google Gemini API)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Wenn Sie die optionale KI-Funktion zum Scannen von Stundenplänen nutzen, werden Bild- oder Textausschnitte zur einmaligen Strukturierung an die Google Gemini API übertragen. Die Daten werden ausschließlich für Ihre Anfrage verwendet.
          </p>
        </section>

        {/* 6. Ihre Rechte nach der DSGVO */}
        <section className="space-y-3 border-t border-slate-800/80 pt-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>6. Ihre Rechte (Auskunft, Löschung &amp; Widerruf)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Sie haben nach der DSGVO jederzeit das Recht:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-300">
            <li>Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu erhalten (Art. 15 DSGVO).</li>
            <li>Die Berichtigung unrichtiger Daten zu verlangen (Art. 16 DSGVO).</li>
            <li>Die unverzügliche Löschung Ihrer Daten zu verlangen (Art. 17 DSGVO).</li>
            <li>Eine erteilte Einwilligung jederzeit zu widerrufen (Art. 7 Abs. 3 DSGVO).</li>
            <li>Sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO).</li>
          </ul>
          <p className="text-xs text-slate-400 pt-2">
            Kontaktieren Sie uns dazu einfach per E-Mail an:{" "}
            <a href="mailto:blockcom130@gmail.com" className="text-blue-400 hover:underline">
              blockcom130@gmail.com
            </a>
          </p>
        </section>

        {/* 7. SSL-Verschlüsselung */}
        <section className="space-y-2 border-t border-slate-800/80 pt-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>7. SSL- bzw. TLS-Verschlüsselung</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung eine moderne SSL- bzw. TLS-Verschlüsselung mit HTTPS.
          </p>
        </section>

        {/* Stand */}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
          Stand: August 2026
        </div>

      </div>

      {/* Bottom Back Bar */}
      <div className="flex justify-center pt-8 pb-12">
        <button
          id="datenschutz-back-bottom-btn"
          onClick={onNavigateBack}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zur Stundenplan-App</span>
        </button>
      </div>
    </div>
  );
};
