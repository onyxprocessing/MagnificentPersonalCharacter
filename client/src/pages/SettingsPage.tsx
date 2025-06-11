import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileSidebar from "@/components/layout/MobileSidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  
  // General settings form state
  const [storeName, setStoreName] = useState("True Aminos");
  const [storeEmail, setStoreEmail] = useState("info@trueaminos.com");
  const [storePhone, setStorePhone] = useState("(615) 555-1234");
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderConfirmations, setOrderConfirmations] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  
  // API settings
  const [airtableApiKey, setAirtableApiKey] = useState(process.env.AIRTABLE_API_KEY || "");
  const [airtableBaseId, setAirtableBaseId] = useState(process.env.AIRTABLE_BASE_ID || "");
  
  const handleGeneralSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Settings Saved",
      description: "Your general settings have been updated."
    });
  };
  
  const handleNotificationSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Notification Settings Saved",
      description: "Your notification preferences have been updated."
    });
  };
  
  const handleApiSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "API Settings Saved",
      description: "Your API configuration has been updated."
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for desktop */}
      <Sidebar />
      
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          title="Settings"
        />
        
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Manage your store information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleGeneralSave}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="store-name">Store Name</Label>
                          <Input 
                            id="store-name" 
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="store-email">Support Email</Label>
                          <Input 
                            id="store-email" 
                            type="email"
                            value={storeEmail}
                            onChange={(e) => setStoreEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="store-phone">Support Phone</Label>
                          <Input 
                            id="store-phone" 
                            value={storePhone}
                            onChange={(e) => setStorePhone(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <CardFooter className="flex justify-end pt-6 px-0">
                      <Button type="submit">Save Changes</Button>
                    </CardFooter>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Manage when and how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleNotificationSave}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="email-notifications">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive email notifications for important events
                          </p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="order-confirmations">Order Confirmations</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications when new orders are placed
                          </p>
                        </div>
                        <Switch
                          id="order-confirmations"
                          checked={orderConfirmations}
                          onCheckedChange={setOrderConfirmations}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="stock-alerts">Stock Alerts</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when product inventory is low
                          </p>
                        </div>
                        <Switch
                          id="stock-alerts"
                          checked={stockAlerts}
                          onCheckedChange={setStockAlerts}
                        />
                      </div>
                    </div>
                    
                    <CardFooter className="flex justify-end pt-6 px-0">
                      <Button type="submit">Save Preferences</Button>
                    </CardFooter>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* API Settings */}
            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Manage your API integrations and credentials
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleApiSave}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="airtable-api-key">Airtable API Key</Label>
                        <Input 
                          id="airtable-api-key" 
                          type="password"
                          value={airtableApiKey}
                          onChange={(e) => setAirtableApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Your Airtable API key is used to fetch and update your store data
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="airtable-base-id">Airtable Base ID</Label>
                        <Input 
                          id="airtable-base-id" 
                          value={airtableBaseId}
                          onChange={(e) => setAirtableBaseId(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <CardFooter className="flex justify-end pt-6 px-0">
                      <Button type="submit">Save API Settings</Button>
                    </CardFooter>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
