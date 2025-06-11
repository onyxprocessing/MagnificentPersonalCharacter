import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import trueAminosLogo from "../assets/true-aminos-logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("jack@lendousa.com");
  const [password, setPassword] = useState("Fra@1705");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Handle login click
  const handleLoginClick = () => {
    // Store hardcoded user in localStorage
    const user = {
      email: "jack@lendousa.com",
      name: "Jack Spicer"
    };
    localStorage.setItem("user", JSON.stringify(user));
    
    // Direct navigation to dashboard
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-blue-300 p-4 md:p-6">
      <Card className="w-full max-w-md bg-white rounded-xl shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto max-w-[220px] mb-4">
              <img 
                src={trueAminosLogo} 
                alt="True Aminos Logo" 
                className="w-full h-auto" 
              />
            </div>
            <p className="text-gray-500 text-lg">Admin Dashboard</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value="jack@lendousa.com"
                readOnly
                className="w-full"
              />
            </div>
            
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value="Fra@1705"
                readOnly
                className="w-full"
              />
            </div>
            
            <Button 
              onClick={handleLoginClick}
              className="w-full"
            >
              Login to Dashboard
            </Button>
            
            
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
