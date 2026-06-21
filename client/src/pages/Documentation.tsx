import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Book, Shield, Users, School, Lock, UserCheck, User } from "lucide-react";

export default function Documentation() {
    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container flex h-16 items-center justify-between py-4">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Book className="h-6 w-6" />
                        <span>Documentation</span>
                    </div>
                    <Link to="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="container py-10">
                <div className="mx-auto max-w-4xl space-y-8">
                    <div className="space-y-4 text-center sm:text-left">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">CampusGate Guide</h1>
                        <p className="text-xl text-muted-foreground">
                            Comprehensive documentation for all users of the CampusGate system.
                        </p>
                    </div>

                    <Tabs defaultValue="student" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
                            <TabsTrigger value="student" className="py-2">Student</TabsTrigger>
                            <TabsTrigger value="parent" className="py-2">Parent</TabsTrigger>
                            <TabsTrigger value="warden" className="py-2">Warden</TabsTrigger>
                            <TabsTrigger value="watchman" className="py-2">Watchman</TabsTrigger>
                            <TabsTrigger value="college-admin" className="py-2">College Admin</TabsTrigger>
                            <TabsTrigger value="dev-admin" className="py-2">Dev Admin</TabsTrigger>
                        </TabsList>

                        {/* Student Content */}
                        <TabsContent value="student" className="space-y-4 mt-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <User className="h-6 w-6 text-primary" />
                                        <CardTitle>Student Portal</CardTitle>
                                    </div>
                                    <CardDescription>Managing your outing requests and profile.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="raise-request">
                                            <AccordionTrigger>How to Raise a Request?</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>1. Log in to your student dashboard.</p>
                                                <p>2. Navigate to the <strong>"Raise Request"</strong> tab.</p>
                                                <p>3. Fill in the required details: <strong>Purpose</strong>, <strong>Out Date/Time</strong>, and <strong>Expected In Date/Time</strong>.</p>
                                                <p>4. Click <strong>Submit</strong>. The request status will change to <em>Pending Parent Approval</em>.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="track-status">
                                            <AccordionTrigger>Tracking Request Status</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>You can view the status of your requests in the <strong>"My Requests"</strong> section.</p>
                                                <ul className="list-disc pl-5 space-y-1">
                                                    <li><strong>Pending Parent Approval:</strong> Waiting for parent to approve via SMS/App.</li>
                                                    <li><strong>Pending Warden Approval:</strong> Parent approved, waiting for warden sanction.</li>
                                                    <li><strong>Approved:</strong> Ready for gate exit. QR code generated.</li>
                                                    <li><strong>Rejected:</strong> Request denied by parent or warden.</li>
                                                    <li><strong>Out:</strong> You are currently outside the campus.</li>
                                                    <li><strong>Completed:</strong> You have returned to campus.</li>
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="qr-code">
                                            <AccordionTrigger>Using the QR Code</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>Once a request is <strong>Approved</strong>, a QR code will appear on your dashboard ticket.</p>
                                                <p>Show this QR code to the watchman at the gate for scanning during both exit and entry.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Parent Content */}
                        <TabsContent value="parent" className="space-y-4 mt-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-6 w-6 text-primary" />
                                        <CardTitle>Parent Portal</CardTitle>
                                    </div>
                                    <CardDescription>Approving requests and monitoring student safety.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="login-otp">
                                            <AccordionTrigger>Login via OTP</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>Parents log in using their registered mobile number.</p>
                                                <p>1. Enter your mobile number on the login page.</p>
                                                <p>2. Receive a 6-digit OTP via SMS.</p>
                                                <p>3. Enter the OTP to access your dashboard.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="approve-request">
                                            <AccordionTrigger>Approving Requests</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>When your ward raises a request, you will receive an SMS notification.</p>
                                                <p>1. Log in to the portal.</p>
                                                <p>2. View <strong>"Pending Requests"</strong> on the dashboard.</p>
                                                <p>3. Review the details (Purpose, Dates).</p>
                                                <p>4. Click <strong>Approve</strong> or <strong>Reject</strong>.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Warden Content */}
                        <TabsContent value="warden" className="space-y-4 mt-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="h-6 w-6 text-primary" />
                                        <CardTitle>Warden Portal</CardTitle>
                                    </div>
                                    <CardDescription>Sanctioning approvals and student management.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="sanction-request">
                                            <AccordionTrigger>Sanctioning Requests</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>Wardens are the second level of approval.</p>
                                                <p>1. Go to <strong>"Requests"</strong> to see requests approved by parents.</p>
                                                <p>2. Verify the reason and student history.</p>
                                                <p>3. <strong>Sanction</strong> the request to generate the gate pass.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="view-history">
                                            <AccordionTrigger>Viewing Student History</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>Access the <strong>"Students"</strong> tab to view a list of all assigned students, including their roll number, department, year, and parent contact.</p>
                                                <p>Use the <strong>"History"</strong> tab to review past outing requests you have acted on.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Watchman Content */}
                        <TabsContent value="watchman" className="space-y-4 mt-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-6 w-6 text-primary" />
                                        <CardTitle>Watchman Portal</CardTitle>
                                    </div>
                                    <CardDescription>Gate verification and entry/exit logging.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="gate-check">
                                            <AccordionTrigger>Scanning Gate Passes</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>1. Use the QR scanner (or manual entry) to verify a student's pass.</p>
                                                <p>2. The system checks if the pass is <strong>Approved</strong> and valid for the current time.</p>
                                                <p>3. Confirm <strong>Exit</strong> when the student leaves.</p>
                                                <p>4. Confirm <strong>Entry</strong> when the student returns. This completes the request cycle.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* College Admin Content */}
                        <TabsContent value="college-admin" className="space-y-4 mt-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <School className="h-6 w-6 text-primary" />
                                        <CardTitle>College Admin</CardTitle>
                                    </div>
                                    <CardDescription>Institution-level management.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="manage-users">
                                            <AccordionTrigger>Managing Users</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p><strong>Wardens & Watchmen:</strong> Add, edit, or remove staff members.</p>
                                                <p><strong>Students:</strong> Bulk upload student data via CSV or add individually.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="reports">
                                            <AccordionTrigger>Reports & Settings</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>Generate and export CSV reports of outing requests, filtered by date range and status.</p>
                                                <p>Toggle <strong>Gate Security</strong> in Settings to switch student out/return between the watchman and the warden.</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Dev Admin Content */}
                        <TabsContent value="dev-admin" className="space-y-4 mt-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Lock className="h-6 w-6 text-primary" />
                                        <CardTitle>Dev Admin</CardTitle>
                                    </div>
                                    <CardDescription>System-wide administration.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="multi-tenancy">
                                            <AccordionTrigger>College Onboarding</AccordionTrigger>
                                            <AccordionContent className="space-y-2 text-muted-foreground">
                                                <p>Create, suspend, and manage tenant (college) accounts.</p>
                                                <p>Assign initial college admin credentials.</p>
                                                <p>Monitor platform-wide analytics, the global audit log, and the Security &amp; Logs dashboard (failed logins, blocked requests, suspicious IPs).</p>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="text-center pt-8 border-t">
                        <p className="text-muted-foreground">Still have questions?</p>
                        <Button variant="link" asChild className="text-primary">
                            <a href="mailto:contact@sameerreddy.in">Contact Support</a>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}
