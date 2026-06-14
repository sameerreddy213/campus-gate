
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, LogOut, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { formatDate } from "@/lib/exportCsv";
import type { OutingRequest } from "@/types";

export default function WardenRequestsPage() {
  const [requests, setRequests] = useState<OutingRequest[]>([]);
  const [enableGateSecurity, setEnableGateSecurity] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; request?: OutingRequest; action?: string }>({ open: false });

  const fetchData = async () => {
    try {
      const [reqRes, settingsRes] = await Promise.all([
        apiClient.get('/warden/requests?type=pending'),
        apiClient.get('/warden/settings')
      ]);
      setRequests(reqRes.data.data.map((r: any) => ({ ...r, id: r._id })));
      if (settingsRes.data.data && settingsRes.data.data.enableGateSecurity !== undefined) {
        setEnableGateSecurity(settingsRes.data.data.enableGateSecurity);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async () => {
    if (!confirmDialog.request || !confirmDialog.action) return;
    const { id } = confirmDialog.request;
    const action = confirmDialog.action;

    try {
      if (action === "approve") {
        await apiClient.put(`/warden/requests/${id}`, { status: 'approved' });
        toast({ title: "Approved", description: "Request approved successfully" });
      } else if (action === "reject") {
        await apiClient.put(`/warden/requests/${id}`, { status: 'rejected' });
        toast({ title: "Rejected", description: "Request rejected" });
      } else if (action === "mark-out") {
        await apiClient.put(`/warden/requests/${id}/out`);
        toast({ title: "Marked Out", description: "Student marked as out" });
      } else if (action === "mark-returned") {
        await apiClient.put(`/warden/requests/${id}/returned`);
        toast({ title: "Returned", description: "Student marked as returned" });
      }
      fetchData();
      setConfirmDialog({ open: false });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Action failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Outing Requests" description="Approve, reject, and track student outings" />
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Out Date</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => {
                const overstay = r.status === "out" && !!r.returnDate && new Date(r.returnDate).getTime() < Date.now();
                return (
                <TableRow key={r.id} className={overstay ? "bg-destructive/5" : undefined}>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell>{r.studentRoll}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{r.purpose}</TableCell>
                  <TableCell>{formatDate(r.outAt || r.outDate) || "-"}</TableCell>
                  <TableCell>
                    {(r.returnedAt || r.returnDate) ? (
                      <span className={overstay ? "text-destructive font-semibold" : ""}>
                        {formatDate(r.returnedAt || r.returnDate)}
                        {overstay && <Badge variant="outline" className="ml-2 border-destructive text-destructive">Overstay</Badge>}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(r.status === "pending-warden" || r.status === "parent-approved") && (
                        <>
                          <Button size="sm" variant="ghost" className="text-status-approved h-8" onClick={() => setConfirmDialog({ open: true, request: r, action: "approve" })}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-status-declined h-8" onClick={() => setConfirmDialog({ open: true, request: r, action: "reject" })}><X className="h-4 w-4" /></Button>
                        </>
                      )}

                      {/* Only show Mark Out/Return if Gate Security is DISABLED */}
                      {!enableGateSecurity && (
                        <>
                          {r.status === "approved" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-status-declined h-8" onClick={() => setConfirmDialog({ open: true, request: r, action: "reject" })}><X className="h-4 w-4 mr-1" />Revoke</Button>
                              <Button size="sm" variant="ghost" className="text-status-out h-8" onClick={() => setConfirmDialog({ open: true, request: r, action: "mark-out" })}><LogOut className="h-4 w-4 mr-1" />Out</Button>
                            </>
                          )}
                          {r.status === "out" && (
                            <Button size="sm" variant="ghost" className="text-status-returned h-8" onClick={() => setConfirmDialog({ open: true, request: r, action: "mark-returned" })}><RotateCcw className="h-4 w-4 mr-1" />Return</Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No active requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={`${confirmDialog.action === "approve" ? "Approve" : confirmDialog.action === "reject" ? "Reject" : confirmDialog.action === "mark-out" ? "Mark Out" : "Mark Returned"} Request?`}
        description={`Are you sure you want to ${confirmDialog.action?.replace("-", " ")} ${confirmDialog.request?.studentName}'s request?`}
        confirmLabel="Confirm"
        variant={confirmDialog.action === "reject" ? "destructive" : "default"}
        onConfirm={handleAction}
      />
    </div>
  );
}

