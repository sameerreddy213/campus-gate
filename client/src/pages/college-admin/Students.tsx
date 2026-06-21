import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Upload, Trash2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import type { Student, Warden } from "@/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { exportToCsv } from "@/lib/exportCsv";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [wardens, setWardens] = useState<Warden[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", rollNumber: "", department: "", year: "1", parentName: "", parentPhone: "", password: "", wardenId: "" });
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; student?: Student }>({ open: false });

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get('/college-admin/students');
      setStudents(res.data.data.map((s: any) => ({ ...s, id: s._id })));
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
    }
  };

  const fetchWardens = async () => {
    try {
      const res = await apiClient.get('/college-admin/wardens');
      setWardens(res.data.data.map((w: any) => ({ ...w, id: w._id })));
    } catch (error) {
      console.error("Failed to load wardens", error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchWardens();
  }, []);

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/college-admin/students', form);
      toast({ title: "Student Added", description: `${form.name} has been registered` });
      setDialogOpen(false);
      setForm({ name: "", email: "", phone: "", rollNumber: "", department: "", year: "1", parentName: "", parentPhone: "", password: "", wardenId: "" });
      fetchStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to add student", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await apiClient.post('/college-admin/students/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const d = res.data?.data;
      toast({
        title: "CSV Processed",
        description: d ? `${d.successful} added, ${d.failed} failed of ${d.total}` : "Students imported"
      });
      setDialogOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to upload CSV", variant: "destructive" });
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  const handleExport = () => {
    if (students.length === 0) return;
    exportToCsv<Student>(
      "students",
      [
        { header: "Name", value: (s) => s.name },
        { header: "Roll No", value: (s) => s.rollNumber },
        { header: "Email", value: (s) => s.email },
        { header: "Phone", value: (s) => s.phone },
        { header: "Department", value: (s) => s.department },
        { header: "Year", value: (s) => s.year },
        { header: "Warden", value: (s) => s.wardenName || "" },
        { header: "Parent Name", value: (s) => s.parentName },
        { header: "Parent Phone", value: (s) => s.parentPhone },
      ],
      students
    );
  };

  const handleDelete = async () => {
    if (!confirmDialog.student) return;
    try {
      await apiClient.delete(`/college-admin/students/${confirmDialog.student.id}`);
      setStudents(prev => prev.filter(s => s.id !== confirmDialog.student!.id));
      toast({ title: "Student Deleted", description: `${confirmDialog.student.name} has been deleted` });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to delete student", variant: "destructive" });
    }
    setConfirmDialog({ open: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage students in your college"
        action={
          <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={students.length === 0}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Student</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>Enter student details to register them.</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="manual">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="manual" className="flex-1">Single</TabsTrigger><TabsTrigger value="bulk" className="flex-1">Bulk CSV</TabsTrigger></TabsList>
                <TabsContent value="manual">
                  <form onSubmit={handleAdd} className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Name</Label><Input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Roll Number</Label><Input required value={form.rollNumber} onChange={e => setForm(p => ({ ...p, rollNumber: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Email</Label><Input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Phone</Label><Input required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Department</Label><Input required value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Year</Label><Input type="number" min="1" max="5" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Parent Name</Label><Input required value={form.parentName} onChange={e => setForm(p => ({ ...p, parentName: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Parent Phone</Label><Input required value={form.parentPhone} onChange={e => setForm(p => ({ ...p, parentPhone: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Password</Label><Input required type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Assign Warden</Label>
                        <Select onValueChange={(value) => setForm(p => ({ ...p, wardenId: value }))} value={form.wardenId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select warden" />
                          </SelectTrigger>
                          <SelectContent>
                            {wardens.map((w) => (
                              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? "Adding..." : "Add Student"}</Button>
                  </form>
                </TabsContent>
                <TabsContent value="bulk">
                  <div className="mt-4 space-y-4">
                    <div
                      className="rounded-lg border-2 border-dashed border-muted p-8 text-center transition-colors hover:border-primary/40"
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dropped = e.dataTransfer.files?.[0];
                        if (dropped && /\.csv$/i.test(dropped.name)) {
                          setFile(dropped);
                        } else if (dropped) {
                          toast({ title: "Unsupported file", description: "Please drop a .csv file", variant: "destructive" });
                        }
                      }}
                    >
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Drag & drop CSV file here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                      {file && <p className="text-xs text-primary mt-2 font-medium">{file.name}</p>}
                      <Input type="file" accept=".csv" className="mt-4" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                      <Button variant="outline" size="sm" className="mt-3" onClick={handleCsvUpload} disabled={!file || loading}>{loading ? "Uploading..." : "Upload CSV"}</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">CSV should contain: name, email, phone, rollNumber, department, year, parentName, parentPhone</p>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          </div>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, roll number, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roll No.</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Warden</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.rollNumber}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell>{s.year}</TableCell>
                  <TableCell>{s.wardenName || <span className="text-muted-foreground text-xs">Unassigned</span>}</TableCell>
                  <TableCell>{s.parentName}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setConfirmDialog({ open: true, student: s })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
        title="Delete Student?"
        description={`Are you sure you want to delete ${confirmDialog.student?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
