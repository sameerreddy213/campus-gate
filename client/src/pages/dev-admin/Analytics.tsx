import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import apiClient from "@/lib/api";

interface Breakdown {
  statusData: { status: string; count: number }[];
  collegeData: { college: string; requests: number }[];
  monthlyData: { month: string; requests: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  approved: "hsl(142, 71%, 45%)",
  "pending-parent": "hsl(45, 93%, 47%)",
  "pending-warden": "hsl(45, 93%, 47%)",
  "parent-approved": "hsl(160, 71%, 45%)",
  "parent-declined": "hsl(0, 72%, 51%)",
  rejected: "hsl(0, 72%, 51%)",
  out: "hsl(217, 91%, 60%)",
  returned: "hsl(220, 9%, 46%)",
  expired: "hsl(280, 60%, 55%)",
  cancelled: "hsl(220, 9%, 60%)",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get("/dev-admin/analytics/breakdown");
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to load analytics", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Platform-wide outing analytics" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={`h-[300px] ${i === 2 ? "lg:col-span-2" : ""}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Platform-wide outing analytics" />
        <Card>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="Couldn't load analytics"
              description="There was a problem fetching analytics data."
              action={<Button onClick={fetchData}>Try again</Button>}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const pieData = data.statusData.map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || "hsl(239, 84%, 67%)",
  }));
  const hasData = data.statusData.length > 0 || data.collegeData.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Platform-wide outing analytics" />
      {!hasData ? (
        <Card>
          <CardContent>
            <EmptyState icon={BarChart3} title="No data yet" description="Analytics will populate once outing requests are created." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Outing Trend (last 6 months)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="hsl(239, 84%, 67%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Request Status Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Requests by College (top 8)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.collegeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="college" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="requests" fill="hsl(239, 84%, 67%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
