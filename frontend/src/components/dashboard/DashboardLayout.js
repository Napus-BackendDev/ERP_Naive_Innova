"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Avatar } from "@heroui/react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { 
  LayoutDashboard, Target, FlaskConical, Package,
  Search, LogOut, Bell, LayoutGrid, ChevronDown, HelpCircle, Users, Settings, ScrollText, Calendar, ClipboardList, Menu, BookUser, Lightbulb, Boxes
} from "lucide-react";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Hamburger: on desktop it collapses the rail; on mobile it opens the drawer.
  const handleMenuToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  };

  const checkUserSession = useCallback(async () => {
      setChecking(true);
      setSessionError("");
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await api.get("/auth/me");
        if (!res.data.user) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
        } else {
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setChecking(false);
        }
      } catch (err) {
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        const isInvalidSession = status === 401 || code === "PENDING_APPROVAL" || code === "ACCESS_REJECTED";

        if (isInvalidSession) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
          return;
        }

        // Keep valid client session when backend/network fails temporarily.
        console.error("Session check failed:", err);
        setSessionError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
        setChecking(false);
      }
  }, [router]);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    fetch(`${api.defaults.baseURL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      keepalive: true
    }).catch(() => {});

    window.location.replace("/login?loggedOut=1");
  };

  // Ordered to match the actual work flow: Sales → BOM → Packaging → Production
  // → Finished Goods, then the admin utilities.
  const menuItems = [
    { id: "cockpit", label: "Dashboard", icon: LayoutDashboard, path: "/admin/cockpit" },
    { id: "sales", label: "Sales", icon: Target, path: "/admin/sales" },
    { id: "rnd", label: "R&D", icon: Lightbulb, path: "/admin/rnd" },
    { id: "production", label: "Production", icon: ClipboardList, path: "/admin/production" },
    { id: "stock", label: "Stock", icon: Boxes, path: "/admin/stock" },
    { id: "users", label: "Users", icon: Users, path: "/admin/users", adminOnly: true },
    { id: "customer-log", label: "บันทึกลูกค้า", icon: BookUser, path: "/admin/customer-log" },
    { id: "logs", label: "Activity Logs", icon: ScrollText, path: "/admin/logs" },
  ];

  const filteredMenu = menuItems.filter((item) =>
    (!item.adminOnly || user?.role === "Admin") &&
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Active check helper
  const isItemActive = (item) => {
    if (item.path === "/admin/cockpit") {
      return pathname === "/admin/cockpit" || pathname === "/admin";
    }
    return pathname.startsWith(item.path);
  };

  const getHeaderTitle = () => {
    if (pathname === "/admin/cockpit" || pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/sales")) return "Sales";
    if (pathname.startsWith("/admin/rnd")) return "R&D";
    if (pathname.startsWith("/admin/production")) return "Production Order";
    if (pathname.startsWith("/admin/users")) return "User Management";
    if (pathname.startsWith("/admin/stock")) return "Stock";
    if (pathname.startsWith("/admin/logs")) return "Activity Logs";
    if (pathname.startsWith("/admin/support")) return "Support & Helpdesk";
    if (pathname.startsWith("/admin/settings")) return "Settings";
    return "Admin";
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center w-full">
        <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-green-600 animate-spin" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center w-full p-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">เชื่อมต่อระบบไม่สำเร็จ</h1>
          <p className="mt-2 text-sm text-slate-500">Session ยังไม่ถูกลบ กรุณาลองโหลดข้อมูลใหม่</p>
          <button
            type="button"
            onClick={checkUserSession}
            className="mt-5 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f8fafc] text-slate-900 flex w-full">
      {/* Mobile backdrop — closes the drawer on tap */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Nav — off-canvas drawer on mobile, static rail (collapsible) on lg+ */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 p-6 overflow-y-auto transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:z-40 lg:translate-x-0 lg:overflow-visible ${collapsed ? "lg:w-20 lg:p-4" : "lg:w-64 lg:p-6"} border-r border-slate-200 bg-white flex flex-col justify-between lg:transition-all lg:duration-300 shrink-0`}>

        <div className="flex flex-col gap-6">
          {/* Brand — centred, no plate behind it, so it sits straight on the
              sidebar. That means the artwork itself has to carry the contrast:
              brand-light / brand-dark are swapped in globals.css off the .dark
              class (this app generates no `dark:` utilities). */}
          <div className="py-3 flex items-center justify-center">
            {collapsed ? (
              <>
                <img src="/brand-mark.png" alt="Naive Innova" className="brand-light h-10 w-10 object-contain" />
                <img src="/brand-mark-dark.png" alt="Naive Innova" className="brand-dark h-10 w-10 object-contain" />
              </>
            ) : (
              <>
                <img src="/logo-wordmark.png" alt="Naive Innova" className="brand-light h-16 w-auto object-contain" />
                <img src="/logo-dark.png" alt="Naive Innova" className="brand-dark h-16 w-auto object-contain" />
              </>
            )}
          </div>

          {/* Nav List */}
          <nav className="flex flex-col gap-1.5">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.path)}
                  className={`flex items-center gap-3 px-4 py-3 w-full text-left min-h-[44px] rounded-xl transition-all duration-200 cursor-pointer ${
                    collapsed ? "lg:w-12 lg:h-12 lg:justify-center lg:px-0 lg:gap-0 lg:mx-auto" : ""
                  } ${
                    isActive
                      ? "bg-green-600 text-white shadow-md shadow-green-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  title={item.label}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span className={`text-xs font-semibold ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-3">
          {/* Support Button */}
          <button
            onClick={() => router.push("/admin/support")}
            className={`flex items-center gap-3 px-4 py-3 w-full text-left min-h-[44px] rounded-xl transition-all duration-200 cursor-pointer ${
              collapsed ? "lg:w-12 lg:h-12 lg:justify-center lg:px-0 lg:gap-0 lg:mx-auto" : ""
            } ${
              pathname.startsWith("/admin/support")
                ? "bg-green-600 text-white shadow-md shadow-green-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title="Support"
          >
            <HelpCircle className={`h-4 w-4 shrink-0 ${pathname.startsWith("/admin/support") ? "text-white" : "text-slate-500"}`} />
            <span className={`text-xs font-semibold ${collapsed ? "lg:hidden" : ""}`}>Support</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => router.push("/admin/settings")}
            className={`flex items-center gap-3 px-4 py-3 w-full text-left min-h-[44px] rounded-xl transition-all duration-200 cursor-pointer ${
              collapsed ? "lg:w-12 lg:h-12 lg:justify-center lg:px-0 lg:gap-0 lg:mx-auto" : ""
            } ${
              pathname.startsWith("/admin/settings")
                ? "bg-green-600 text-white shadow-md shadow-green-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title="Settings"
          >
            <Settings className={`h-4 w-4 shrink-0 ${pathname.startsWith("/admin/settings") ? "text-white" : "text-slate-500"}`} />
            <span className={`text-xs font-semibold ${collapsed ? "lg:hidden" : ""}`}>Settings</span>
          </button>

          {/* Divider Line */}
          <div className="border-t border-slate-200 my-1 w-full" />

          {/* User Card */}
          <div className={`flex flex-row items-center justify-between ${collapsed ? "lg:flex-col lg:items-center lg:gap-3" : ""}`}>
            <div className="flex items-center gap-2">
              {user?.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name || "User Profile"} 
                  className="h-8 w-8 rounded-full object-cover border border-slate-200 shadow-2xs flex-shrink-0" 
                  onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                />
              ) : null}
              <div 
                className="h-8 w-8 rounded-full bg-green-100 text-green-800 font-bold text-xs flex items-center justify-center border border-green-200 flex-shrink-0"
                style={{ display: user?.avatarUrl ? "none" : "flex" }}
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className={`flex flex-col text-left ${collapsed ? "lg:hidden" : ""}`}>
                <span className="text-xs font-bold text-slate-700 leading-tight">{user?.name}</span>
                <span className="text-[13px] text-slate-400 font-medium">{user?.role}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center justify-center p-2 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer border border-transparent"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace — dvh, not vh: on a phone 100vh is the height WITHOUT the
          browser address bar, so the last rows of every page sat under it with
          no way to scroll (this wrapper is overflow-hidden). */}
      <div className="flex-grow flex flex-col h-dvh overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggle — opens drawer on mobile, collapses rail on desktop */}
            <button
              onClick={handleMenuToggle}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all cursor-pointer border border-slate-200 shadow-2xs shrink-0"
              title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
              aria-label="เปิด/ปิดเมนู"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Page title — visible on mobile where the sidebar brand is hidden */}
            <span className="text-sm font-bold text-slate-800 truncate lg:hidden">{getHeaderTitle()}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Light/dark switcher — sits beside the bell per the owner's spec */}
            <ThemeToggle />
            {/* Notifications Button */}
            <button
              onClick={() => router.push("/admin/logs")}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors relative cursor-pointer border border-transparent"
              title="Activity Logs"
            >
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable View Content wrapper */}
        <div className="flex-grow p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
