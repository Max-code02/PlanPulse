import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { TimetableGrid } from "./components/TimetableGrid";
import { SchoolPlanHub } from "./components/SchoolPlanHub";
import { HomeworkPlanner } from "./components/HomeworkPlanner";
import { GradeCalculator } from "./components/GradeCalculator";
import { AiPlanAssistant } from "./components/AiPlanAssistant";
import { FreemiumBilling } from "./components/FreemiumBilling";
import { AdminPanel } from "./components/AdminPanel";
import { WatermarkBadge } from "./components/WatermarkBadge";
import { AuthModal } from "./components/AuthModal";
import { DeviceSelectorModal } from "./components/DeviceSelectorModal";
import { TransitModal } from "./components/TransitModal";
import { ImpressumPage } from "./components/ImpressumPage";
import { DatenschutzPage } from "./components/DatenschutzPage";
import { BottomLegalBar } from "./components/BottomLegalBar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { 
  TimetableEntry, 
  SubstitutionNotice,
  UserConfig, 
  ActiveTab,
  AuthUser,
  UserSubject
} from "./types";
import { safeFetchJson } from "./lib/api";
import { db, auth } from "./lib/firebase";
import { doc, setDoc, deleteDoc, writeBatch, collection, getDocs, getDoc, onSnapshot } from "firebase/firestore";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("timetable");
  const [filterClass, setFilterClass] = useState<string>("alle");
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Authentication State - load from localStorage if previously logged in (default: null/guest)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem("planpulse_current_user");
      if (savedUser) {
        const u: AuthUser = JSON.parse(savedUser);
        if (u && (u.email?.toLowerCase().trim() === "max.kistner12@gmail.com")) {
          u.role = "admin";
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTransitModalOpen, setIsTransitModalOpen] = useState(false);

  // Device Selection State (PC, Apple iOS, Android)
  const [selectedDevice, setSelectedDevice] = useState<"pc" | "apple" | "android" | null>(() => {
    try {
      return (localStorage.getItem("planpulse_device_choice") as "pc" | "apple" | "android") || null;
    } catch {
      return null;
    }
  });
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(() => {
    try {
      // If user hasn't chosen or dismissed before, show on initial visit
      const hasChosen = localStorage.getItem("planpulse_device_prompted");
      return !hasChosen;
    } catch {
      return false;
    }
  });

  const handleSelectDevice = (device: "pc" | "apple" | "android", remember: boolean) => {
    setSelectedDevice(device);
    setIsDeviceModalOpen(false);
    try {
      localStorage.setItem("planpulse_device_prompted", "true");
      if (remember) {
        localStorage.setItem("planpulse_device_choice", device);
      }
    } catch {
      // ignore
    }

    if (device === "apple") {
      showToast("🍎 Apple iOS Version ausgewählt. Leite weiter...");
      setTimeout(() => {
        window.location.href = "/handyapple.html";
      }, 400);
    } else if (device === "android") {
      showToast("🤖 Android Version ausgewählt. Leite weiter...");
      setTimeout(() => {
        window.location.href = "/handyandroid.html";
      }, 400);
    } else {
      showToast("💻 PC / Desktop-Ansicht aktiv.");
    }
  };

  // Synchronize route URLs and Page Titles with Dedicated Legal Pages (/impressum & /datenschutz)
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path === "/impressum" || path.startsWith("/impressum/") || hash === "#impressum" || hash.startsWith("#impressum") || path.includes("impressum.html") || path.includes("impressium.html") || path === "/impressium") {
        setActiveTab("impressum");
        document.title = "Impressum – PlanPulse";
      } else if (path === "/datenschutz" || path.startsWith("/datenschutz/") || hash === "#datenschutz" || hash.startsWith("#datenschutz") || path.includes("datenschutz.html")) {
        setActiveTab("datenschutz");
        document.title = "Datenschutzerklärung – PlanPulse";
      } else {
        document.title = "PlanPulse – Kostenloser Stundenplan & Notenrechner";
      }
    };

    handleUrlRoute();
    window.addEventListener("popstate", handleUrlRoute);
    window.addEventListener("hashchange", handleUrlRoute);
    return () => {
      window.removeEventListener("popstate", handleUrlRoute);
      window.removeEventListener("hashchange", handleUrlRoute);
    };
  }, []);

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    try {
      const path = window.location.pathname.toLowerCase();
      if (tab === "impressum") {
        if (!path.includes("impressum") && !path.includes("impressium")) {
          window.location.href = "/impressum.html";
          return;
        }
        document.title = "Impressum – PlanPulse";
      } else if (tab === "datenschutz") {
        if (!path.includes("datenschutz")) {
          window.location.href = "/datenschutz.html";
          return;
        }
        document.title = "Datenschutzerklärung – PlanPulse";
      } else {
        if (path.includes("impressum") || path.includes("datenschutz")) {
          window.location.href = "/";
          return;
        }
        document.title = "PlanPulse – Kostenloser Stundenplan & Notenrechner";
      }
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sync Firebase Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        const cleanEmail = (fbUser.email || "").toLowerCase().trim();
        const isAdmin = cleanEmail === "max.kistner12@gmail.com";
        const userObj: AuthUser = {
          id: fbUser.uid,
          email: fbUser.email || "",
          planType: "premium",
          role: isAdmin ? "admin" : (currentUser?.role || "user"),
          createdAt: new Date().toISOString(),
        };

        try {
          const snap = await getDoc(doc(db, "users", fbUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            const r = (data.role || "").toString().toLowerCase().trim();
            if (r === "admin" || r === "owner" || isAdmin) {
              userObj.role = "admin";
            }
          } else {
            await setDoc(doc(db, "users", fbUser.uid), userObj, { merge: true });
          }
        } catch (e) {
          console.warn("User profile fetch error:", e);
        }

        setCurrentUser(userObj);
        localStorage.setItem("planpulse_current_user", JSON.stringify(userObj));
        localStorage.setItem("planpulse_auth_token", fbUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  // Core Application State
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionNotice[]>([]);
  const [userConfig, setUserConfig] = useState<UserConfig>({
    planType: "premium",
    organizationName: "Gymnasium & Schul-Dashboard",
    customLogoUrl: "",
    primaryColor: "#2563eb",
    showWatermark: false,
    liveSyncIntervalSeconds: 15,
    webhookUrl: "",
    notifyOnSubstitutions: true,
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper for auth headers (ensures persistent session is always sent with every request)
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("planpulse_auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (currentUser?.email) {
      headers["x-user-email"] = currentUser.email;
    }
    return headers;
  };

  // Fetch initial data & verify persistent session
  const fetchData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("planpulse_auth_token");
      
      // Update currentUser from localStorage if present
      const cachedUser = localStorage.getItem("planpulse_current_user");
      if (cachedUser && !currentUser) {
        setCurrentUser(JSON.parse(cachedUser));
      }

      let fbTimetable: TimetableEntry[] | null = null;
      let fbConfig: UserConfig | null = null;
      
      // --- Firebase Read ---
      if (token || currentUser?.id) {
        try {
          await auth.authStateReady();
          if (auth.currentUser) {
            const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/timetable`));
            fbTimetable = snap.docs.map(d => d.data() as TimetableEntry);
            
            const cfgSnap = await getDoc(doc(db, `users/${auth.currentUser.uid}/config/main`));
            if (cfgSnap.exists()) {
              fbConfig = cfgSnap.data() as UserConfig;
            }
          }
        } catch (fbErr: any) {
          console.warn("Firebase Read Error:", fbErr.message);
        }
      }
      // ----------------------------

      if (fbTimetable !== null) {
        setTimetableEntries(fbTimetable);
      }
      
      if (fbConfig) {
        setUserConfig(fbConfig);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser?.id]);

  // Real-time multi-device synchronization via Firestore listeners
  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = currentUser.id;

    let unsubTimetable = () => {};
    let unsubSubjects = () => {};
    let unsubConfig = () => {};
    let unsubGrades = () => {};
    let unsubHomework = () => {};

    const setupRealtimeListeners = async () => {
      try {
        // 1. Live Timetable listener
        unsubTimetable = onSnapshot(
          collection(db, `users/${uid}/timetable`),
          (snap) => {
            const entries = snap.docs.map((d) => d.data() as TimetableEntry);
            setTimetableEntries(entries);
            localStorage.setItem("planpulse_timetable_entries", JSON.stringify(entries));
          },
          (err) => {
            console.warn("Real-time timetable listener error:", err);
          }
        );

        // 2. Live Subjects listener (syncs Fächer verwalten across devices)
        unsubSubjects = onSnapshot(
          collection(db, `users/${uid}/subjects`),
          (snap) => {
            const subjects = snap.docs.map((d) => d.data() as UserSubject);
            localStorage.setItem("planpulse_user_subjects", JSON.stringify(subjects));
            window.dispatchEvent(new CustomEvent("planpulse_data_updated", { detail: { subjects } }));
          },
          (err) => {
            console.warn("Real-time subjects listener error:", err);
          }
        );

        // 3. Live Grades listener (syncs Noten across devices)
        unsubGrades = onSnapshot(
          collection(db, `users/${uid}/grades`),
          (snap) => {
            const grades = snap.docs.map((d) => d.data());
            localStorage.setItem("planpulse_grade_entries", JSON.stringify(grades));
            window.dispatchEvent(new CustomEvent("planpulse_data_updated", { detail: { grades } }));
          },
          (err) => {
            console.warn("Real-time grades listener error:", err);
          }
        );

        // 4. Live Homework listener (syncs Hausaufgaben across devices)
        unsubHomework = onSnapshot(
          collection(db, `users/${uid}/homework`),
          (snap) => {
            const items = snap.docs.map((d) => d.data());
            localStorage.setItem("planpulse_homework_items", JSON.stringify(items));
            window.dispatchEvent(new CustomEvent("planpulse_data_updated", { detail: { homework: items } }));
          },
          (err) => {
            console.warn("Real-time homework listener error:", err);
          }
        );

        // 5. Live Config listener
        unsubConfig = onSnapshot(
          doc(db, `users/${uid}/config/main`),
          (snap) => {
            if (snap.exists()) {
              setUserConfig(snap.data() as UserConfig);
            }
          },
          (err) => {
            console.warn("Real-time config listener error:", err);
          }
        );
      } catch (e) {
        console.warn("Failed to attach Firestore real-time listeners:", e);
      }
    };

    setupRealtimeListeners();

    return () => {
      unsubTimetable();
      unsubSubjects();
      unsubGrades();
      unsubHomework();
      unsubConfig();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    fetchData();

    // Background sync heartbeat
    const intervalMs = userConfig.planType === "premium" ? 10000 : 900000;
    const timer = setInterval(() => {
      fetchData();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [userConfig.planType, fetchData]);

  // Auth Handlers (Ensures permanent login state)
  const handleAuthSuccess = (user: AuthUser, token: string) => {
    localStorage.setItem("planpulse_auth_token", token);
    localStorage.setItem("planpulse_current_user", JSON.stringify(user));
    setCurrentUser(user);
    fetchData();
    showToast(`Erfolgreich eingeloggt als ${user.email}. Du bleibst dauerhaft eingeloggt!`);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("planpulse_auth_token");
    localStorage.removeItem("planpulse_current_user");
    setCurrentUser(null);
    setIsAuthModalOpen(false);
    fetchData();
    showToast("Erfolgreich abgemeldet.");
  };

  // Timetable Operations
  const handleAddTimetableEntry = async (entry: Partial<TimetableEntry>) => {
    try {
      const tempId = entry.id || `tt-${Date.now()}`;
      const newEntry = { ...entry, id: tempId } as TimetableEntry;
      
      // Optimistic Update & Firebase
      setTimetableEntries((prev) => [...prev, newEntry]);
      showToast(`Stunde "${newEntry.subject}" gespeichert.`);
      
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, `users/${auth.currentUser.uid}/timetable`, newEntry.id), newEntry);
        } catch(e) { console.warn("Firebase Sync Error", e); }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTimetableEntry = async (entry: TimetableEntry) => {
    try {
      // Optimistic Update & Firebase
      setTimetableEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? entry : e))
      );
      showToast(`Stunde "${entry.subject}" aktualisiert.`);
      
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, `users/${auth.currentUser.uid}/timetable`, entry.id), entry);
        } catch(e) { console.warn("Firebase Sync Error", e); }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTimetableEntry = async (id: string) => {
    try {
      // Optimistic Update & Firebase
      setTimetableEntries((prev) => prev.filter((e) => e.id !== id));
      showToast("Stunde entfernt.");
      
      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, `users/${auth.currentUser.uid}/timetable`, id));
        } catch(e) { console.warn("Firebase Sync Error", e); }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearTimetable = async (targetClass: string) => {
    try {
      const tClass = (targetClass || "").trim().toLowerCase();
      if (tClass && tClass !== "alle") {
        setTimetableEntries((prev) =>
          prev.filter((e) => (e.targetClass || "").toLowerCase() !== tClass)
        );
        showToast(`Stundenplan für Klasse ${targetClass} geleert.`);
        
        if (auth.currentUser) {
          try {
            const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/timetable`));
            const batch = writeBatch(db);
            snap.docs.forEach((d) => {
              if ((d.data().targetClass || "").toLowerCase() === tClass) {
                batch.delete(d.ref);
              }
            });
            await batch.commit();
          } catch (e) {
            console.warn("Firebase clear timetable class error:", e);
          }
        }

        try {
          const headers = getAuthHeaders();
          await safeFetchJson("/api/timetable/clear", {
            method: "POST",
            headers,
            body: JSON.stringify({ targetClass }),
          });
        } catch (e) {
          console.warn("Backend clear timetable class error:", e);
        }
      } else {
        setTimetableEntries([]);
        showToast("Gesamter Stundenplan geleert. Bereit für einen Neustart.");

        if (auth.currentUser) {
          try {
            const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/timetable`));
            const batch = writeBatch(db);
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          } catch (e) {
            console.warn("Firebase clear all timetable error:", e);
          }
        }

        try {
          const headers = getAuthHeaders();
          await safeFetchJson("/api/timetable/clear", {
            method: "POST",
            headers,
            body: JSON.stringify({ targetClass: "alle" }),
          });
        } catch (e) {
          console.warn("Backend clear all timetable error:", e);
        }
      }
    } catch (err) {
      console.error("Clear timetable error:", err);
    }
  };

  const handleAdoptSchoolTemplate = async (templateId: string, mode: "replace" | "merge") => {
    try {
      const res = await safeFetchJson<{ schools: any[] }>(`/api/schools`);
      const schools = res.data?.schools || [];
      let templateToAdopt = null;
      for (const s of schools) {
        if (s.plans) {
          const plan = s.plans.find((p: any) => p.id === templateId);
          if (plan) {
            templateToAdopt = plan;
            break;
          }
        }
      }

      if (!templateToAdopt) {
         showToast("Fehler: Vorlage nicht gefunden.");
         return;
      }

      // Ensure every entry gets a new unique ID so it doesn't conflict
      const newEntries = (templateToAdopt.entries || []).map((e: any) => ({
        ...e,
        id: `tt-adopted-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }));
      
      let finalEntries: TimetableEntry[] = [];
      if (mode === "replace") {
        finalEntries = [...newEntries];
      } else {
        finalEntries = [...timetableEntries, ...newEntries];
      }

      setTimetableEntries(finalEntries);
      
      if (auth.currentUser) {
        try {
          const batch = writeBatch(db);
          if (mode === "replace") {
             const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/timetable`));
             snap.docs.forEach(d => batch.delete(d.ref));
          }
          finalEntries.forEach(entry => {
             const docRef = doc(db, `users/${auth.currentUser.uid}/timetable`, entry.id);
             batch.set(docRef, entry);
          });
          await batch.commit();
        } catch(e) { console.warn("Firebase Sync Error", e); }
      }

      showToast(`🎉 Stunden erfolgreich in deinen Plan übernommen!`);
    } catch (err) {
      console.error("Adopt template error:", err);
      showToast("Fehler bei der Planübernahme.");
    }
  };

  const handleAiPlanParsed = async (parsedData?: any) => {
    if (parsedData?.timetableEntries && Array.isArray(parsedData.timetableEntries) && parsedData.timetableEntries.length > 0) {
      const newEntries = parsedData.timetableEntries;
      
      // Update state immediately
      setTimetableEntries((prev) => {
        return [...prev, ...newEntries];
      });

      // Sync to Firebase if logged in
      if (auth.currentUser) {
        try {
          const batch = writeBatch(db);
          newEntries.forEach((entry: any) => {
            const docRef = doc(db, `users/${auth.currentUser!.uid}/timetable`, entry.id);
            batch.set(docRef, entry);
          });
          await batch.commit();
        } catch (e) {
          console.warn("Firebase sync error for AI parsed plan", e);
        }
      }
    }

    if (parsedData?.allSubjects && Array.isArray(parsedData.allSubjects) && parsedData.allSubjects.length > 0) {
      localStorage.removeItem("planpulse_subjects_explicitly_cleared");
      localStorage.setItem("planpulse_user_subjects", JSON.stringify(parsedData.allSubjects));
      if (auth.currentUser) {
        try {
          const batch = writeBatch(db);
          parsedData.allSubjects.forEach((sub: any) => {
            const docRef = doc(db, `users/${auth.currentUser!.uid}/subjects`, sub.id);
            batch.set(docRef, sub, { merge: true });
          });
          await batch.commit();
        } catch (e) {
          console.warn("Firebase sync error for AI parsed subjects", e);
        }
      }
    }

    if (parsedData?.extractedSubjects && Array.isArray(parsedData.extractedSubjects) && parsedData.extractedSubjects.length > 0) {
      showToast(`📚 ${parsedData.extractedSubjects.length} Fächer & Lehrkräfte erfolgreich angelegt!`);
    } else if (parsedData?.timetableEntries && Array.isArray(parsedData.timetableEntries) && parsedData.timetableEntries.length > 0) {
      showToast(`🗓️ ${parsedData.timetableEntries.length} Stunden erfolgreich übernommen!`);
    }

    // Refresh application data from server
    await fetchData();

    // Notify other components (GradeCalculator, Timetable) immediately
    window.dispatchEvent(new CustomEvent("planpulse_data_updated", { detail: parsedData }));
  };

  // Config & Subscription Operations
  const handleUpdateConfig = async (newConfig: Partial<UserConfig>) => {
    try {
      const mergedConfig = { ...userConfig, ...newConfig };
      setUserConfig(mergedConfig);
      showToast("Einstellungen & Branding gespeichert.");
      
      // --- Firebase Sync ---
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, `users/${auth.currentUser.uid}/config/main`), mergedConfig);
        } catch(e) { console.warn("Firebase Sync Error", e); }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePlan = async (targetPlan?: "free" | "premium") => {
    try {
      const newPlan = targetPlan || (userConfig.planType === "premium" ? "free" : "premium");
      const updatedConfig: UserConfig = { ...userConfig, planType: newPlan };
      
      setUserConfig(updatedConfig);
      if (currentUser) {
        const updatedUser = { ...currentUser, planType: newPlan };
        setCurrentUser(updatedUser);
        localStorage.setItem("planpulse_current_user", JSON.stringify(updatedUser));
        
        // --- Firebase Sync ---
        if (auth.currentUser) {
          try {
            await setDoc(doc(db, `users/${auth.currentUser.uid}`), updatedUser, { merge: true });
            await setDoc(doc(db, `users/${auth.currentUser.uid}/config/main`), updatedConfig);
          } catch(e) { console.warn("Firebase Sync Error", e); }
        }
      }
      
      showToast(
        newPlan === "premium"
          ? "✨ Pro / Schule aktiv: Alle KI-Features und automatische Konfliktprüfung freigeschaltet!"
          : "Auf Standard-Modus gewechselt."
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        config={userConfig}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenTransitModal={() => setIsTransitModalOpen(true)}
        onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
        onUpgradeClick={() => handleNavigate("freemium")}
        isSyncing={isSyncing}
        onManualSync={fetchData}
      />

      <TransitModal 
        isOpen={isTransitModalOpen} 
        onClose={() => setIsTransitModalOpen(false)} 
      />

      {/* Device Selection Modal (PC vs Apple vs Android) */}
      <DeviceSelectorModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        currentChoice={selectedDevice}
        onSelectDevice={handleSelectDevice}
      />

      {/* Auth Modal (Email & Password Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-blue-400 animate-in fade-in slide-in-from-bottom-3">
          {notification}
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 flex-1 w-full">
        {activeTab === "timetable" && (
          <TimetableGrid
            entries={timetableEntries}
            onAddEntry={handleAddTimetableEntry}
            onEditEntry={handleEditTimetableEntry}
            onDeleteEntry={handleDeleteTimetableEntry}
            onClearEntries={handleClearTimetable}
            onOpenAiParser={() => handleNavigate("ai")}
            onOpenSchoolHub={() => handleNavigate("school_hub")}
            activeClass={filterClass}
            setActiveClass={setFilterClass}
            devicePlatform={selectedDevice}
          />
        )}

        {activeTab === "school_hub" && (
          <SchoolPlanHub
            currentEntries={timetableEntries}
            activeClass={filterClass}
            currentUser={currentUser}
            onAdoptTemplate={handleAdoptSchoolTemplate}
            onRefreshData={fetchData}
            onNavigateToTimetable={() => handleNavigate("timetable")}
          />
        )}

        {activeTab === "homework" && (
          <HomeworkPlanner
            entries={timetableEntries}
            activeClass={filterClass}
          />
        )}

        {activeTab === "grades" && (
          <GradeCalculator
            entries={timetableEntries}
            onDataChange={fetchData}
          />
        )}

        {activeTab === "ai" && (
          <AiPlanAssistant
            isPremium={userConfig.planType === "premium"}
            onPlanParsed={handleAiPlanParsed}
            onUpgradeClick={() => handleNavigate("freemium")}
          />
        )}

        {activeTab === "freemium" && (
          <FreemiumBilling
            config={userConfig}
            onUpdateConfig={handleUpdateConfig}
            onTogglePlan={handleTogglePlan}
            timetableEntries={timetableEntries}
            substitutions={substitutions}
          />
        )}

        {activeTab === "admin" && (
          <AdminPanel
            currentUser={currentUser}
            onNotification={(msg) => setNotification(msg)}
            onRefreshData={fetchData}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {activeTab === "impressum" && (
          <ImpressumPage
            onNavigateBack={() => handleNavigate("timetable")}
            onNavigateDatenschutz={() => handleNavigate("datenschutz")}
          />
        )}

        {activeTab === "datenschutz" && (
          <DatenschutzPage
            onNavigateBack={() => handleNavigate("timetable")}
            onNavigateImpressum={() => handleNavigate("impressum")}
          />
        )}
      </main>

      {/* Footer & Watermark */}
      <WatermarkBadge
        config={userConfig}
        onUpgradeClick={() => handleNavigate("freemium")}
        onOpenLegal={handleNavigate}
      />

      {/* Bottom Left Floating Quick-Access Bar */}
      <BottomLegalBar 
        onNavigate={handleNavigate} 
        onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
      />

      {/* Mobile Bottom Navigation Bar (Apple & Android optimized) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        devicePlatform={selectedDevice}
        onOpenAiParser={() => handleNavigate("ai")}
        onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
      />

    </div>
  );
}
