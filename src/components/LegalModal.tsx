import React, { useState, useEffect } from "react";
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Scale, 
  Mail, 
  ExternalLink, 
  Search, 
  Lock, 
  Server, 
  Database, 
  Sparkles, 
  Printer, 
  Check, 
  HelpCircle,
  MapPin,
  Edit3,
  Save,
  Globe,
  Copy
} from "lucide-react";

export type LegalTab = "impressum" | "datenschutz";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
  onTabChange?: (tab: LegalTab) => void;
}

export interface AddressInfo {
  name: string;
  street: string;
  city: string;
  country: string;
  email: string;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = "impressum",
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Address State with localStorage persistence
  const [address, setAddress] = useState<AddressInfo>(() => {
    try {
      const saved = localStorage.getItem("planpulse_legal_address");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load saved legal address", e);
    }
    return {
      name: "Max Kistner",
      street: "[Deine Straße und Hausnummer]",
      city: "[Deine PLZ und Ort]",
      country: "Deutschland",
      email: "max.kistner12@gmail.com",
    };
  });

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState<AddressInfo>(address);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery("");
      setIsEditingAddress(false);
    }
  }, [isOpen, initialTab]);

  const handleTabSwitch = (tab: LegalTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = (targetUrl?: string) => {
    const urlToCopy = targetUrl || window.location.origin + "/" + activeTab;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(urlToCopy);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleSaveAddress = () => {
    setAddress(tempAddress);
    try {
      localStorage.setItem("planpulse_legal_address", JSON.stringify(tempAddress));
    } catch (e) {
      console.warn("Failed to save address", e);
    }
    setIsEditingAddress(false);
  };

  return (
    <div 
      id="legal-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="legal-modal-container"
        className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden text-slate-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
              {activeTab === "impressum" ? (
                <Scale className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {activeTab === "impressum" ? "Impressum" : "Datenschutzerklärung"}
                </h2>
                <span className="bg-slate-800 text-slate-400 text-[10px] uppercase font-semibold px-2 py-0.5 rounded border border-slate-700">
                  {activeTab === "impressum" ? "§ 5 DDG / TMG" : "DSGVO / GDPR"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PlanPulse — https://planpulse.mypi.co/{activeTab}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="legal-print-btn"
              onClick={handlePrint}
              title="Drucken / Als PDF speichern"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs hidden sm:flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Drucken</span>
            </button>
            <button
              id="legal-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector & Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              id="legal-tab-impressum"
              onClick={() => handleTabSwitch("impressum")}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "impressum"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Impressum (/impressum)</span>
            </button>

            <button
              id="legal-tab-datenschutz"
              onClick={() => handleTabSwitch("datenschutz")}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "datenschutz"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Datenschutzerklärung (/datenschutz)</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechtstext durchsuchen..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Direct Link Banner */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-5 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Offizielle URL:</span>
            <code className="bg-slate-900 border border-slate-750 px-2 py-0.5 rounded text-blue-300 font-mono text-[11px]">
              https://planpulse.mypi.co/{activeTab}
            </code>
          </div>
          <button
            onClick={() => handleCopyLink(`https://planpulse.mypi.co/${activeTab}`)}
            className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1"
          >
            {copiedUrl === `https://planpulse.mypi.co/${activeTab}` ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Adresse kopieren</span>
              </>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-slate-300">
          
          {/* ===================== TAB 1: IMPRESSUM ===================== */}
          {activeTab === "impressum" && (
            <div className="space-y-6">
              
              {/* Box: Betreiber & ladungsfähige Anschrift gemäß § 5 DDG */}
              <section className="bg-slate-950/60 border border-blue-500/30 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg shadow-black/30">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2 text-white font-bold text-base">
                    <Scale className="w-5 h-5 text-blue-400" />
                    <h3>Betreiber &amp; Verantwortlich nach § 5 DDG (ehemals TMG)</h3>
                  </div>
                  
                  {!isEditingAddress ? (
                    <button
                      onClick={() => {
                        setTempAddress(address);
                        setIsEditingAddress(true);
                      }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-colors"
                      title="Postadresse anpassen"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Anschrift anpassen</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSaveAddress}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-sm font-semibold transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Speichern</span>
                      </button>
                      <button
                        onClick={() => setIsEditingAddress(false)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                      >
                        Abbrechen
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingAddress ? (
                  <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
                    <p className="text-xs text-amber-300 font-medium">
                      Hier kannst du deine ladungsfähige Postanschrift eintragen (wird im Browser gesichert):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Name / Vor- und Nachname</label>
                        <input
                          type="text"
                          value={tempAddress.name}
                          onChange={(e) => setTempAddress({ ...tempAddress, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Straße und Hausnummer</label>
                        <input
                          type="text"
                          value={tempAddress.street}
                          onChange={(e) => setTempAddress({ ...tempAddress, street: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">PLZ und Ort</label>
                        <input
                          type="text"
                          value={tempAddress.city}
                          onChange={(e) => setTempAddress({ ...tempAddress, city: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Land</label>
                        <input
                          type="text"
                          value={tempAddress.country}
                          onChange={(e) => setTempAddress({ ...tempAddress, country: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                        Ladungsfähige Anschrift (§ 5 Abs. 1 Nr. 1 DDG):
                      </span>
                      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                        <p className="font-bold text-white text-base">{address.name}</p>
                        <p className="text-slate-300 flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{address.street}</span>
                        </p>
                        <p className="text-slate-300 pl-5">{address.city}</p>
                        <p className="text-slate-400 pl-5 text-xs">{address.country}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                        Kontakt &amp; Schnelle Kommunikation:
                      </span>
                      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center space-x-2 text-slate-200">
                          <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                          <div>
                            <span className="text-xs text-slate-400 block">E-Mail-Adresse:</span>
                            <a 
                              href={`mailto:${address.email}`} 
                              className="text-blue-400 hover:text-blue-300 underline font-medium"
                            >
                              {address.email}
                            </a>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                          Elektronische Kontaktaufnahme gemäß § 5 Abs. 1 Nr. 2 DDG
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Verantwortlich für den Inhalt nach § 18 MStV */}
              <section className="space-y-2 bg-slate-950/30 border border-slate-800/80 rounded-xl p-4">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV (Medienstaatsvertrag)</span>
                </h4>
                <div className="pl-6 text-slate-300 text-xs sm:text-sm space-y-0.5">
                  <p className="font-semibold text-white">{address.name}</p>
                  <p>{address.street}</p>
                  <p>{address.city}, {address.country}</p>
                  <p>E-Mail: <a href={`mailto:${address.email}`} className="text-blue-400 hover:underline">{address.email}</a></p>
                </div>
              </section>

              {/* EU-Streitschlichtung */}
              <section className="space-y-2">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <span>EU-Streitschlichtung &amp; Verbraucherstreitbeilegung</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
                  <a 
                    href="https://ec.europa.eu/consumers/odr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center space-x-1 font-mono text-xs"
                  >
                    <span>https://ec.europa.eu/consumers/odr</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>.
                  Unsere E-Mail-Adresse finden Sie oben im Impressum.
                </p>
                <p className="text-xs text-slate-400">
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </section>

              {/* Haftung für Inhalte */}
              <section className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm">Haftung für Inhalte</h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                </p>
                <p className="text-xs text-slate-400">
                  Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                </p>
              </section>

              {/* Haftung für Links */}
              <section className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm">Haftung für externe Links</h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Unser Angebot enthält Links zu externen Websites Dritter (z.&nbsp;B. YouTube-Kanäle und Webhooks), auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </section>

              {/* Urheberrecht */}
              <section className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm">Urheberrecht &amp; Lizenzierung</h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
                </p>
              </section>

            </div>
          )}

          {/* ===================== TAB 2: DATENSCHUTZERKLÄRUNG ===================== */}
          {activeTab === "datenschutz" && (
            <div className="space-y-6">

              {/* 1. Datenschutz auf einen Blick */}
              <section className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-slate-800 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3>1. Datenschutz auf einen Blick</h3>
                </div>
                
                <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <p className="font-medium text-slate-200">
                    Allgemeine Hinweise:
                  </p>
                  <p>
                    Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Web-App <strong>PlanPulse</strong> (abrufbar unter https://planpulse.mypi.co) besuchen und nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                  </p>
                </div>
              </section>

              {/* 2. Verantwortliche Stelle */}
              <section className="space-y-2">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span>2. Verantwortliche Stelle für die Datenverarbeitung</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
                </p>
                <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-lg text-xs space-y-1 text-slate-300">
                  <p className="font-semibold text-white">PlanPulse</p>
                  <p>Verantwortlicher: {address.name}</p>
                  <p>{address.street}, {address.city}, {address.country}</p>
                  <p>E-Mail: <a href={`mailto:${address.email}`} className="text-blue-400 hover:underline">{address.email}</a></p>
                </div>
              </section>

              {/* 3. Datenerfassung in PlanPulse */}
              <section className="space-y-3 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span>3. Welche Daten erfassen wir und zu welchem Zweck?</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1">
                    <p className="font-semibold text-white flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span>Stundenplan &amp; Vertretungen</span>
                    </p>
                    <p className="text-slate-400">
                      Ihre eingetragenen Fächer, Lehrerkürzel, Räume und Vertretungshinweise werden zur Erstellung und Darstellung Ihres persönlichen Stundenplans gespeichert.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1">
                    <p className="font-semibold text-white flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Hausaufgaben &amp; Noten</span>
                    </p>
                    <p className="text-slate-400">
                      Hausaufgaben, Fälligkeiten und Notenwerte werden zur Berechnung von Durchschnitten und Terminerinnerungen verarbeitet.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1">
                    <p className="font-semibold text-white flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span>Nutzerkonten (Optional)</span>
                    </p>
                    <p className="text-slate-400">
                      Wenn Sie sich registrieren, wird Ihre E-Mail-Adresse und eine eindeutige Benutzer-ID (UID) via Firebase Authentication gespeichert.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-1">
                    <p className="font-semibold text-white flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>Lokale Einstellungen (LocalStorage)</span>
                    </p>
                    <p className="text-slate-400">
                      Ausgewählte Klassenfilter, Ansichtseinstellungen und UI-Präferenzen werden lokal auf Ihrem Endgerät im Browser gespeichert.
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. Speicherung: Firebase Firestore & Authentication */}
              <section className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span>4. Cloud-Infrastruktur &amp; Datenbank (Google Firebase)</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Wir nutzen für die sichere Cloud-Speicherung und Authentifizierung Dienste von <strong>Google Firebase</strong> (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland).
                </p>
                <p className="text-xs text-slate-400">
                  Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. Durchführung vorvertraglicher Maßnahmen zur Bereitstellung der App-Funktionen) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer stabilen, sicheren Datenbankinfrastruktur).
                </p>
              </section>

              {/* 5. KI-Funktionen (Google Gemini API) */}
              <section className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>5. KI-Assistent &amp; Bilderkennung (Google Gemini)</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Wenn Sie die KI-Funktion zum Einscannen oder Analysieren von Stundenplänen per Bild oder Text nutzen, wird der Bildausschnitt bzw. Textauszug serverseitig an die <strong>Google Gemini API</strong> übermittelt, um daraus strukturierte Stundenplandaten zu extrahieren.
                </p>
                <p className="text-xs text-slate-400">
                  Die Verarbeitung erfolgt streng zweckgebunden im Moment Ihrer Anfrage. Es findet kein dauerhaftes Training von öffentlichen Modellen mit Ihren persönlichen Daten statt.
                </p>
              </section>

              {/* 6. Ihre Rechte nach der DSGVO */}
              <section className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>6. Ihre Rechte als betroffene Person</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit folgende Rechte:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
                  <li><strong>Auskunftsrecht (Art. 15 DSGVO):</strong> Sie können Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten verlangen.</li>
                  <li><strong>Recht auf Berichtigung (Art. 16 DSGVO):</strong> Sie können die unverzügliche Berichtigung unrichtiger Daten verlangen.</li>
                  <li><strong>Recht auf Löschung (Art. 17 DSGVO):</strong> Sie können jederzeit die Löschung Ihrer Daten (z.&nbsp;B. Ihres Accounts und gespeicherter Pläne) verlangen.</li>
                  <li><strong>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</strong> und <strong>Datenübertragbarkeit (Art. 20 DSGVO)</strong>.</li>
                  <li><strong>Widerrufsrecht (Art. 7 Abs. 3 DSGVO):</strong> Sie können eine einmal erteilte Einwilligung zur Datenverarbeitung jederzeit mit Wirkung für die Zukunft widerrufen.</li>
                  <li><strong>Beschwerderecht bei einer Aufsichtsbehörde (Art. 77 DSGVO):</strong> Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.</li>
                </ul>
                <p className="text-xs text-slate-400 pt-1">
                  Zur Ausübung Ihrer Rechte reicht eine formlose Mitteilung per E-Mail an:{" "}
                  <a href={`mailto:${address.email}`} className="text-blue-400 hover:underline">
                    {address.email}
                  </a>.
                </p>
              </section>

              {/* 7. SSL- bzw. TLS-Verschlüsselung */}
              <section className="space-y-2 border-t border-slate-800/80 pt-4">
                <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>7. SSL- bzw. TLS-Verschlüsselung</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine moderne SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://“ auf „https://“ wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
                </p>
              </section>

              {/* Stand */}
              <section className="border-t border-slate-800/80 pt-3 text-xs text-slate-500">
                <p>Stand dieser Datenschutzerklärung: August 2026</p>
              </section>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>DSGVO-konform &amp; transparent</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>PlanPulse — https://planpulse.mypi.co</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleCopyLink()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center space-x-1.5"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kopiert!</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Link kopieren</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/20 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
