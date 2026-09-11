import React, { useState } from "react";
import { 
  Lock, 
  Mail, 
  LogOut, 
  KeyRound, 
  Check, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Database,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Crown
} from "lucide-react";
import { AuthUser } from "../types";
import { safeFetchJson } from "../lib/api";
import { auth, db } from "../lib/firebase";
import { executeRecaptcha, verifyRecaptchaWithBackend } from "../lib/recaptcha";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onAuthSuccess: (user: AuthUser, token: string) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
}) => {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    if (!password || password.length < 5) {
      setError("Das Passwort muss mindestens 5 Zeichen lang sein.");
      return;
    }
    if (mode === "register" && password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      // Execute Google reCAPTCHA Enterprise check
      const recaptchaAction = mode === "register" ? "REGISTER" : mode === "reset" ? "PASSWORD_RESET" : "LOGIN";
      try {
        const recaptchaToken = await executeRecaptcha(recaptchaAction);
        if (recaptchaToken) {
          // Send response token to backend verification endpoint
          verifyRecaptchaWithBackend(recaptchaToken, recaptchaAction).catch(() => {});
        }
      } catch (rcErr) {
        console.warn("[reCAPTCHA] Token retrieval:", rcErr);
      }

      let firebaseUser: any = null;
      let token = "";
      
      if (mode === "register") {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        firebaseUser = userCredential.user;
        token = firebaseUser.uid;
        const userObj: AuthUser = {
          id: firebaseUser.uid,
          email: cleanEmail,
          planType: "premium",
          role: cleanEmail === "max.kistner12@gmail.com" ? "admin" : "user",
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", firebaseUser.uid), userObj);
        
        setSuccessMsg("Konto erfolgreich erstellt! Du kannst dich jetzt einloggen.");
        setTimeout(() => {
          setMode("login");
          setPassword("");
          setPasswordConfirm("");
          setSuccessMsg(null);
        }, 1500);

      } else if (mode === "login") {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        firebaseUser = userCredential.user;
        token = firebaseUser.uid;
        
        let userObj: AuthUser = {
          id: firebaseUser.uid,
          email: cleanEmail,
          planType: "premium",
          role: cleanEmail === "max.kistner12@gmail.com" ? "admin" : "user",
          createdAt: new Date().toISOString()
        };

        // Ensure Firestore document exists if they were registered externally
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            await setDoc(userDocRef, userObj);
          } else {
            const data = userSnap.data();
            userObj = { ...userObj, ...data, id: firebaseUser.uid };
          }
        } catch (e) {
          console.error("Error ensuring Firestore user doc:", e);
        }
        
        setSuccessMsg("Erfolgreich eingeloggt!");
        
        setTimeout(() => {
          onAuthSuccess(userObj, token);
          onClose();
          setSuccessMsg(null);
        }, 1000);

      } else if (mode === "reset") {
        await sendPasswordResetEmail(auth, cleanEmail);
        setSuccessMsg("Reset-E-Mail gesendet! Bitte prüfe deinen Posteingang.");
        
        setTimeout(() => {
          setMode("login");
          setPassword("");
          setSuccessMsg(null);
        }, 2000);
      }
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("E-Mail oder Passwort falsch.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Diese E-Mail ist bereits registriert.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Anmeldung in Firebase deaktiviert! Bitte aktiviere Email/Passwort in der Firebase Console.");
      } else {
        setError(err.message || "Es ist ein Fehler aufgetreten.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      try {
        const recaptchaToken = await executeRecaptcha("GOOGLE_LOGIN");
        if (recaptchaToken) {
          verifyRecaptchaWithBackend(recaptchaToken, "GOOGLE_LOGIN").catch(() => {});
        }
      } catch (rcErr) {
        console.warn("[reCAPTCHA] Google login token retrieval:", rcErr);
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userObj: AuthUser = {
        id: result.user.uid,
        email: result.user.email || "",
        planType: "premium",
        role: result.user.email === "max.kistner12@gmail.com" ? "admin" : "user",
        createdAt: new Date().toISOString()
      };

      // Set user document in firestore just in case it doesn't exist
      await setDoc(doc(db, "users", result.user.uid), userObj, { merge: true });

      setSuccessMsg("Erfolgreich mit Google eingeloggt!");
      
      // Call onAuthSuccess with a dummy token for local storage since we rely on Firebase now
      setTimeout(() => {
        onAuthSuccess(userObj, result.user.uid);
        onClose();
        setSuccessMsg(null);
      }, 1000);

    } catch (err: any) {
      setError(err.message || "Google Login fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {currentUser ? "Benutzerkonto & Datenspeicher" : "Anmelden & Synchronisieren"}
              </h3>
              <p className="text-xs text-slate-400">
                {currentUser 
                  ? "Alle deine Stundenpläne, Noten und Vorlagen sind dauerhaft synchronisiert." 
                  : "Sicher mit E-Mail & Passwort einloggen oder registrieren."}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">

          {/* If already logged in */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Angemeldet als:</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Aktiv & Gespeichert</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="break-all">{currentUser.email}</span>
                </div>
                {currentUser.role === "admin" && (
                  <div className="inline-flex items-center space-x-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold px-2 py-0.5 rounded">
                    <Crown className="w-3 h-3 text-purple-400" />
                    <span>Administrator-Rechte aktiv</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-400 flex items-center space-x-2 pt-2 border-t border-slate-700/40">
                  <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Dauerhafte Server-Datenbank aktiv</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center justify-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 py-2.5 px-4 rounded-xl text-xs font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Abmelden</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          ) : (
            /* Login & Register & Reset Form */
            <div>
              {/* Tab Selector */}
              <div className="grid grid-cols-3 p-1 bg-slate-800/80 rounded-xl mb-5 border border-slate-700/60 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    mode === "login"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Einloggen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    mode === "register"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Registrieren
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    mode === "reset"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Neu / Reset
                </button>
              </div>

              {/* Alert Feedback */}
              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {mode !== "reset" && (
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm flex items-center justify-center space-x-2 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Mit Google fortfahren</span>
                  </button>
                  <div className="flex items-center mt-5 mb-4">
                    <div className="flex-1 border-t border-slate-700"></div>
                    <span className="px-3 text-[10px] text-slate-500 uppercase font-semibold">Oder per E-Mail</span>
                    <div className="flex-1 border-t border-slate-700"></div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="deine.email@beispiel.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      {mode === "reset" ? "Neues Passwort festlegen" : "Passwort"}
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("reset");
                          setError(null);
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300"
                      >
                        Passwort vergessen?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Mindestens 5 Zeichen"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (only on Register) */}
                {mode === "register" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Passwort wiederholen
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Passwort bestätigen"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Notice */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 flex items-start space-x-2">
                  <Database className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dauerhafte Speicherung:</strong> Deine Stundenpläne, Noten, Fächer und Vorlagen werden sicher mit diesem Konto verknüpft.
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Wird verarbeitet...</span>
                    </div>
                  ) : (
                    <>
                      <span>
                        {mode === "login" 
                          ? "Jetzt Einloggen" 
                          : mode === "register" 
                          ? "Konto erstellen" 
                          : "Passwort neu setzen & Einloggen"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* reCAPTCHA Enterprise Protection Notice */}
                <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-500 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Geschützt durch <strong>Google reCAPTCHA Enterprise</strong></span>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
