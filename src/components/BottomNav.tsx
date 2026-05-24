import { Home, Library, MessageSquareQuote, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/library", icon: Library, label: "Library" },
  { path: "/debate", icon: MessageSquareQuote, label: "Debate" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto flex justify-around px-2 py-1.5">
        {tabs.map((t) => {
          const active = pathname === t.path || (t.path !== "/" && pathname.startsWith(t.path));
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              aria-label={t.label}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg min-h-11 min-w-11 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
export default BottomNav;
