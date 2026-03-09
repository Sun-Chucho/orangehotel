"use client";

import { useEffect, useMemo, useState } from "react";
import { Room, Role } from "@/app/lib/mock-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Search,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsDirector } from "@/hooks/use-is-director";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { readRoomsState, syncRoomsWithActiveBookings, updateRoomStatusById } from "@/app/lib/rooms-storage";
import { subscribeToSyncedStorageKey } from "@/app/lib/firebase-sync";
import { readCashierState, STORAGE_CASHIER_STATE, writeCashierState } from "@/app/lib/storage";

type StatusFilter = "all" | Room["status"];
type TypeFilter = "all" | Room["type"];

interface BookingRoomRecord {
  id: string;
  roomNumber: string;
  status?: "completed" | "credit" | "checked-out";
  createdAt?: number;
}

export default function RoomsPage() {
  const isDirector = useIsDirector();
  const { confirm, dialog } = useConfirmDialog();
  const [rooms, setRooms] = useState<Room[]>(readRoomsState());
  const [role, setRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  useEffect(() => {
    const savedRole = localStorage.getItem("orange-hotel-role") as Role | null;
    setRole(savedRole);

    const applyRoomSnapshot = (baseRooms?: Room[]) => {
      const cashierSnapshot = readCashierState<BookingRoomRecord>(
        "orange-hotel-cashier-transactions",
        "orange-hotel-cashier-seq",
        84920,
      );
      const nextRooms = syncRoomsWithActiveBookings(cashierSnapshot.transactions, baseRooms);
      setRooms(nextRooms);
    };

    applyRoomSnapshot();

    const unsubscribeRooms = subscribeToSyncedStorageKey<Room[]>("orange-hotel-rooms-state", (value) => {
      applyRoomSnapshot(Array.isArray(value) && value.length > 0 ? value : readRoomsState());
    });
    const unsubscribeCashier = subscribeToSyncedStorageKey(STORAGE_CASHIER_STATE, () => {
      applyRoomSnapshot();
    });

    return () => {
      unsubscribeRooms();
      unsubscribeCashier();
    };
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const inSearch = room.number.includes(searchTerm) || room.type.toLowerCase().includes(searchTerm.toLowerCase());
      const inType = typeFilter === "all" || room.type === typeFilter;
      const inStatus = statusFilter === "all" || room.status === statusFilter;
      return inSearch && inType && inStatus;
    });
  }, [rooms, searchTerm, statusFilter, typeFilter]);

  const counts = useMemo(
    () => ({
      available: rooms.filter((room) => room.status === "available").length,
      occupied: rooms.filter((room) => room.status === "occupied").length,
      cleaning: rooms.filter((room) => room.status === "cleaning").length,
      maintenance: rooms.filter((room) => room.status === "maintenance").length,
    }),
    [rooms],
  );

  const setRoomStatus = (roomId: string, roomNumber: string, status: Room["status"]) => {
    if (status !== "occupied") {
      const cashierSnapshot = readCashierState<BookingRoomRecord>(
        "orange-hotel-cashier-transactions",
        "orange-hotel-cashier-seq",
        84920,
      );
      const activeBooking = [...cashierSnapshot.transactions]
        .filter((booking) => booking.roomNumber === roomNumber && booking.status !== "checked-out")
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];

      if (activeBooking) {
        const nextTransactions = cashierSnapshot.transactions.map((booking) =>
          booking.id === activeBooking.id
            ? { ...booking, status: "checked-out" as const }
            : booking,
        );
        writeCashierState(nextTransactions, cashierSnapshot.receiptSeq);
      }
    }

    const nextRooms = updateRoomStatusById(roomId, status);
    setRooms(nextRooms);
  };

  const confirmAndSetRoomStatus = async (roomId: string, roomNumber: string, status: Room["status"]) => {
    if (isDirector) return;
    const labels: Record<Room["status"], string> = {
      available: "available",
      occupied: "occupied",
      cleaning: "cleaning",
      maintenance: "maintenance",
    };
    const approved = await confirm({
      title: "Update Room Status",
      description: `Are you sure you want to mark room ${roomNumber} as ${labels[status]}?`,
      actionLabel: "Update Room",
    });
    if (!approved) return;
    setRoomStatus(roomId, roomNumber, status);
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
      {dialog}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Room Management</h1>
          <p className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Real-time status and occupancy control</p>
        </div>
      </header>
      {isDirector && (
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="p-3 text-xs font-black uppercase tracking-widest text-emerald-700">
            Managing Director View: Read-only room analytics and occupancy visibility
          </CardContent>
        </Card>
      )}

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
          </div>

          <div className="flex flex-col gap-3">
            <Tabs value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
              <TabsList className="h-10">
                <TabsTrigger value="all" className="text-[10px] font-black uppercase tracking-widest">All</TabsTrigger>
                <TabsTrigger value="Standard" className="text-[10px] font-black uppercase tracking-widest">Standard</TabsTrigger>
                <TabsTrigger value="Platinum" className="text-[10px] font-black uppercase tracking-widest">Platinum</TabsTrigger>
              </TabsList>
            </Tabs>

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
                <TableHead className="font-black uppercase text-[10px] tracking-widest h-14 text-right">{isDirector ? "View" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((room) => (
                <TableRow key={room.id} className="hover:bg-muted/5 transition-colors border-muted/20">
                  <TableCell className="font-black text-xl">{room.number}</TableCell>
                  <TableCell>
                    <Badge className="font-black uppercase text-[10px] tracking-tighter bg-black text-white border-black hover:bg-black">
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
                    {isDirector ? (
                      <Badge variant="outline" className="font-black uppercase text-[10px] tracking-widest">Read Only</Badge>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant={room.status === "occupied" ? "default" : "outline"}
                          size="sm"
                          className="font-bold text-[10px]"
                          onClick={() => confirmAndSetRoomStatus(room.id, room.number, "occupied")}
                        >
                          Occ
                        </Button>
                        <Button
                          variant={room.status === "cleaning" ? "default" : "outline"}
                          size="sm"
                          className="font-bold text-[10px]"
                          onClick={() => confirmAndSetRoomStatus(room.id, room.number, "cleaning")}
                        >
                          Clean
                        </Button>
                        <Button
                          variant={room.status === "available" ? "default" : "outline"}
                          size="sm"
                          className="font-bold text-[10px]"
                          onClick={() => confirmAndSetRoomStatus(room.id, room.number, "available")}
                        >
                          Free
                        </Button>
                        <Button
                          variant={room.status === "maintenance" ? "default" : "outline"}
                          size="sm"
                          className="font-bold text-[10px]"
                          onClick={() => confirmAndSetRoomStatus(room.id, room.number, "maintenance")}
                        >
                          Fix
                        </Button>
                      </div>
                    )}
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
