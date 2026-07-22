import { Bell, LogOut, Plus, Search, UserRound, X } from "lucide-react";

export function Topbar({ currentDateLabel, onEditProfile, onNewAppointment, onSearchChange, onSignOut, searchPlaceholder, searchQuery, title, userEmail, userLabel }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{currentDateLabel}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <label className="search">
          <Search aria-hidden="true" size={17} />
          <input onChange={(event) => onSearchChange(event.target.value)} type="search" placeholder={searchPlaceholder} value={searchQuery} />
          {searchQuery && (
            <button aria-label="Cancella ricerca" className="search-clear" onClick={() => onSearchChange("")} type="button">
              <X size={15} />
            </button>
          )}
        </label>
        <button className="icon-button" type="button" aria-label="Notifiche" title="Notifiche">
          <Bell size={18} />
        </button>
        <button className="ghost-button profile-button" onClick={onEditProfile} type="button" title={userEmail}>
          <UserRound aria-hidden="true" size={17} />
          <span><strong>{userLabel}</strong><small>Profilo</small></span>
        </button>
        <button className="ghost-button user-button" onClick={onSignOut} type="button" title={userEmail}>
          <LogOut aria-hidden="true" size={17} /><span>Esci</span>
        </button>
        <button className="primary-button" onClick={onNewAppointment} type="button">
          <Plus aria-hidden="true" size={18} /><span>Nuovo lavoro</span>
        </button>
      </div>
    </header>
  );
}
