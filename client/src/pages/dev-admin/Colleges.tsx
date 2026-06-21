import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CollegeStatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Search, Plus, Ban, CheckCircle, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast"; // or sonner
import type { College } from "@/types";
import apiClient from "@/lib/api";

export default function CollegesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [colleges, setColleges] = useState<College[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; college?: College; action?: string }>({ open: false });

  const fetchColleges = async () => {
    try {
      const res = await apiClient.get('/dev-admin/colleges');
      setColleges(res.data.data.map((c: any) => ({ ...c, id: c._id })));
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load colleges", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const filtered = colleges.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()));

  const handleConfirmAction = async () => {
    if (!confirmDialog.college) return;
    try {
      if (confirmDialog.action === "toggle") {
        await apiClient.put(`/dev-admin/colleges/${confirmDialog.college.id}/status`);
        setColleges(prev => prev.map(c =>
          c.id === confirmDialog.college!.id ? { ...c, status: c.status === "active" ? "suspended" as const : "active" as const } : c
        ));
        toast({
          title: "Status Updated",
          description: `${confirmDialog.college.name} is now ${confirmDialog.college.status === "active" ? "suspended" : "active"}`
        });
      } else if (confirmDialog.action === "delete") {
        await apiClient.delete(`/dev-admin/colleges/${confirmDialog.college.id}`);
        setColleges(prev => prev.filter(c => c.id !== confirmDialog.college!.id));
        toast({ title: "College Deleted", description: `${confirmDialog.college.name} has been deleted` });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to perform action",
        variant: "destructive"
      });
    }
    setConfirmDialog({ open: false });
  };

  // Edit Logic
  const [editDialog, setEditDialog] = useState<{ open: boolean; college?: College }>({ open: false });
  const [editForm, setEditForm] = useState({ name: "", code: "", city: "", address: "" });

  const handleEditClick = (college: College) => {
    setEditForm({ name: college.name, code: college.code, city: college.city, address: college.address || "" });
    setEditDialog({ open: true, college });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.college) return;
    try {
      const res = await apiClient.put(`/dev-admin/colleges/${editDialog.college.id}`, editForm);
      setColleges(prev => prev.map(c => c.id === editDialog.college!.id ? { ...c, ...res.data.data, id: c.id } : c));
      toast({ title: "Success", description: "College updated successfully" });
      setEditDialog({ open: false });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || "Failed to update college" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colleges"
        description="Manage all registered colleges"
        action={<Button onClick={() => navigate("/dev-admin/add-college")}><Plus className="mr-2 h-4 w-4" />Add College</Button>}
      />
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search colleges..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>College</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.city}</TableCell>
                  <TableCell>{c.adminName}</TableCell>
                  <TableCell>{c.studentCount ? c.studentCount.toLocaleString() : 0}</TableCell>
                  <TableCell><CollegeStatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(c)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, college: c, action: "toggle" })}>
                          {c.status === "active" ? <><Ban className="mr-2 h-4 w-4" />Suspend</> : <><CheckCircle className="mr-2 h-4 w-4" />Activate</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDialog({ open: true, college: c, action: "delete" })}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.action === "delete" ? "Delete College?" : (confirmDialog.college?.status === "active" ? "Suspend College?" : "Activate College?")}
        description={confirmDialog.action === "delete"
          ? `Are you sure you want to delete ${confirmDialog.college?.name}? This action cannot be undone.`
          : (confirmDialog.college?.status === "active"
            ? `Suspend ${confirmDialog.college?.name}? Its users will be blocked from logging in until reactivated.`
            : `Activate ${confirmDialog.college?.name}? Its users will be able to log in again.`)}
        confirmLabel={confirmDialog.action === "delete" ? "Delete" : (confirmDialog.college?.status === "active" ? "Suspend" : "Activate")}
        variant={confirmDialog.action === "delete" || confirmDialog.college?.status === "active" ? "destructive" : "default"}
        onConfirm={handleConfirmAction}
      />
      <Dialog open={editDialog.open} onOpenChange={open => setEditDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit College</DialogTitle>
            <DialogDescription>Make changes to the college details here. Click save when you're done.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">College Name</Label>
              <Input id="name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">College Code</Label>
              <Input id="code" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
