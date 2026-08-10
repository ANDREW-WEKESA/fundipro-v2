import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TierBadge } from "./ui";

function NavItem({ to, label, icon, end, badge, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
          isActive ? "bg-terracotta text-white shadow-sm" : "text-sand/75 hover:bg-white/10 hover:text-white"
        }`
      }>
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && <span className="h-5 min-w-5 rounded-full bg-bad text-white text-[10px] font-bold flex items-center justify-center px-1">{badge}</span>}
    </NavLink>
  );
}

export default function AppShell({ nav, title, children, headerRight }) {
  const { user, logout, setTheme } = useAuth();
  const navigate = useNavigate();
  const [sideOpen, setSideOpen] = useState(false);
  const isDark = user?.theme === "dark";

  const closeSide = () => setSideOpen(false);

  return (
    <div className="min-h-screen flex" style={{background:"var(--bg)"}}>

      {/* Mobile overlay */}
      {sideOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={closeSide}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 w-64 flex flex-col
          transition-transform duration-300
          lg:relative lg:translate-x-0 lg:z-auto
          ${sideOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{background:"var(--sidebar)"}}
      >
        {/* Logo */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 font-display font-bold text-lg text-white">
            <span className="h-8 w-8 rounded-full bg-terracotta flex items-center justify-center text-white text-sm font-bold shrink-0">F</span>
            FundiPro
          </div>
          <button
            onClick={closeSide}
            className="lg:hidden text-white/60 hover:text-white text-xl p-1"
          >✕</button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => (
            <NavItem key={item.to} {...item} onClick={closeSide} />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-full flex items-center gap-2 text-xs text-sand/70 hover:text-white rounded-lg px-2 py-1.5 transition-colors"
          >
            <span>{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          <div>
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {user?.role === "fundi" && <TierBadge tier={user.tier} />}
              <span className="text-xs text-sand/60 capitalize">{user?.role}</span>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="mt-2 text-xs text-sand/60 hover:text-white underline transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header
          className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b"
          style={{background:"var(--card)", borderColor:"var(--border)"}}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSideOpen(true)}
              className="lg:hidden p-2 rounded-lg text-xl hover:bg-black/5 shrink-0"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="page-title text-lg sm:text-xl truncate">{title}</h1>
          </div>
          {headerRight && (
            <div className="flex items-center gap-2 shrink-0">{headerRight}</div>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
