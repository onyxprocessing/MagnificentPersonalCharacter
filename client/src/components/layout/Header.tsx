import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Menu, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  title: string;
}

export default function Header({ onToggleMobileMenu, title }: HeaderProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Format the page title
  const getFormattedTitle = () => {
    const path = location === "/" ? "/dashboard" : location;
    return title || path.substring(1).charAt(0).toUpperCase() + path.substring(1).slice(1);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality based on the current page
    console.log(`Searching for: ${searchQuery}`);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex justify-between items-center px-4 md:px-6 py-4">
        {/* Mobile menu toggle button */}
        <div className="flex md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleMobileMenu} 
            className="text-gray-500"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Page title */}
        <h1 className="text-xl font-semibold text-gray-900">
          {getFormattedTitle()}
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* Search form */}
          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </form>
          
          {/* User profile */}
          <div className="flex items-center">
            <span className="text-gray-700 mr-2 hidden md:block">
              {user?.name || "Admin User"}
            </span>
            <Avatar>
              <AvatarImage src="" alt={user?.name || "User"} />
              <AvatarFallback className="bg-primary text-white">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
