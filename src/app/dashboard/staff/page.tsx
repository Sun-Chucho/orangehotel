"use client";

import { useMemo, useState } from "react";
import { USERS, Role } from "@/app/lib/mock-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Mail,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StaffRoleFilter = "all" | Role;

interface StaffMember {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  phone: string;
  email: string;
  shift: "Day" | "Night";
}

const ROLE_OPTIONS: Role[] = ["manager", "director", "inventory", "cashier", "kitchen", "barista"];

function toEmail(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, ".")}@orange.hotel`;
}

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>(
    USERS.map((user) => ({
      ...user,
      phone: `+1 (555) 000-00${user.id.slice(-1)}`,
      email: toEmail(user.name),
      shift: user.id === "u4" ? "Night" : "Day",
    })),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRoleFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("cashier");
  const [newShift, setNewShift] = useState<"Day" | "Night">("Day");

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const inSearch =
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase());
      const inRole = roleFilter === "all" || member.role === roleFilter;
      return inSearch && inRole;
    });
  }, [members, roleFilter, searchTerm]);

  const addMember = () => {
    if (newName.trim().length === 0) return;

    const id = `u-${Date.now()}`;
    const member: StaffMember = {
      id,
      name: newName.trim(),
      role: newRole,
      avatar: "/logo.jpeg",
      phone: `+1 (555) 300-${Math.floor(1000 + Math.random() * 9000)}`,
      email: toEmail(newName.trim()),
      shift: newShift,
    };

    setMembers((current) => [member, ...current]);
    setNewName("");
    setNewRole("cashier");
    setNewShift("Day");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Human resources and shift planning</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 font-bold" onClick={() => setShowAddForm((current) => !current)}>
          <Plus className="w-4 h-4 mr-2" /> {showAddForm ? "Close Form" : "Add Staff Member"}
        </Button>
      </header>

      {showAddForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Full name" />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as Role)}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={newShift}
              onChange={(event) => setNewShift(event.target.value as "Day" | "Night")}
            >
              <option value="Day">Day Shift</option>
              <option value="Night">Night Shift</option>
            </select>
            <Button className="font-bold" onClick={addMember}>Save Staff</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search staff by name or role..." className="pl-10" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>

        <Tabs value={roleFilter} onValueChange={(value) => setRoleFilter(value as StaffRoleFilter)}>
          <TabsList className="h-10">
            <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
            <TabsTrigger value="manager" className="text-[10px] font-black uppercase tracking-widest">Manager</TabsTrigger>
            <TabsTrigger value="cashier" className="text-[10px] font-black uppercase tracking-widest">Reception</TabsTrigger>
            <TabsTrigger value="kitchen" className="text-[10px] font-black uppercase tracking-widest">Kitchen</TabsTrigger>
            <TabsTrigger value="barista" className="text-[10px] font-black uppercase tracking-widest">Barista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="group hover:shadow-xl transition-all border-none shadow-sm relative overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <Avatar className="w-16 h-16 rounded-2xl shadow-lg border-2 border-white">
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="bg-primary text-white font-black">{member.name[0]}</AvatarFallback>
              </Avatar>
              <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-white border-primary/30">
                {member.shift}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-xl font-black tracking-tight">{member.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest bg-black text-white px-2">
                    {member.role}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> On Duty
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground font-bold hover:text-primary">
                  <Phone className="w-3 h-3" /> {member.phone}
                </a>
                <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs text-muted-foreground font-bold hover:text-primary">
                  <Mail className="w-3 h-3" /> {member.email}
                </a>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                  <Calendar className="w-3 h-3" /> Full Time | Shift {member.shift}
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

      {filteredMembers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center opacity-50">
            <Users className="w-10 h-10 mx-auto mb-3" />
            <p className="font-black uppercase tracking-widest text-xs">No staff match this filter</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
