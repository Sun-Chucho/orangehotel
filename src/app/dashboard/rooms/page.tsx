"use client";

import { useMemo, useState } from "react";
import { ROOMS, Room } from "@/app/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BedDouble,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatusFilter = "all" | Room["status"];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(ROOMS.map((room) => ({ ...room })));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [newNumber, setNewNumber] = useState("");
  const [newType, setNewType] = useState<Room["type"]>("Standard");
  const [newPrice, setNewPrice] = useState("150");

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const inSearch = room.number.includes(searchTerm) || room.type.toLowerCase().includes(searchTerm.toLowerCase());
      const inStatus = statusFilter === "all" || room.status === statusFilter;
      return inSearch && inStatus;
    });
  }, [rooms, searchTerm, statusFilter]);

  const counts = useMemo(
    () => ({
      available: rooms.filter((room) => room.status === "available").length,
      occupied: rooms.filter((room) => room.status === "occupied").length,
      cleaning: rooms.filter((room) => room.status === "cleaning").length,
      maintenance: rooms.filter((room) => room.status === "maintenance").length,
    }),
    [rooms],
  );

  const setRoomStatus = (roomId: string, status: Room["status"]) => {
    setRooms((current) => current.map((room) => (room.id === roomId ? { ...room, status } : room)));
  };

  const addRoom = () => {
    const price = Number(newPrice);
    if (newNumber.trim().length === 0 || Number.isNaN(price) || price <= 0) return;

    const exists = rooms.some((room) => room.number === newNumber.trim());
    if (exists) return;

    const room: Room = {
      id: `r-${Date.now()}`,
      number: newNumber.trim(),
      type: newType,
      status: "available",
      price,
    };

    setRooms((current) => [room, ...current]);
    setNewNumber("");
    setNewType("Standard");
    setNewPrice("150");
  };

  const getStatusIcon = (status: Room["status"]) => {
    switch (status) {
      case "available":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "occupied":
        return <BedDouble className="w-4 h-4 text-blue-500" />;
      case "cleaning":
        return <Clock className="w-4 h-4 text-orange-500" />;
      case "maintenance":
        return <Wrench className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Room Management</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Real-time status and occupancy control</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input value={newNumber} onChange={(event) => setNewNumber(event.target.value)} placeholder="Room #" className="h-10" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={newType} onChange={(event) => setNewType(event.target.value as Room["type"])}>
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </select>
          <Input value={newPrice} onChange={(event) => setNewPrice(event.target.value)} type="number" min="1" placeholder="Price" className="h-10" />
          <Button className="bg-primary hover:bg-primary/90 font-black uppercase tracking-widest h-10" onClick={addRoom}>
            <Plus className="w-4 h-4 mr-2" /> Add Room
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-50/50 border-green-100 shadow-none">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Available</p>
              <h3 className="text-2xl font-black">{counts.available}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100 shadow-none">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Occupied</p>
              <h3 className="text-2xl font-black">{counts.occupied}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-100 shadow-none">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Cleaning</p>
              <h3 className="text-2xl font-black">{counts.cleaning}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50/50 border-gray-100 shadow-none">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center text-white shadow-lg shadow-gray-500/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Maintenance</p>
              <h3 className="text-2xl font-black">{counts.maintenance}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none bg-white">
        <CardHeader className="border-b bg-muted/10 px-6 py-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by room # or type..."
                className="pl-10 h-11 shadow-sm"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <TabsList className="h-10">
                <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                <TabsTrigger value="available" className="text-[10px] font-black uppercase tracking-widest">Available</TabsTrigger>
                <TabsTrigger value="occupied" className="text-[10px] font-black uppercase tracking-widest">Occupied</TabsTrigger>
                <TabsTrigger value="cleaning" className="text-[10px] font-black uppercase tracking-widest">Cleaning</TabsTrigger>
                <TabsTrigger value="maintenance" className="text-[10px] font-black uppercase tracking-widest">Maintenance</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-14">Room #</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-14">Type</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-14">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-14 text-right">Rate</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-14 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => (
                <TableRow key={room.id} className="hover:bg-muted/5 transition-colors border-muted/20">
                  <TableCell className="font-black text-xl">{room.number}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-black uppercase text-[10px] tracking-tighter bg-muted/50">
                      {room.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(room.status)}
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          room.status === "available" && "text-green-600",
                          room.status === "occupied" && "text-blue-600",
                          room.status === "cleaning" && "text-orange-600",
                          room.status === "maintenance" && "text-gray-600",
                        )}
                      >
                        {room.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-lg">TSh {room.price.toLocaleString()}/night</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" className="font-bold text-[10px]" onClick={() => setRoomStatus(room.id, "occupied")}>Occ</Button>
                      <Button variant="outline" size="sm" className="font-bold text-[10px]" onClick={() => setRoomStatus(room.id, "cleaning")}>Clean</Button>
                      <Button variant="outline" size="sm" className="font-bold text-[10px]" onClick={() => setRoomStatus(room.id, "available")}>Free</Button>
                      <Button variant="outline" size="sm" className="font-bold text-[10px]" onClick={() => setRoomStatus(room.id, "maintenance")}>Fix</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
