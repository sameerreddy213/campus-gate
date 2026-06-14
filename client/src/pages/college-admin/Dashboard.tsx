import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Shield, ClipboardList, CheckCircle, RefreshCcw, Inbox } from "lucide-react";
import apiClient from "@/lib/api";
import { formatDate } from "@/lib/exportCsv";
import type { OutingRequest } from "@/types";

interface DashboardStats {
  students: number;
  wardens: number;
  pendingRequests: number;
  approvedToday: number;
  recentRequests: (OutingRequest & { date?: string })[];
}

export default function CollegeAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    wardens: 0,
    pendingRequests: 0,
    approvedToday: 0,
    recentRequests: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/college-admin/dashboard');
      setStats(res.data.data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Dashboard"
        description="Overview"
        action={
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Students" value={stats.students} icon={GraduationCap} />
          <StatCard title="Wardens" value={stats.wardens} icon={Shield} />
          <StatCard title="Pending Requests" value={stats.pendingRequests} change={stats.pendingRequests > 0 ? "Needs attention" : ""} changeType="negative" icon={ClipboardList} />
          <StatCard title="Approved Today" value={stats.approvedToday} icon={CheckCircle} />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Requests</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : stats.recentRequests.length === 0 ? (
            <EmptyState icon={Inbox} title="No requests yet" description="New outing requests will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentRequests.map((r) => (
                  <TableRow key={r.id || (r as any)._id}>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.purpose}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(r.date || r.createdAt) || "-"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
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
