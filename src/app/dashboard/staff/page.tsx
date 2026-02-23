
"use client";

import { USERS } from '@/app/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  ShieldCheck,
  MoreVertical
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Human resources & shift planning</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 font-bold">
          <Plus className="w-4 h-4 mr-2" /> Add Staff Member
        </Button>
      </header>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search staff by name or role..." className="pl-10" />
        </div>
        <Button variant="outline" className="font-bold uppercase tracking-tight text-xs px-6">Filter</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {USERS.map((user) => (
          <Card key={user.id} className="group hover:shadow-xl transition-all border-none shadow-sm relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -mr-4 -mt-4 group-hover:bg-primary/10 transition-colors" />
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <Avatar className="w-16 h-16 rounded-2xl shadow-lg border-2 border-white">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary text-white font-black">{user.name[0]}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-xl font-black tracking-tight">{user.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest bg-black text-white px-2">
                    {user.role}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> On Duty
                  </span>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                  <Phone className="w-3 h-3" /> +1 (555) 000-00{user.id.slice(-1)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                  <Mail className="w-3 h-3" /> {user.name.toLowerCase().replace(' ', '.')}@orange.hotel
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                  <Calendar className="w-3 h-3" /> Full Time • Shift {user.id === 'u4' ? 'Night' : 'Day'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6">
                <Button size="sm" variant="outline" className="font-bold text-[10px] uppercase tracking-widest">Profile</Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold text-[10px] uppercase tracking-widest">Schedule</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
