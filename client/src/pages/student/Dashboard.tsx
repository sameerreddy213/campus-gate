import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, CheckCircle, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";
import type { OutingRequest } from "@/types";

interface StudentDashboardData {
  activeRequest: OutingRequest | null;
  recentActivity: OutingRequest[];
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDashboardData>({
    activeRequest: null,
    recentActivity: []
  });

  const [allRequests, setAllRequests] = useState<OutingRequest[]>([]);

  const fetchData = async () => {
    try {
      // Fetch Dashboard Data
      const res = await apiClient.get('/student/dashboard');
      const dashData = res.data.data;
      if (dashData.activeRequest) dashData.activeRequest.id = dashData.activeRequest._id;
      if (dashData.recentActivity) dashData.recentActivity = dashData.recentActivity.map((r: any) => ({ ...r, id: r._id }));
      setData(dashData);

      // Fetch All Requests for Stats
      const listRes = await apiClient.get('/student/requests');
      setAllRequests(listRes.data.data.map((r: any) => ({ ...r, id: r._id })));
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pending = allRequests.filter(r => !["returned", "parent-declined", "rejected", "expired"].includes(r.status)).length;
  const completed = allRequests.filter(r => ["returned", "expired"].includes(r.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Dashboard"
        description="Welcome back"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                Refresh
              </div>
            </Button>
            <Button onClick={() => navigate("/student/raise-request")}>Raise Request</Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Active/Pending" value={pending} icon={Clock} />
        <StatCard title="Total Requests" value={allRequests.length} icon={ClipboardList} />
        <StatCard title="Completed" value={completed} icon={CheckCircle} />
      </div>

      {data.activeRequest && (
        <Card>
          <CardHeader><CardTitle className="text-base">Latest Request Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
              <div className="space-y-4 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-lg">{data.activeRequest.purpose}</p>
                    <p className="text-sm text-muted-foreground">{data.activeRequest.destination}</p>
                  </div>
                  <div className="self-start sm:self-center">
                    <StatusBadge status={data.activeRequest.status} />
                  </div>
                </div>
                <StatusTimeline status={data.activeRequest.status} />
              </div>

              {/* QR Code Section - Only for Approved/Active requests */}
              {["approved", "out"].includes(data.activeRequest.status) && (
                <TimedQRSection request={data.activeRequest} />
              )}

              {/* Cancel Button */}
              {data.activeRequest && !['out', 'returned', 'rejected', 'parent-declined', 'expired', 'cancelled'].includes(data.activeRequest.status) && (
                <div className="flex justify-end w-full md:w-auto mt-4 md:mt-0">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!window.confirm("Are you sure you want to cancel this request?")) return;
                      try {
                        await apiClient.put(`/student/requests/${data.activeRequest!.id}/cancel`);
                        fetchData(); // Refresh UI
                      } catch (err) {
                        console.error("Failed to cancel", err);
                        alert("Failed to cancel request");
                      }
                    }}
                  >
                    Cancel Request
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Requests</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/student/requests")}><History className="mr-1 h-4 w-4" />View All</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentActivity.map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{r.purpose}</p>
                <p className="text-xs text-muted-foreground">
                  {/* Show actual Out time if available, otherwise planned Out date */}
                  {new Date(r.outAt || r.outDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}

                  {/* Show arrow if there is a return date (either actual or planned) */}
                  {(r.returnedAt || r.returnDate) && <span className="mx-1">→</span>}

                  {/* Show actual Return time if available, otherwise planned Return date */}
                  {(r.returnedAt || r.returnDate) ? (
                    new Date(r.returnedAt || r.returnDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
                  ) : (
                    <span className="italic text-muted-foreground/50">Ongoing</span>
                  )}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
          {data.recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No recent activity</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function TimedQRSection({ request }: { request: OutingRequest }) {
  const [showQR, setShowQR] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    // If status is 'out', always show QR
    if (request.status === 'out') {
      setCanShow(true);
      setShowQR(true);
      return;
    }

    const checkTime = () => {
      const outTime = new Date(request.outDate).getTime();
      const now = new Date().getTime();
      const diff = outTime - now;

      if (diff <= 0) {
        setCanShow(true);
        setTimeLeft("");
      } else {
        setCanShow(false);
        // Format time left
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [request]);

  if (request.status === 'out') {
    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border shadow-sm mx-auto md:mx-0 w-full max-w-[200px]">
        <div className="bg-white p-2 rounded w-full">
          <QRCode
            value={request.gatePass || request.id}
            size={128}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>
        <p className="text-xs text-muted-foreground font-mono">{request.id.slice(-6).toUpperCase()}</p>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Return Pass</Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 bg-muted/30 rounded-lg border border-dashed mx-auto md:mx-0 w-full max-w-[280px] md:w-[200px] h-auto aspect-square md:h-[200px]">
      {showQR ? (
        <>
          <div className="bg-white p-2 rounded animate-in fade-in zoom-in w-full max-w-[140px] aspect-square flex items-center justify-center">
            <QRCode
              value={request.gatePass || request.id}
              size={120}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </div>
          <p className="text-xs font-mono">{request.id.slice(-6).toUpperCase()}</p>
        </>
      ) : (
        <>
          {canShow ? (
            <div className="text-center space-y-3">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-sm">Gate Pass Ready</p>
                <p className="text-xs text-muted-foreground">You can now proceed</p>
              </div>
              <Button size="sm" onClick={() => setShowQR(true)}>Show QR Code</Button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <Clock className="h-10 w-10 text-orange-500 mx-auto animate-pulse" />
              <div>
                <p className="font-semibold text-sm">Not Yet Active</p>
                <p className="text-xs text-muted-foreground">Available in</p>
                <p className="font-mono text-lg font-medium text-orange-600">{timeLeft}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
