import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Download, FileText } from "lucide-react";
import apiClient from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, formatDate } from "@/lib/exportCsv";
import type { OutingRequest, OutingStatus } from "@/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending-parent", label: "Pending Parent" },
  { value: "pending-warden", label: "Pending Warden" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "out", label: "Out" },
  { value: "returned", label: "Returned" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ReportsPage() {
  const [requests, setRequests] = useState<OutingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("all");

  const fetchRequests = async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, string> = {};
      if (fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
      }
      if (status !== "all") params.status = status;

      const res = await apiClient.get("/college-admin/reports", { params });
      const rows = res.data.data.map((r: any, i: number) => ({
        id: r._id || String(i),
        studentName: r.studentName || "Unknown",
        rollNumber: r.rollNumber || "",
        purpose: r.purpose,
        destination: r.destination,
        outDate: r.outDate,
        returnDate: r.returnDate,
        status: r.status,
        wardenName: r.wardenName,
      }));
      setRequests(rows);
    } catch (err) {
      console.error(err);
      setError(true);
      toast({ title: "Error", description: "Failed to load reports", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    if (requests.length === 0) return;
    exportToCsv<any>(
      "outing_report",
      [
        { header: "Student", value: (r) => r.studentName },
        { header: "Roll No", value: (r) => r.rollNumber },
        { header: "Warden", value: (r) => r.wardenName || "" },
        { header: "Purpose", value: (r) => r.purpose },
        { header: "Destination", value: (r) => r.destination },
        { header: "Out Date", value: (r) => formatDate(r.outDate) },
        { header: "Expected Return", value: (r) => formatDate(r.returnDate) },
        { header: "Status", value: (r) => r.status },
      ],
      requests
    );
    toast({ title: "Report Exported", description: "CSV file downloaded successfully" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Filter and export outing data"
        action={
          <Button onClick={handleExport} disabled={requests.length === 0}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchRequests} variant="secondary">Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Outing Summary ({requests.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <EmptyState icon={FileText} title="Couldn't load reports" description="Try applying filters again." action={<Button onClick={fetchRequests}>Retry</Button>} />
          ) : requests.length === 0 ? (
            <EmptyState icon={FileText} title="No data available" description="No requests match the selected filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Out Date</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{r.rollNumber}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.purpose}</TableCell>
                    <TableCell>{formatDate(r.outDate) || "-"}</TableCell>
                    <TableCell>{formatDate(r.returnDate) || "-"}</TableCell>
                    <TableCell><StatusBadge status={r.status as OutingStatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
