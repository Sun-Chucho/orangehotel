
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Smartphone,
  CreditCard,
  Save
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">System Settings</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Configure your preferences & workspace</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 font-bold px-8 h-12 shadow-lg shadow-primary/20">
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          {[
            { label: 'Profile', icon: User, active: true },
            { label: 'Notifications', icon: Bell },
            { label: 'Security', icon: Shield },
            { label: 'General', icon: Settings },
            { label: 'Billing', icon: CreditCard },
          ].map((item, i) => (
            <button 
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                item.active ? 'bg-primary text-white shadow-md' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-xl font-black">Account Information</CardTitle>
              <CardDescription>Manage your personal profile and display name.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest opacity-60">Full Name</Label>
                  <Input defaultValue="Alex Rivera" className="font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest opacity-60">Email Address</Label>
                  <Input defaultValue="alex.rivera@orange.hotel" className="font-medium" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold uppercase text-[10px] tracking-widest opacity-60">Work Department</Label>
                <Input defaultValue="Operations Management" readOnly className="font-medium bg-muted/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-xl font-black">Preferences</CardTitle>
              <CardDescription>Customization for your daily dashboard experience.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Real-time Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive instant alerts for new orders and check-ins.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Email Digest</Label>
                  <p className="text-xs text-muted-foreground">Receive a daily operational summary at end of shift.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Advanced Analytics</Label>
                  <p className="text-xs text-muted-foreground">Display complex trend charts on the overview page.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-xl font-black text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions related to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="font-black uppercase tracking-widest text-xs px-8 h-12">
                Deactivate Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
