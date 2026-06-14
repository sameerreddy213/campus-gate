import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { CollegeStatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, ClipboardList, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import apiClient from "@/lib/api";
import type { College } from "@/types";

import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DevAdminDashboard() {
  const [stats, setStats] = useState({
    colleges: 0,
    students: 0,
    wardens: 0,
    totalRequests: 0,
  });
  const [recentColleges, setRecentColleges] = useState<College[]>([]);
  const [chartData, setChartData] = useState<{ month: string; requests: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, collegesRes, breakdownRes] = await Promise.all([
          apiClient.get('/dev-admin/analytics'),
          apiClient.get('/dev-admin/colleges'),
          apiClient.get('/dev-admin/analytics/breakdown')
        ]);
        setStats(statsRes.data.data);
        setRecentColleges(collegesRes.data.data.slice(0, 5));
        setChartData(breakdownRes.data.data.monthlyData || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <PageHeader title="Developer Admin Dashboard" description="Global overview of all colleges" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}><StatCard title="Total Colleges" value={stats.colleges} icon={Building2} /></motion.div>
        <motion.div variants={item}><StatCard title="Total Students" value={stats.students} icon={Users} /></motion.div>
        <motion.div variants={item}><StatCard title="Total Requests" value={stats.totalRequests} icon={ClipboardList} /></motion.div>
        <motion.div variants={item}><StatCard title="Active Colleges" value={recentColleges.filter(c => c.status === "active").length} icon={TrendingUp} /></motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <Card>
            <CardHeader><CardTitle className="text-base">Outing Requests Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Colleges</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>College</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentColleges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell><CollegeStatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
