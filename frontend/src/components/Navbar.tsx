import { NavLink } from "react-router-dom";
import { Boxes, PackagePlus, Search, Truck, Users } from "lucide-react";

const NAV_ITEMS = [
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/inventory-availability", label: "Restock", icon: Truck },
  { to: "/orders/new", label: "New Order", icon: PackagePlus },
  { to: "/orders/lookup", label: "Order Lookup", icon: Search },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-base font-semibold text-slate-800">
          Order <span className="text-blue-600">Fulfilment</span>
        </span>
        <nav className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
