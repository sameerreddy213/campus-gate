import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import apiClient from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, formatDate } from "@/lib/exportCsv";
import type { OutingRequest } from "@/types";

export default function CollegeAdminRequestsPage() {
  const [requests, setRequests] = useState<OutingRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get('/college-admin/requests');
      setRequests(res.data.data.map((r: any) => ({ ...r, id: r._id })));
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load requests", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filtered = requests.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.rollNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToCsv<OutingRequest>(
      "outing_requests",
      [
        { header: "Student", value: (r) => r.studentName },
        { header: "Roll No", value: (r) => r.rollNumber },
        { header: "Purpose", value: (r) => r.purpose },
        { header: "Destination", value: (r) => r.destination },
        { header: "Out Date", value: (r) => formatDate(r.outDate) },
        { header: "Expected Return", value: (r) => formatDate(r.returnDate) },
        { header: "Warden", value: (r) => r.wardenName || "" },
        { header: "Status", value: (r) => r.status },
      ],
      filtered
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outing Requests"
        description="View all student outing requests"
        action={<Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}><Download className="mr-2 h-4 w-4" />Export CSV</Button>}
      />
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filter Status</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending-warden")}>Pending Warden</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("approved")}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("out")}>Out</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("returned")}>Returned</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Warden</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell>{r.rollNumber}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>Out: {formatDate(r.outDate) || "-"}</div>
                      <div>In: {formatDate(r.returnDate) || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.purpose}</TableCell>
                  <TableCell>{r.wardenName}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
