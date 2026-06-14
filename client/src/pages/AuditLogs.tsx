import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ScrollText, Download, RefreshCw } from "lucide-react";
import apiClient from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { exportToCsv, formatDate } from "@/lib/exportCsv";
import type { AuditLog } from "@/types";

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const endpoint = user?.role === "dev-admin" ? "/dev-admin/audit-logs" : "/college-admin/audit-logs";

  const fetchLogs = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get(endpoint);
      setLogs(res.data.data);
    } catch (err) {
      console.error("Failed to load audit logs", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const actorName = (log: AuditLog) =>
    typeof log.userId === "object" && log.userId ? log.userId.name : "System";

  const handleExport = () => {
    exportToCsv<AuditLog>(
      "audit-logs",
      [
        { header: "Time", value: (l) => formatDate(l.createdAt) },
        { header: "Action", value: (l) => l.action },
        { header: "Actor", value: (l) => actorName(l) },
        { header: "IP", value: (l) => l.ip || "" },
        { header: "Details", value: (l) => JSON.stringify(l.details || {}) },
      ],
      logs
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Record of key actions across the system"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={handleExport} disabled={logs.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={ScrollText}
              title="Couldn't load audit logs"
              description="There was a problem fetching the logs."
              action={<Button onClick={fetchLogs}>Try again</Button>}
            />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No activity yet"
              description="Audit entries will appear here as actions are performed."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{actorName(log)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ip || "-"}</TableCell>
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
