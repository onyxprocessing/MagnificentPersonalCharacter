import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  LogOut,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import trueAminosLogo from "../../assets/true-aminos-logo.png";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
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
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden" onClick={onClose}>
      <div 
        className="bg-sidebar text-sidebar-foreground w-64 h-full" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={trueAminosLogo}
              alt="True Aminos Logo"
              className="h-8 w-auto"
            />
          </div>
          <button onClick={onClose} className="text-sidebar-foreground p-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-8">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path} className="relative">
                <Link href={item.path}>
                  <a
                    className={cn(
                      "flex items-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-primary/20 py-3 px-4 rounded transition-all",
                      isActive(item.path) && "text-sidebar-foreground bg-sidebar-primary/20"
                    )}
                    onClick={onClose}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <button 
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex items-center justify-center w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-primary/20 py-2 px-4 rounded transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
