import React, { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, 
  Users, 
  Trash2, 
  Ban, 
  CheckCircle, 
  RefreshCw, 
  Layers, 
  Search, 
  School, 
  Lock, 
  Mail, 
  UserPlus, 
  KeyRound, 
  UserCheck, 
  X, 
  Sparkles,
  ShieldCheck,
  Shield,
  Activity,
  Server,
  Cpu,
  AlertTriangle,
  Radio,
  FileText,
  ExternalLink
} from "lucide-react";
import { AuthUser, SchoolPlanTemplate } from "../types";
import { safeFetchJson } from "../lib/api";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AdminUserItem {
  id: string;
  email: string;
  role: "admin" | "user";
  planType: "free" | "premium";
  banned: boolean;
  createdAt: string;
  timetableCount: number;
  homeworkCount: number;
}

interface WafStatusData {
  status: string;
  firewall: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  layers: {
    securityHeaders: {
      enabled: boolean;
      headers: string[];
    };
    rateLimiting: {
      enabled: boolean;
      type: string;
      rules: Record<string, string>;
      activeTrackedIps: number;
    };
    exploitFilter: {
      enabled: boolean;
      protections: string[];
    };
  };
  metrics: {
    totalBlockedRequests: number;
    recentBlockedThreats: Array<{
      id: string;
      timestamp: string;
      ip: string;
      method: string;
      path: string;
      reason: string;
      threatType: string;
    }>;
  };
}

