import React, { useState } from "react";
import { ArrowLeft, Mail, MapPin, Scale, ShieldCheck, ExternalLink, Edit3, Save, Printer } from "lucide-react";

interface ImpressumPageProps {
  onNavigateBack: () => void;
  onNavigateDatenschutz: () => void;
}

export const ImpressumPage: React.FC<ImpressumPageProps> = ({
  onNavigateBack,
  onNavigateDatenschutz,
}) => {
  // Address State with localStorage persistence
  const [address, setAddress] = useState(() => {
    try {
      const saved = localStorage.getItem("planpulse_legal_address");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      name: "[Vor- und Nachname des Betreibers]",
      street: "[Straße und Hausnummer]",
      city: "[PLZ und Ort]",
      country: "Deutschland",
      email: "blockcom130@gmail.com",
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempAddress, setTempAddress] = useState(address);

  const handleSave = () => {
    setAddress(tempAddress);
    try {
      localStorage.setItem("planpulse_legal_address", JSON.stringify(tempAddress));
    } catch {
      // ignore
    }
    setIsEditing(false);
  };

  return (
    <div id="impressum-page" className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-slate-800">
        <button
          id="impressum-back-top-btn"
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
            id="impressum-to-datenschutz-btn"
            onClick={onNavigateDatenschutz}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors text-xs font-semibold"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zur Datenschutzerklärung →</span>
          </button>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl space-y-8 text-slate-300">
        
        {/* Header */}
        <div className="space-y-2 border-b border-slate-800 pb-5">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Rechtliche Angaben gemäß § 5 DDG</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Impressum
          </h1>
          <p className="text-xs text-slate-400">
            Angaben für die Webanwendung <strong>PlanPulse</strong> (https://planpulse.mypi.co)
          </p>
        </div>

        {/* 1. Betreiber & ladungsfähige Anschrift */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Betreiber &amp; Verantwortlich nach § 5 DDG:
            </h2>
            {!isEditing ? (
              <button
                onClick={() => {
                  setTempAddress(address);
                  setIsEditing(true);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-colors"
                title="Adresse anpassen"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Adresse anpassen</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Speichern</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="p-4 bg-slate-950/80 border border-slate-750 rounded-xl space-y-3">
              <p className="text-xs text-amber-300 font-medium">
                Passe hier deine ladungsfähige Anschrift an:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Name</label>
                  <input
                    type="text"
                    value={tempAddress.name}
                    onChange={(e) => setTempAddress({ ...tempAddress, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Straße &amp; Hausnummer</label>
                  <input
                    type="text"
                    value={tempAddress.street}
                    onChange={(e) => setTempAddress({ ...tempAddress, street: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">PLZ &amp; Ort</label>
                  <input
                    type="text"
                    value={tempAddress.city}
                    onChange={(e) => setTempAddress({ ...tempAddress, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">E-Mail</label>
                  <input
                    type="email"
                    value={tempAddress.email}
                    onChange={(e) => setTempAddress({ ...tempAddress, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-sm">
              <p className="text-white font-bold text-base">{address.name}</p>
              <p className="flex items-center space-x-2 text-slate-300">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{address.street}</span>
              </p>
              <p className="pl-6 text-slate-300">{address.city}</p>
              <p className="pl-6 text-slate-400 text-xs">{address.country}</p>
            </div>
          )}
        </section>

        {/* 2. Kontakt & Support */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Kontakt &amp; Support:</h2>
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-slate-400">E-Mail:</span>
              <a 
                href={`mailto:${address.email}`} 
                className="text-blue-400 hover:text-blue-300 underline font-semibold"
              >
                {address.email}
              </a>
            </div>
            <p className="text-xs text-slate-400 pt-1 border-t border-slate-800">
              Elektronische Kontaktaufnahme gemäß § 5 Abs. 1 Nr. 2 DDG
            </p>
          </div>
        </section>

        {/* 3. Verantwortlich für den Inhalt */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
          </h2>
          <p className="text-sm text-slate-300">
            {address.name}<br />
            {address.street}<br />
            {address.city}, {address.country}<br />
            E-Mail: <a href={`mailto:${address.email}`} className="text-blue-400 hover:underline">{address.email}</a>
          </p>
        </section>

        {/* 4. EU-Streitschlichtung */}
        <section className="space-y-2 border-t border-slate-800/80 pt-6">
          <h2 className="text-base font-bold text-white">EU-Streitschlichtung</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a 
              href="https://ec.europa.eu/consumers/odr" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:underline inline-flex items-center space-x-1"
            >
              <span>https://ec.europa.eu/consumers/odr</span>
              <ExternalLink className="w-3 h-3" />
            </a>.<br />
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
          <p className="text-xs text-slate-400">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        {/* 5. Haftung für Inhalte & Links */}
        <section className="space-y-4 border-t border-slate-800/80 pt-6 text-xs sm:text-sm">
          <div className="space-y-1">
            <h3 className="font-semibold text-white">Haftung für Inhalte</h3>
            <p className="text-slate-300">
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold text-white">Haftung für externe Links</h3>
            <p className="text-slate-300">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold text-white">Urheberrecht</h3>
            <p className="text-slate-300">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </div>
        </section>

      </div>

      {/* Bottom Back Bar */}
      <div className="flex justify-center pt-8 pb-12">
        <button
          id="impressum-back-bottom-btn"
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
