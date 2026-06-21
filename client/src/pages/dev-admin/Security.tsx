import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  ShieldAlert, ShieldX, Gauge, Network, RefreshCw, Download,
  Users, Building2, ClipboardList, CalendarClock,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import apiClient from "@/lib/api";
import { exportToCsv, formatDate } from "@/lib/exportCsv";
import type { SecurityEvent, SecurityEventType, SecurityOverview } from "@/types";

// Display metadata per event type: human label + chart/badge colour.
const TYPE_META: Record<SecurityEventType, { label: string; color: string }> = {
  login_failed: { label: "Failed Login", color: "hsl(0, 72%, 51%)" },
  otp_failed: { label: "Failed OTP", color: "hsl(25, 90%, 55%)" },
  unauthorized: { label: "Unauthorized", color: "hsl(45, 93%, 47%)" },
  forbidden: { label: "Forbidden", color: "hsl(280, 60%, 55%)" },
  rate_limited: { label: "Rate Limited", color: "hsl(217, 91%, 60%)" },
  injection_blocked: { label: "Injection Blocked", color: "hsl(340, 75%, 50%)" },
  other: { label: "Other", color: "hsl(220, 9%, 55%)" },
};

const CHART_TYPES: SecurityEventType[] = [
  "login_failed", "unauthorized", "forbidden", "rate_limited", "otp_failed", "injection_blocked",
];

const SEVERITY_VARIANT: Record<string, string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

const typeLabel = (t: string) => TYPE_META[t as SecurityEventType]?.label ?? t;

const actorName = (e: SecurityEvent) =>
  typeof e.userId === "object" && e.userId ? e.userId.name : e.identifier || "—";

export default function SecurityPage() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get("/dev-admin/security");
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to load security overview", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = () => {
    if (!data) return;
    exportToCsv<SecurityEvent>(
      "security-events",
      [
        { header: "Time", value: (e) => formatDate(e.createdAt) },
        { header: "Type", value: (e) => typeLabel(e.type) },
        { header: "Severity", value: (e) => e.severity },
        { header: "IP", value: (e) => e.ip || "" },
        { header: "Target", value: (e) => e.identifier || "" },
        { header: "Method", value: (e) => e.method || "" },
        { header: "Path", value: (e) => e.path || "" },
        { header: "Actor", value: (e) => actorName(e) },
      ],
      data.recent
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Security & Logs" description="Threat monitoring and platform activity" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[320px]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Security & Logs" description="Threat monitoring and platform activity" />
        <Card>
          <CardContent>
            <EmptyState
              icon={ShieldAlert}
              title="Couldn't load security data"
              description="There was a problem fetching the security overview."
              action={<Button onClick={fetchData}>Try again</Button>}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const t24 = data.summary.last24h.byType;
  const hasEvents = data.summary.last7d.total > 0 || data.recent.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Logs"
        description="Threat monitoring and platform activity"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={handleExport} disabled={data.recent.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />

      {/* Threat indicators (last 24h) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Failed Logins (24h)" value={(t24.login_failed || 0) + (t24.otp_failed || 0)} icon={ShieldX} />
        <StatCard title="Unauthorized / Forbidden (24h)" value={(t24.unauthorized || 0) + (t24.forbidden || 0)} icon={ShieldAlert} />
        <StatCard title="Rate-Limit Blocks (24h)" value={t24.rate_limited || 0} icon={Gauge} />
        <StatCard title="Distinct IPs (7d)" value={data.summary.uniqueIps7d} icon={Network} />
      </div>

      {/* Platform snapshot */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Platform at a glance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={data.platform.totalUsers} icon={Users} />
          <StatCard title="Colleges" value={data.platform.colleges} icon={Building2} />
          <StatCard title="Total Requests" value={data.platform.totalRequests} icon={ClipboardList} />
          <StatCard title="Requests Today" value={data.platform.requestsToday} icon={CalendarClock} />
        </div>
      </div>

      {!hasEvents ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ShieldAlert}
              title="No security events yet"
              description="Failed logins, blocked requests, and other suspicious activity will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Security Events (last 14 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
                  />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {CHART_TYPES.map((t) => (
                    <Bar key={t} dataKey={t} name={TYPE_META[t].label} stackId="a" fill={TYPE_META[t].color} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top offending IPs */}
            <Card>
              <CardHeader><CardTitle className="text-base">Top Source IPs (7 days)</CardTitle></CardHeader>
              <CardContent className="p-0">
                {data.topIps.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No flagged IPs in the last 7 days.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                        <TableHead className="text-right">High</TableHead>
                        <TableHead>Last seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topIps.map((row) => (
                        <TableRow key={row.ip}>
                          <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                          <TableCell className="text-right font-medium">{row.count}</TableCell>
                          <TableCell className="text-right">
                            {row.highSeverity > 0
                              ? <span className="font-semibold text-red-600 dark:text-red-400">{row.highSeverity}</span>
                              : <span className="text-muted-foreground">0</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatDate(row.lastSeen)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* 7-day breakdown by type */}
            <Card>
              <CardHeader><CardTitle className="text-base">Breakdown by Type (7 days)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CHART_TYPES.map((t) => (
                      <TableRow key={t}>
                        <TableCell className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_META[t].color }} />
                          {TYPE_META[t].label}
                        </TableCell>
                        <TableCell className="text-right font-medium">{data.summary.last7d.byType[t] || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Recent events */}
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Events</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Target / Actor</TableHead>
                      <TableHead>Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent.map((e) => (
                      <TableRow key={e._id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{typeLabel(e.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={SEVERITY_VARIANT[e.severity] || SEVERITY_VARIANT.low}>
                            {e.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.ip || "—"}</TableCell>
                        <TableCell className="text-sm">{actorName(e)}</TableCell>
                        <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground" title={e.path}>
                          {e.method ? `${e.method} ` : ""}{e.path || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
