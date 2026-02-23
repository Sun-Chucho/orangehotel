"use client";

import { useState } from 'react';
import { ROOMS, Room } from '@/app/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  BedDouble,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function RoomsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRooms = ROOMS.filter(room => 
    room.number.includes(searchTerm) || 
    room.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: Room['status']) => {
    switch (status) {
      case 'available': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'occupied': return <BedDouble className="w-4 h-4 text-blue-500" />;
      case 'cleaning': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Room Management</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Real-time status & occupancy control</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 font-black uppercase tracking-widest">
          <Plus className="w-4 h-4 mr-2" /> Add New Room
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-50/50 border-green-100 shadow-none">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Available</p>
              <h3 className="text-2xl font-black">{ROOMS.filter(r => r.status === 'available').length}</h3>
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
              <h3 className="text-2xl font-black">{ROOMS.filter(r => r.status === 'occupied').length}</h3>
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
              <h3 className="text-2xl font-black">{ROOMS.filter(r => r.status === 'cleaning').length}</h3>
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
              <h3 className="text-2xl font-black">{ROOMS.filter(r => r.status === 'maintenance').length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none bg-white">
        <CardHeader className="border-b bg-muted/10 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by room # or type..." 
                className="pl-10 h-11 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="font-black uppercase text-[10px] tracking-widest h-11 px-6">
                <Filter className="w-3 h-3 mr-2" /> Filter
              </Button>
            </div>
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
                    <Badge variant="secondary" className="font-black uppercase text-[10px] tracking-tighter bg-muted/50">{room.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(room.status)}
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        room.status === 'available' && "text-green-600",
                        room.status === 'occupied' && "text-blue-600",
                        room.status === 'cleaning' && "text-orange-600",
                        room.status === 'maintenance' && "text-gray-600",
                      )}>
                        {room.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black text-lg">TSh {room.price.toLocaleString()}/night</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="hover:bg-primary/10 text-muted-foreground hover:text-primary">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
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