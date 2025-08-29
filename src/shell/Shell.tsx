import { NavLink, Outlet } from 'react-router-dom';

export default function Shell() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Topbar */}
      <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-600" />
            <div className="text-sm font-semibold tracking-wide">KANAL KONTROL BOTU ADMIN</div>
          </div>

          {/* Artık burada CTA yok; sadece nav */}
          <nav className="flex items-center gap-2 text-sm">
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/kanal-kontrol">Kanal Kontrol Botu</NavItem>
          </nav>
        </div>
      </header>

      {/* Page */}
      <main className="mx-auto max-w-screen-2xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-xl px-3 py-2 ${isActive ? 'bg-neutral-800 text-emerald-300' : 'text-neutral-300 hover:bg-neutral-800'}`
      }
    >
      {children}
    </NavLink>
  );
}
