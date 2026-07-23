import { Building2, CircleGauge } from "lucide-react";
import { navItems } from "../../data.js";
import { navIcons } from "../../utils/constants.js";

export function Sidebar({ activeView, onViewChange, userLabel }) {
  return (
    <aside className="sidebar" aria-label="Navigazione principale">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <Building2 size={22} strokeWidth={2.2} />
        </div>
        <div>
          <strong>CRM Gei</strong>
          <span>Gestionale cantieri</span>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => {
          const NavIcon = navIcons[item.id] || CircleGauge;
          return (
            <button
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              type="button"
            >
              <span aria-hidden="true"><NavIcon size={18} strokeWidth={2} /></span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot"></span>
        <div>
          <strong>Team operativo</strong>
          <span>{userLabel || "Accesso Supabase"}</span>
        </div>
      </div>
    </aside>
  );
}
