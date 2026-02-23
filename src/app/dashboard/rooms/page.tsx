
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
          <h1 className="text-3xl font-black tracking-tight">Room Management</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Real-time status & occupancy control</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 font-bold">
          <Plus className="w-4 h-4 mr-2" /> Add New Room
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-green-700 uppercase">Available</p>
              <h3 className="text-xl font-black">{ROOMS.filter(r => r.status === 'available').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase">Occupied</p>
              <h3 className="text-xl font-black">{ROOMS.filter(r => r.status === 'occupied').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/50 border-orange-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-orange-700 uppercase">Cleaning</p>
              <h3 className="text-xl font-black">{ROOMS.filter(r => r.status === 'cleaning').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-50/50 border-gray-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center text-white">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700 uppercase">Maintenance</p>
              <h3 className="text-xl font-black">{ROOMS.filter(r => r.status === 'maintenance').length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none bg-white">
        <CardHeader className="border-b bg-muted/20 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by room # or type..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="font-bold uppercase text-[10px] tracking-widest">
                <Filter className="w-3 h-3 mr-2" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Room #</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Type</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Rate</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => (
                <TableRow key={room.id} className="hover:bg-muted/10">
                  <TableCell className="font-bold text-lg">{room.number}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium">{room.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(room.status)}
                      <span className={cn(
                        "text-xs font-black uppercase tracking-tight",
                        room.status === 'available' && "text-green-600",
                        room.status === 'occupied' && "text-blue-600",
                        room.status === 'cleaning' && "text-orange-600",
                        room.status === 'maintenance' && "text-gray-600",
                      )}>
                        {room.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-black">${room.price}/night</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
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