interface AdminPanelProps {
  currentUser: AuthUser | null;
  onNotification: (msg: string) => void;
  onRefreshData: () => void;
  onAuthSuccess?: (user: AuthUser, token: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  onNotification,
  onRefreshData,
  onAuthSuccess,
}) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [templates, setTemplates] = useState<SchoolPlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "active" | "banned" | "admin">("all");
  const [searchTemplate, setSearchTemplate] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"users" | "templates" | "security">("users");
  const [wafStatus, setWafStatus] = useState<WafStatusData | null>(null);
  const [wafLoading, setWafLoading] = useState(false);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Password Reset Modal State
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserItem | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const getAdminHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem("planpulse_auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (currentUser?.email) headers["x-user-email"] = currentUser.email;
    return headers;
  }, [currentUser?.email]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAdminHeaders();
      const [usersRes, templatesRes, wafRes] = await Promise.all([
        safeFetchJson<{ success: boolean; users: AdminUserItem[] }>("/api/admin/users", { headers }),
        safeFetchJson<{ templates: SchoolPlanTemplate[] } | SchoolPlanTemplate[]>("/api/school-templates", { headers }),
        safeFetchJson<WafStatusData>("/api/security/waf-status", { headers }),
      ]);

      if (wafRes.ok && wafRes.data) {
        setWafStatus(wafRes.data);
      }

      let allUsers: AdminUserItem[] = [];
      if (usersRes.ok && usersRes.data?.users) {
        allUsers = [...usersRes.data.users];
      }

      // Nutzer aus Firebase laden und mit der lokalen DB mergen
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const firebaseUsers = usersSnap.docs.map(doc => {
          const data = doc.data();
          const emailStr = data.email || "";
          return {
            id: doc.id,
            email: emailStr,
            role: data.role || (emailStr.toLowerCase() === "max.kistner12@gmail.com" ? "admin" : "user"),
            planType: data.planType || "premium",
            banned: !!data.banned,
            createdAt: data.createdAt || new Date().toISOString(),
            timetableCount: data.timetableEntries?.length || 0,
            homeworkCount: data.homeworkItems?.length || 0,
          } as AdminUserItem;
        });

        for (const fu of firebaseUsers) {
          const idx = allUsers.findIndex(u => u.email === fu.email || u.id === fu.id);
          if (idx !== -1) {
            allUsers[idx] = { ...allUsers[idx], ...fu };
          } else {
            allUsers.push(fu);
          }
        }
      } catch (fbErr) {
        console.error("Fehler beim Laden der Firebase-Nutzer:", fbErr);
      }

      setUsers(allUsers);

      if (templatesRes.ok && templatesRes.data) {
        const raw = templatesRes.data;
        if (Array.isArray(raw)) {
          setTemplates(raw);
        } else if (raw && "templates" in raw && Array.isArray(raw.templates)) {
          setTemplates(raw.templates);
        }
      }
    } catch (err) {
      console.error("Admin data load error:", err);
      onNotification("Fehler beim Laden der Admin-Daten.");
    } finally {
      setLoading(false);
    }
  }, [getAdminHeaders, onNotification]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      setCreateError("Bitte alle Felder ausfüllen.");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);

    try {
      const headers = getAdminHeaders();
      const res = await safeFetchJson<{ success: boolean; message?: string; error?: string; user?: AdminUserItem }>(
        "/api/admin/users/create",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: newEmail.trim().toLowerCase(),
            password: newPassword,
            role: newRole,
          }),
        }
      );

      if (res.ok && res.data?.success) {
        onNotification(res.data.message || `Benutzer ${newEmail} angelegt!`);
        setIsCreateModalOpen(false);
        setNewEmail("");
        setNewPassword("");
        setNewRole("user");
        loadAdminData();
      } else {
        setCreateError(res.data?.error || res.error || "Fehler beim Anlegen des Nutzers.");
      }
    } catch (err: any) {
      setCreateError(err.message || "Serverfehler.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Reset Password for a user
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordVal) return;
    setResetLoading(true);

    try {
      const headers = getAdminHeaders();
      const res = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        `/api/admin/users/${resetTargetUser.id}/reset-password`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ newPassword: resetPasswordVal }),
        }
      );

      if (res.ok && res.data?.success) {
        onNotification(res.data.message || `Passwort für ${resetTargetUser.email} wurde geändert.`);
        setResetTargetUser(null);
        setResetPasswordVal("");
      } else {
        onNotification(res.data?.error || res.error || "Fehler beim Zurücksetzen des Passworts.");
      }
    } catch (err) {
      onNotification("Serverfehler beim Passwort-Reset.");
    } finally {
      setResetLoading(false);
    }
  };

  // Toggle Role (Admin / User)
  const handleToggleRole = async (user: AdminUserItem) => {
    if (user.email.toLowerCase() === "max.kistner12@gmail.com") {
      onNotification("Der Haupt-Admin behält dauerhaft Admin-Rechte.");
      return;
    }

    const nextRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Rolle von ${user.email} wirklich auf "${nextRole === 'admin' ? 'Administrator' : 'Benutzer'}" ändern?`)) {
      return;
    }

    try {
      const headers = getAdminHeaders();
      const res = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        `/api/admin/users/${user.id}/role`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ role: nextRole }),
        }
      );

      if (res.ok && res.data?.success) {
        onNotification(res.data.message || `Rolle geändert.`);
        loadAdminData();
      } else {
        onNotification(res.data?.error || res.error || "Fehler beim Ändern der Rolle.");
      }
    } catch (err) {
      onNotification("Serverfehler beim Ändern der Rolle.");
    }
  };

  // Ban / Unban user
  const handleToggleBan = async (user: AdminUserItem) => {
    if (user.role === "admin" || user.email.toLowerCase() === "max.kistner12@gmail.com") {
      onNotification("Admin-Accounts können nicht gesperrt werden!");
      return;
    }

    const action = user.banned ? "unban" : "ban";
    const confirmMsg = user.banned
      ? `Nutzer ${user.email} wirklich entsperren?`
      : `Nutzer ${user.email} wirklich SPERREN / BANNEN? Der Nutzer verliert sofort den Zugriff!`;

    if (!confirm(confirmMsg)) return;

    try {
      const headers = getAdminHeaders();
      const res = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
        `/api/admin/users/${user.id}/${action}`,
        {
          method: "POST",
          headers,
        }
      );

      if (res.ok && res.data?.success) {
        onNotification(user.banned ? `Nutzer ${user.email} wurde entsperrt.` : `Nutzer ${user.email} wurde erfolgreich gesperrt!`);
        loadAdminData();
      } else {
        onNotification(res.data?.error || res.error || "Fehler bei der Aktion.");
      }
    } catch (err) {
      console.error("Ban error:", err);
      onNotification("Serverfehler beim Sperren/Entsperren.");
    }
  };

  // Delete User
  const handleDeleteUser = async (user: AdminUserItem) => {
    if (user.email.toLowerCase().trim() === "max.kistner12@gmail.com") {
      onNotification("Der Haupt-Administrator (max.kistner12@gmail.com) kann nicht gelöscht werden!");
      return;
    }

    if (!confirm(`Nutzerkonto ${user.email} und alle dazugehörigen Daten unwiderruflich LÖSCHEN?`)) return;

    try {
      const headers = getAdminHeaders();
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        `/api/admin/users/${user.id}`,
        {
          method: "DELETE",
          headers,
          body: JSON.stringify({ email: user.email }),
        }
      );

      if (res.ok && res.data?.success) {
        onNotification(`Nutzer ${user.email} wurde unwiderruflich gelöscht.`);
        setUsers((prev) =>
          prev.filter((u) => u.id !== user.id && u.email.toLowerCase().trim() !== user.email.toLowerCase().trim())
        );
        loadAdminData();
      } else {
        onNotification(res.data?.error || res.error || "Fehler beim Löschen.");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      onNotification("Serverfehler beim Löschen des Nutzers.");
    }
  };

  // Admin Delete Template (Moderation of inappropriate/spam plans)
  const handleAdminDeleteTemplate = async (tpl: SchoolPlanTemplate) => {
    if (!confirm(`ADMIN-MODERATION: Stundenplan-Vorlage "${tpl.title}" (${tpl.schoolName || "Ohne Schule"}) wirklich löschen?`)) {
      return;
    }

    try {
      const headers = getAdminHeaders();
      const res = await safeFetchJson<{ success: boolean; error?: string }>(
        `/api/school-templates/${tpl.id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (res.ok && res.data?.success) {
        onNotification(`Vorlage "${tpl.title}" wurde durch Admin-Moderation entfernt.`);
        loadAdminData();
        onRefreshData();
      } else {
        onNotification(res.data?.error || res.error || "Fehler beim Löschen der Vorlage.");
      }
    } catch (err) {
      console.error("Delete template error:", err);
      onNotification("Serverfehler beim Löschen der Vorlage.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchUser.toLowerCase()) || 
      u.id.toLowerCase().includes(searchUser.toLowerCase());
    
    if (!matchesSearch) return false;

    if (userFilter === "active") return !u.banned;
    if (userFilter === "banned") return u.banned;
    if (userFilter === "admin") return u.role === "admin" || u.email.toLowerCase() === "max.kistner12@gmail.com";
    return true;
  });

  const filteredTemplates = templates.filter((t) => 
    t.title.toLowerCase().includes(searchTemplate.toLowerCase()) || 
    (t.schoolName && t.schoolName.toLowerCase().includes(searchTemplate.toLowerCase())) ||
    (t.ownerEmail && t.ownerEmail.toLowerCase().includes(searchTemplate.toLowerCase())) ||
    t.targetClass.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Admin Header */}
      <div className="bg-slate-900 border border-rose-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-700 flex items-center justify-center shadow-lg shadow-rose-950/60 text-white font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Admin-Kontrollzentrum
                </h2>
                <span className="bg-rose-500/20 text-rose-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-500/40">
                  Volle Rechte: {currentUser?.email || "Administrator"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Nutzer-Verwaltung, Sperrung (Bannen), Rollen & Moderation öffentlicher Stundenpläne.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Neuer Benutzer</span>
            </button>
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-400" : ""}`} />
              <span>Aktualisieren</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Registrierte Nutzer</span>
            <span className="text-xl font-bold text-white mt-0.5 block">{users.length}</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Gesperrte Nutzer</span>
            <span className="text-xl font-bold text-rose-400 mt-0.5 block">
              {users.filter((u) => u.banned).length}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Öffentliche Pläne</span>
            <span className="text-xl font-bold text-blue-400 mt-0.5 block">{templates.length}</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">System-Status</span>
            <span className="text-xl font-bold text-emerald-400 mt-0.5 block">
              Aktiv & Synchronisiert
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs: Users vs Templates vs Security */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab("users")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "users"
              ? "bg-rose-950/40 text-rose-300 border border-rose-800/50 shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nutzer-Verwaltung & Bannliste ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab("templates")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "templates"
              ? "bg-rose-950/40 text-rose-300 border border-rose-800/50 shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stundenplan-Moderation ({templates.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveSubTab("security");
            if (!wafStatus) {
              setWafLoading(true);
              safeFetchJson<WafStatusData>("/api/security/waf-status", { headers: getAdminHeaders() })
                .then((res) => { if (res.ok && res.data) setWafStatus(res.data); })
                .finally(() => setWafLoading(false));
            }
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "security"
              ? "bg-emerald-950/50 text-emerald-300 border border-emerald-700/60 shadow"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>WAF & Applikations-Sicherheit</span>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
            Aktiv
          </span>
        </button>
      </div>

      {/* View: User Management */}
      {activeSubTab === "users" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-rose-400" />
                <span>Alle registrierten Benutzerkonten ({filteredUsers.length} angezeigt)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Gesperrte Nutzer können sich nicht mehr einloggen und keine Anfragen stellen.
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Nutzer suchen..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setUserFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                userFilter === "all"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Alle ({users.length})
            </button>
            <button
              onClick={() => setUserFilter("active")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                userFilter === "active"
                  ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Aktiv ({users.filter((u) => !u.banned).length})
            </button>
            <button
              onClick={() => setUserFilter("banned")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                userFilter === "banned"
                  ? "bg-rose-900/60 text-rose-300 border border-rose-700"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Gesperrt ({users.filter((u) => u.banned).length})
            </button>
            <button
              onClick={() => setUserFilter("admin")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                userFilter === "admin"
                  ? "bg-purple-900/60 text-purple-300 border border-purple-700"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              Admins ({users.filter((u) => u.role === "admin" || u.email.toLowerCase() === "max.kistner12@gmail.com").length})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-y border-slate-800">
                <tr>
                  <th className="py-3 px-4">E-Mail & Status</th>
                  <th className="py-3 px-4">Rolle</th>
                  <th className="py-3 px-4">Abo</th>
                  <th className="py-3 px-4">Stunden</th>
                  <th className="py-3 px-4">Registriert</th>
                  <th className="py-3 px-4 text-right">Admin-Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Keine Benutzer gefunden.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdminUser = u.role === "admin" || u.email.toLowerCase() === "max.kistner12@gmail.com";
                    const isMainAdmin = u.email.toLowerCase() === "max.kistner12@gmail.com";

                    return (
                      <tr key={u.id} className={`hover:bg-slate-850/50 transition-colors ${u.banned ? "bg-rose-950/20" : ""}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div 
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${u.banned ? "bg-rose-500 ring-4 ring-rose-500/20" : "bg-emerald-400"}`} 
                              title={u.banned ? "Gesperrt" : "Aktiv"}
                            />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-semibold text-white">{u.email}</span>
                                {isMainAdmin && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" title="Haupt-Administrator" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono block">{u.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isAdminUser ? (
                            <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/40">
                              {isMainAdmin ? "Inhaber (Admin)" : "Administrator"}
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                              Benutzer
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                            Vollversion
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-300 font-medium">{u.timetableCount || 0} Std.</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("de-DE") : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Password Reset */}
                            <button
                              onClick={() => {
                                setResetTargetUser(u);
                                setResetPasswordVal("");
                              }}
                              title="Passwort neu setzen"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Role */}
                            {!isMainAdmin && (
                              <button
                                onClick={() => handleToggleRole(u)}
                                title={u.role === "admin" ? "Zu normalem Benutzer machen" : "Zu Administrator befördern"}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-950 text-slate-300 hover:text-purple-300 border border-slate-700 transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Ban / Unban */}
                            {!isMainAdmin && (
                              <button
                                onClick={() => handleToggleBan(u)}
                                title={u.banned ? "Nutzer entsperren" : "Nutzer sperren (bannen)"}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all ${
                                  u.banned
                                    ? "bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60"
                                    : "bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60"
                                }`}
                              >
                                <Ban className="w-3 h-3" />
                                <span>{u.banned ? "Entsperren" : "Bannen"}</span>
                              </button>
                            )}

                            {/* Delete */}
                            {!isMainAdmin && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title="Nutzer löschen"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Template Moderation */}
      {activeSubTab === "templates" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <span>Stundenplan-Vorlagen & Moderation</span>
              </h3>
              <p className="text-xs text-slate-400">
                Lösche fehlerhafte, doppelte oder unangemessene Stundenpläne mit einem Klick.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Plan oder Schule suchen..."
                value={searchTemplate}
                onChange={(e) => setSearchTemplate(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-slate-500 text-xs">
                Keine Vorlagen gefunden.
              </div>
            ) : (
              filteredTemplates.map((tpl) => (
                <div 
                  key={tpl.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">{tpl.title}</h4>
                      <span className="bg-blue-950/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-800/60">
                        {tpl.targetClass}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                      <School className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tpl.schoolName || "Schule nicht angegeben"}</span>
                      {tpl.schoolCity && <span>• {tpl.schoolCity}</span>}
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                      <span>{tpl.entriesCount || tpl.entries?.length || 0} Unterrichtsstunden</span>
                      {tpl.ownerEmail && (
                        <span className="flex items-center space-x-1 text-slate-400">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>Ersteller: {tpl.ownerEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-slate-600 font-mono">ID: {tpl.id}</span>
                    <button
                      onClick={() => handleAdminDeleteTemplate(tpl)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg text-xs font-bold border border-rose-800/60 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Admin: Plan löschen</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* View: Security & In-App WAF Monitoring */}
      {activeSubTab === "security" && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/60 text-white">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">In-App Web Application Firewall & DDoS Guard</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Aktiv & Schützend
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mehrschichtige Echtzeit-Abwehr gegen DDoS-Flooding, Brute-Force, Path-Traversal & bösartige Bot-Scanner.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    setWafLoading(true);
                    try {
                      const res = await safeFetchJson<WafStatusData>("/api/security/waf-status", { headers: getAdminHeaders() });
                      if (res.ok && res.data) {
                        setWafStatus(res.data);
                        onNotification("WAF-Status & Sicherheitsmetriken aktualisiert.");
                      }
                    } finally {
                      setWafLoading(false);
                    }
                  }}
                  disabled={wafLoading}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${wafLoading ? "animate-spin text-emerald-400" : ""}`} />
                  <span>Prüfen</span>
                </button>
              </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Abgewehrte Bedrohungen</span>
                <span className="text-xl font-bold text-rose-400 mt-0.5 block">
                  {wafStatus?.metrics.totalBlockedRequests ?? 0}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Aktive IP-Ratenfilter</span>
                <span className="text-xl font-bold text-emerald-400 mt-0.5 block">
                  {wafStatus?.layers.rateLimiting.activeTrackedIps ?? 0}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Security Header Status</span>
                <span className="text-xl font-bold text-emerald-400 mt-0.5 block">
                  8 / 8 Aktiv
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Server Uptime</span>
                <span className="text-xl font-bold text-white mt-0.5 block font-mono">
                  {wafStatus ? `${Math.floor(wafStatus.uptimeSeconds / 60)}m ${wafStatus.uptimeSeconds % 60}s` : "Aktiv"}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Security Layers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Layer 1: Rate Limiting & Anti-DDoS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Rate Limiting & DDoS-Schutz</h4>
                  <p className="text-[11px] text-slate-400">Sliding-Window Token-Bucket pro IP</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <span className="text-slate-300">Allgemeine API-Endpunkte</span>
                  <span className="font-mono text-emerald-400 font-bold">200 Req / Min</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <span className="text-slate-300">Auth & Login (Brute-Force-Schutz)</span>
                  <span className="font-mono text-amber-400 font-bold">30 Req / Min</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <span className="text-slate-300">KI & Stundenplan-Assistent</span>
                  <span className="font-mono text-purple-400 font-bold">35 Req / Min</span>
                </div>
              </div>
            </div>

            {/* Layer 2: Exploit & Bot-Scanner Guard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Exploit & Bot-Filter (WAF)</h4>
                  <p className="text-[11px] text-slate-400">Echtzeit-Blockade bekannter Angriffsmuster</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center space-x-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Directory & Path Traversal Blockade (<code className="text-slate-400">../, /etc/passwd</code>)</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Sensible Config-Dateien Schutz (<code className="text-slate-400">/.env, /.git, /wp-admin</code>)</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Bot-Scanner Blockade (<code className="text-slate-400">sqlmap, nikto, acunetix, masscan</code>)</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Slowloris & Connection Flood Timeouts (65s / 120s)</span>
                </div>
              </div>
            </div>

            {/* Layer 3: Security Headers */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 md:col-span-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Aktive HTTP-Sicherheits-Header</h4>
                  <p className="text-[11px] text-slate-400">Schutz vor XSS, Clickjacking, MIME-Sniffing und Downgrade-Angriffen</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">X-Content-Type-Options</span>
                  <span className="text-emerald-400 font-semibold">nosniff</span>
                </div>
                <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">X-Frame-Options</span>
                  <span className="text-emerald-400 font-semibold">SAMEORIGIN</span>
                </div>
                <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">X-XSS-Protection</span>
                  <span className="text-emerald-400 font-semibold">1; mode=block</span>
                </div>
                <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Referrer-Policy</span>
                  <span className="text-emerald-400 font-semibold">strict-origin-when-cross-origin</span>
                </div>
                <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Strict-Transport-Security</span>
                  <span className="text-emerald-400 font-semibold">max-age=31536000; HSTS</span>
                </div>
                <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">X-Powered-By</span>
                  <span className="text-emerald-400 font-semibold">Ausgeblendet (Hidden)</span>
                </div>
              </div>
            </div>

            {/* Cloud WAF / Cloudflare Hint Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Empfehlung für DNS-Ebene (Cloud WAF):</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Unsere <strong>In-App WAF</strong> und das <strong>Rate-Limiting</strong> schützen Ihren Server direkt auf Applikationsebene.
                Für zusätzliche volumetrische DDoS-Abwehr (Layer 3/4) können Sie Ihre Domain bei <strong>Cloudflare</strong> (kostenloser Plan) oder <strong>Google Cloud Armor</strong> hinterlegen, um Angriffe bereits am weltweiten Edge-Netzwerk abzuwehren.
              </p>
            </div>

            {/* Live Blocked Threats Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Echtzeit-Sicherheitsprotokoll (Abgewehrte Angriffe)
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500">
                  {wafStatus?.metrics.recentBlockedThreats.length ?? 0} Ereignisse
                </span>
              </div>

              {(!wafStatus?.metrics.recentBlockedThreats || wafStatus.metrics.recentBlockedThreats.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-500 border border-slate-800/60 rounded-xl bg-slate-950/40">
                  <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-60" />
                  Keine aktuellen Angriffe oder Blockaden verzeichnet. Das System läuft stabil und geschützt.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {wafStatus.metrics.recentBlockedThreats.map((incident) => (
                    <div key={incident.id} className="p-2.5 bg-slate-950/80 border border-rose-900/30 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-rose-500/20 text-rose-300 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                            {incident.threatType}
                          </span>
                          <span className="text-white font-mono">{incident.method} {incident.path}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{incident.reason} (IP: <span className="font-mono text-slate-300">{incident.ip}</span>)</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(incident.timestamp).toLocaleTimeString("de-DE")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Create User */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Neues Benutzerkonto anlegen</h3>
                <p className="text-xs text-slate-400">Erstelle einen Schüler- oder Lehrer-Account</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">E-Mail-Adresse</label>
                <input
                  type="email"
                  required
                  placeholder="z. B. lehrer.mueller@schule.de"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Initiales Passwort</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword("Schule" + Math.floor(1000 + Math.random() * 9000) + "!")}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Passwort generieren
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Mindestens 5 Zeichen"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Rolle</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="user">Benutzer (Standard)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1.5"
                >
                  {createLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Konto erstellen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Password Reset */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              onClick={() => setResetTargetUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Passwort neu setzen</h3>
                <p className="text-xs text-slate-400">Für Benutzer: <strong className="text-slate-200">{resetTargetUser.email}</strong></p>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Neues Passwort</label>
                  <button
                    type="button"
                    onClick={() => setResetPasswordVal("Neu" + Math.floor(1000 + Math.random() * 9000) + "!")}
                    className="text-[11px] text-purple-400 hover:underline"
                  >
                    Passwort generieren
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Mindestens 5 Zeichen eingeben"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition-all flex items-center space-x-1.5"
                >
                  {resetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Passwort speichern</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

