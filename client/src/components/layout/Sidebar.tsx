import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  UserCheck,
  Settings, 
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import trueAminosLogo from "../../assets/true-aminos-logo.png";

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: ShoppingCart, label: "Orders", path: "/orders" },
    { icon: Package, label: "Products", path: "/products" },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: UserCheck, label: "Affiliates", path: "/affiliates" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="bg-sidebar text-sidebar-foreground w-64 flex-shrink-0 hidden md:flex flex-col h-screen">
      <div className="p-6 flex items-center justify-start">
        <img 
          src={trueAminosLogo}
          alt="True Aminos Logo"
          className="h-16 w-auto object-contain"
        />
      </div>
      
      <nav className="mt-8 flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path} className="relative">
              <Link href={item.path}>
                <a
                  className={cn(
                    "flex items-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-primary/20 py-3 px-4 rounded transition-all",
                    isActive(item.path) && "text-sidebar-foreground bg-sidebar-primary/20"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <button 
          onClick={logout}
          className="flex items-center justify-center w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-primary/20 py-2 px-4 rounded transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
