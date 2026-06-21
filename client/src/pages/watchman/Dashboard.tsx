import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, LogOut, LogIn, CheckCircle, Clock, X, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import type { OutingRequest } from "@/types";
import { Scanner } from '@yudiel/react-qr-scanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


interface WatchmanStats {
    approvedRequests: number;
    studentsOut: number;
    returnedToday: number;
}

export default function WatchmanDashboard() {
    const [stats, setStats] = useState<WatchmanStats>({ approvedRequests: 0, studentsOut: 0, returnedToday: 0 });
    const [approvedRequests, setApprovedRequests] = useState<OutingRequest[]>([]);
    const [outRequests, setOutRequests] = useState<OutingRequest[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [verifiedRequest, setVerifiedRequest] = useState<OutingRequest | null>(null);

    const fetchStats = async () => {
        try {
            const res = await apiClient.get('/watchman/dashboard');
            setStats(res.data.data);
        } catch (error) {
            console.error("Failed to load stats", error);
        }
    };

    const fetchApproved = async () => {
        try {
            const res = await apiClient.get('/watchman/requests/approved');
            setApprovedRequests(res.data.data.map((r: any) => ({ ...r, id: r._id })));
        } catch (error) {
            console.error("Failed to load approved requests", error);
        }
    };

    const fetchOut = async () => {
        try {
            const res = await apiClient.get('/watchman/requests/out');
            setOutRequests(res.data.data.map((r: any) => ({ ...r, id: r._id })));
        } catch (error) {
            console.error("Failed to load out requests", error);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchApproved();
        fetchOut();

        // Auto refresh every 30s
        const interval = setInterval(() => {
            fetchStats();
            fetchApproved();
            fetchOut();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkOut = async (id: string, name: string) => {
        try {
            setLoading(true);
            await apiClient.put(`/watchman/requests/${id}/out`);
            toast({ title: "Marked Out", description: `${name} is now Out` });
            fetchStats();
            fetchApproved();
            fetchOut();
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Failed to mark out", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleMarkReturned = async (id: string, name: string) => {
        try {
            setLoading(true);
            await apiClient.put(`/watchman/requests/${id}/returned`);
            toast({ title: "Marked Returned", description: `${name} has Returned` });
            fetchStats();
            fetchApproved();
            fetchOut();
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Failed to mark returned", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Verify a scanned QR gate pass against the server (validates the signed,
    // expiring token), then surface the matched request in the verification card.
    const handleVerifyScan = async (token: string) => {
        try {
            const res = await apiClient.post('/watchman/verify', { token });
            const data = res.data.data;
            setVerifiedRequest({ ...data, id: data._id });
            setSearch("");
        } catch (error: any) {
            toast({
                title: "Invalid pass",
                description: error.response?.data?.message || "Could not verify this QR code",
                variant: "destructive",
            });
            setVerifiedRequest(null);
        } finally {
            setScannerOpen(false);
        }
    };

    const filterRequests = (requests: OutingRequest[]) => {
        const query = search.toLowerCase();
        return requests.filter(r =>
            r.studentName.toLowerCase().includes(query) ||
            r.rollNumber?.toLowerCase().includes(query) ||
            r.id.toLowerCase().includes(query) // Support QR Code ID scan
        );
    };

    const localMatch = search
        ? [...approvedRequests, ...outRequests].find(r => r.id === search || r.id.slice(-6).toUpperCase() === search.toUpperCase())
        : undefined;
    // A server-verified QR scan takes precedence over a typed/manual match.
    const scannedRequest = verifiedRequest || localMatch;

    return (
        <div className="space-y-6">
            <PageHeader title="Gate Control" description="Manage student entry and exit" />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard title="Ready to Out" value={stats.approvedRequests} icon={CheckCircle} />
                <StatCard title="Currently Out" value={stats.studentsOut} icon={Clock} changeType="negative" />
                <StatCard title="Returned Today" value={stats.returnedToday} icon={LogIn} changeType="positive" />
            </div>

            {/* SCAN VERIFICATION CARD */}
            {scannedRequest && (
                <Card className="border-2 border-primary animate-in fade-in zoom-in duration-300">
                    <CardHeader className="bg-primary/5 pb-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            Gate Verification
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
                                <span className="text-4xl font-bold text-muted-foreground">
                                    {scannedRequest.studentName.charAt(0)}
                                </span>
                            </div>
                            <div className="flex-1 space-y-4 text-center md:text-left">
                                <div>
                                    <h3 className="text-2xl font-bold">{scannedRequest.studentName}</h3>
                                    <p className="text-lg text-muted-foreground font-mono">{scannedRequest.studentRoll}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                                    <div>
                                        <p className="text-muted-foreground">Purpose</p>
                                        <p className="font-medium">{scannedRequest.purpose}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Destination</p>
                                        <p className="font-medium">{scannedRequest.destination}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {scannedRequest.status === 'approved' && (
                                        <Button
                                            size="lg"
                                            className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                                            onClick={() => {
                                                handleMarkOut(scannedRequest.id, scannedRequest.studentName);
                                                setSearch(""); // Clear after action
                                                setVerifiedRequest(null);
                                            }}
                                            disabled={loading}
                                        >
                                            <LogOut className="mr-2 h-6 w-6" />
                                            VERIFY & MARK OUT
                                        </Button>
                                    )}
                                    {scannedRequest.status === 'out' && (
                                        <Button
                                            size="lg"
                                            className="w-full text-lg py-6"
                                            onClick={() => {
                                                handleMarkReturned(scannedRequest.id, scannedRequest.studentName);
                                                setSearch(""); // Clear after action
                                                setVerifiedRequest(null);
                                            }}
                                            disabled={loading}
                                        >
                                            <LogIn className="mr-2 h-6 w-6" />
                                            VERIFY & MARK RETURNED
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <CardTitle>Requests</CardTitle>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, roll no, or scan QR..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>
                            <Button variant="outline" size="icon" title="Clear Search" onClick={() => setSearch('')}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Search className="h-4 w-4" />
                                    Scan QR Code
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Scan Student QR Code</DialogTitle>
                                </DialogHeader>
                                <div className="aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                                    {scannerOpen && (
                                        <Scanner
                                            onScan={(result) => {
                                                if (result && result.length > 0) {
                                                    // The QR carries a signed gate-pass token; verify it server-side.
                                                    handleVerifyScan(result[0].rawValue);
                                                }
                                            }}
                                            onError={(error: any) => console.log(error?.message || error)}
                                        />
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="approved">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
                            <TabsTrigger value="approved">Ready to Out ({approvedRequests.length})</TabsTrigger>
                            <TabsTrigger value="out">Currently Out ({outRequests.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="approved">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Roll No</TableHead>
                                        <TableHead>Purpose</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filterRequests(approvedRequests).map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">{r.studentName}</TableCell>
                                            <TableCell>{r.studentRoll}</TableCell>
                                            <TableCell>{r.purpose}</TableCell>
                                            <TableCell>{r.destination}</TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={() => handleMarkOut(r.id, r.studentName)} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                                    <LogOut className="mr-2 h-4 w-4" /> Mark Out
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filterRequests(approvedRequests).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No approved requests found</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>

                        <TabsContent value="out">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Roll No</TableHead>
                                        <TableHead>Out Time</TableHead>
                                        <TableHead>Expected Return</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filterRequests(outRequests).map(r => {
                                        const overstay = !!r.returnDate && new Date(r.returnDate).getTime() < Date.now();
                                        return (
                                        <TableRow key={r.id} className={overstay ? "bg-destructive/5" : undefined}>
                                            <TableCell className="font-medium">{r.studentName}</TableCell>
                                            <TableCell>{r.studentRoll}</TableCell>
                                            <TableCell>{r.outAt ? new Date(r.outAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '-'}</TableCell>
                                            <TableCell>
                                                {r.returnDate ? (
                                                    <span className={overstay ? "text-destructive font-semibold" : ""}>
                                                        {new Date(r.returnDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                                        {overstay && <Badge variant="outline" className="ml-2 border-destructive text-destructive">Overstay</Badge>}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => handleMarkReturned(r.id, r.studentName)} disabled={loading} className="border-green-600 text-green-600 hover:bg-green-50">
                                                    <LogIn className="mr-2 h-4 w-4" /> Mark Returned
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })}
                                    {filterRequests(outRequests).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No students currently out</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
