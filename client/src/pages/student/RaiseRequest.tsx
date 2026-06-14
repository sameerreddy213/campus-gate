import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

export default function StudentRaiseRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    purpose: "",
    destination: "",
    outDate: undefined as Date | undefined,
    outTime: "",
    returnDate: undefined as Date | undefined,
    returnTime: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.outDate || !formData.outTime) {
      toast({ title: "Error", description: "Select out date and time", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const outDateTime = new Date(formData.outDate);
      const [outH, outM] = formData.outTime.split(':');
      outDateTime.setHours(parseInt(outH), parseInt(outM), 0, 0);

      // Validation: Check if outDate is in the past
      if (outDateTime < new Date()) {
        toast({ title: "Invalid Date", description: "Out time cannot be in the past", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Optional expected return
      let returnDateTime: Date | undefined;
      if (formData.returnDate && formData.returnTime) {
        returnDateTime = new Date(formData.returnDate);
        const [rH, rM] = formData.returnTime.split(':');
        returnDateTime.setHours(parseInt(rH), parseInt(rM), 0, 0);
        if (returnDateTime <= outDateTime) {
          toast({ title: "Invalid Return", description: "Expected return must be after the out time", variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      await apiClient.post('/student/requests', {
        purpose: formData.purpose,
        destination: formData.destination,
        outDate: outDateTime,
        returnDate: returnDateTime,
      });
      toast({ title: "Request Sent", description: "Waiting for parent approval" });
      navigate("/student"); // Fixed route
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to raise request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Raise Outing Request" description="Submit a new request" />
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select onValueChange={(value) => setFormData(p => ({ ...p, purpose: value }))} value={formData.purpose}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vacation">Vacation</SelectItem>
                  <SelectItem value="Exam">Exam</SelectItem>
                  <SelectItem value="Mess">Mess</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Destination</Label><Textarea required value={formData.destination} onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))} /></div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !formData.outDate && "text-muted-foreground")}>
                      {formData.outDate ? format(formData.outDate, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.outDate}
                      onSelect={(d) => setFormData(p => ({ ...p, outDate: d }))}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Out Time</Label>
                <Input type="time" required value={formData.outTime} onChange={e => setFormData(p => ({ ...p, outTime: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Return Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !formData.returnDate && "text-muted-foreground")}>
                      {formData.returnDate ? format(formData.returnDate, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.returnDate}
                      onSelect={(d) => setFormData(p => ({ ...p, returnDate: d }))}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Expected Return Time</Label>
                <Input type="time" value={formData.returnTime} onChange={e => setFormData(p => ({ ...p, returnTime: e.target.value }))} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Submitting..." : "Submit Request"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
