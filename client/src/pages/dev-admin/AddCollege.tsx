import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";

export default function AddCollegePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", code: "", city: "", address: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/dev-admin/colleges', form);
      toast({ title: "College Added", description: `${form.name} has been created` });
      navigate("/dev-admin/colleges");
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || "Failed to create college";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add College" description="Register a new college on the platform" />
      <Card className="max-w-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>College Name</Label>
              <Input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. St. Mary's Women's College" />
            </div>
            <div className="space-y-2">
              <Label>College Code</Label>
              <Input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. SMWC" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input required value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Hyderabad" />
            </div>
            <div className="space-y-2">
              <Label>Address (optional)</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="e.g. 12 College Rd, Madhapur" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add College"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dev-admin/colleges")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
