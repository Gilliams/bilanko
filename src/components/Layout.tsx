import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10', end: true },
  { to: '/patients', label: 'Patients', icon: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.87M16 3.13a3.5 3.5 0 010 6.75' },
  { to: '/modeles', label: 'Modèles de bilans', icon: 'M9 4h6l1 2h3v15H5V6h3zM9 11h6M9 15h4' },
  { to: '/cabinet', label: 'Mon cabinet', icon: 'M4 21V5l8-3 8 3v16M4 21h16M9 21v-5h6v5M9 9h6M9 12.5h6' },
  { to: '/bibliotheque', label: 'Bibliothèque', icon: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21a2 2 0 012-2h13v2H6a2 2 0 01-2-2zM9 8h6' },
];

export function Layout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
            <rect width="32" height="32" rx="8" fill="var(--primary)" />
            <path d="M8 16h4l2-5 3 10 2-5h5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Bilanko</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={n.icon} />
              </svg>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-foot">Exercice — données stockées localement dans ce navigateur.</p>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
