import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
    User, Phone, Mail, Building2, GraduationCap, Shield,
    MapPin, Calendar, Hash, Briefcase, School, Pencil
} from "lucide-react";

export default function Profile() {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", phone: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user && (user as any).profile) {
            setProfile((user as any).profile);
        }
    }, [user]);

    const openEdit = () => {
        if (!user) return;
        setEditForm({ name: user.name || "", phone: user.phone || "" });
        setEditOpen(true);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await api.put("/auth/updatedetails", { name: editForm.name, phone: editForm.phone });
            await refreshUser();
            toast({ title: "Profile updated", description: "Your details have been saved." });
            setEditOpen(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Failed to update profile", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    const DetailItem = ({ icon: Icon, label, value, className }: { icon: any, label: string, value: string | number, className?: string }) => (
        <div className={`flex items-start md:items-center gap-4 p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-colors ${className}`}>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0">
                <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="font-semibold text-sm md:text-base break-words">{value || "N/A"}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto px-4 pb-10">
            <PageHeader
                title="My Profile"
                description="View and update your personal information"
                action={<Button variant="outline" size="sm" onClick={openEdit}><Pencil className="mr-2 h-4 w-4" /> Edit Profile</Button>}
            />

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                {/* User Identity Card */}
                <Card className="lg:col-span-4 shadow-lg border-muted/60 overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent"></div>
                    <CardContent className="relative pt-0 flex flex-col items-center text-center -mt-16 pb-8">
                        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                                {user.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="mt-4 space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
                            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium capitalize rounded-full">
                                {user.role.replace("-", " ")}
                            </Badge>
                        </div>

                        <Separator className="my-6 w-full" />

                        <div className="w-full space-y-4 px-2">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                <Mail className="h-4 w-4 shrink-0" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                <Phone className="h-4 w-4 shrink-0" />
                                <span>{user.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Details Section */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Role Specific Details */}
                    <Card className="shadow-md border-muted/60">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary"><Briefcase className="h-5 w-5" /></div>
                                <div>
                                    <CardTitle>Professional Details</CardTitle>
                                    <CardDescription>Role specific information</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">

                            {/* Student Details */}
                            {user.role === 'student' && profile && (
                                <>
                                    <DetailItem icon={Hash} label="Roll Number" value={profile.rollNumber} />
                                    <DetailItem icon={GraduationCap} label="Department" value={profile.department} />
                                    <DetailItem icon={Calendar} label="Year / Batch" value={profile.year} />
                                    <DetailItem icon={Shield} label="Assigned Warden" value={profile.wardenId?.name || "Not Assigned"} />
                                    <DetailItem icon={User} label="Parent Name" value={profile.parentName} />
                                    <DetailItem icon={Phone} label="Parent Phone" value={profile.parentPhone} />
                                </>
                            )}

                            {/* Warden Details */}
                            {user.role === 'warden' && (
                                <DetailItem icon={GraduationCap} label="Assigned Students" value={`${profile?.assignedStudents || 0} Students`} className="sm:col-span-2" />
                            )}

                            {/* Parent Details (Student Info) */}
                            {user.role === 'parent' && profile?.student && (
                                <>
                                    <div className="col-span-full flex items-center gap-2 mb-2 pb-2 border-b">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-semibold text-muted-foreground">Student Information</span>
                                    </div>
                                    <DetailItem icon={User} label="Student Name" value={profile.student.userId?.name} />
                                    <DetailItem icon={Hash} label="Roll Number" value={profile.student.rollNumber} />
                                    <DetailItem icon={GraduationCap} label="Department" value={profile.student.department} />
                                    <DetailItem icon={Calendar} label="Year / Batch" value={profile.student.year} />
                                    <DetailItem icon={Shield} label="Assigned Warden" value={profile.student.wardenId?.name || "Not Assigned"} />
                                </>
                            )}

                            {/* Fallback for others if no specific details */}
                            {user.role !== 'student' && user.role !== 'warden' && user.role !== 'parent' && (
                                <div className="col-span-full py-8 text-center text-muted-foreground">
                                    No additional role details available.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Institution Details */}
                    {profile?.college && (
                        <Card className="shadow-md border-muted/60">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><School className="h-5 w-5" /></div>
                                    <div>
                                        <CardTitle>Institution Details</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <DetailItem icon={Building2} label="College Name" value={profile.college.name} className="sm:col-span-2" />
                                <DetailItem icon={Hash} label="College Code" value={profile.college.code} />
                                <DetailItem icon={MapPin} label="City" value={profile.college.city} />
                                {profile.college.address && (
                                    <DetailItem icon={MapPin} label="Address" value={profile.college.address} className="sm:col-span-2" />
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>Update your name and phone number.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="profile-name">Name</Label>
                            <Input id="profile-name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="profile-phone">Phone</Label>
                            <Input id="profile-phone" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveProfile} disabled={saving || !editForm.name.trim()}>{saving ? "Saving..." : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
