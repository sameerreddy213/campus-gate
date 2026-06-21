import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger?: React.ReactNode;
    // When true the dialog cannot be dismissed (forced first-login rotation) and
    // the user is refreshed on success so the mustChangePassword gate clears.
    forced?: boolean;
}

export function ChangePasswordDialog({ open, onOpenChange, trigger, forced }: ChangePasswordDialogProps) {
    const { refreshUser } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
            return;
        }

        if (newPassword.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await apiClient.put('/auth/updatepassword', { currentPassword, newPassword });
            toast({ title: "Success", description: "Password updated successfully" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            if (forced) {
                // Clear the mustChangePassword gate by re-fetching the user.
                await refreshUser();
            }
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.message || "Failed to update password", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={forced ? undefined : onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent
                className="sm:max-w-[425px]"
                // In forced mode, block the close button / outside-click / Esc.
                hideClose={forced}
                onPointerDownOutside={forced ? (e) => e.preventDefault() : undefined}
                onEscapeKeyDown={forced ? (e) => e.preventDefault() : undefined}
                onInteractOutside={forced ? (e) => e.preventDefault() : undefined}
            >
                <DialogHeader>
                    <DialogTitle>{forced ? "Set a new password" : "Change Password"}</DialogTitle>
                    <DialogDescription>
                        {forced
                            ? "Your account uses a temporary password. Choose a new password to continue."
                            : "Enter your current password and a new password to update it."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="current">Current Password</Label>
                        <Input id="current" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new">New Password</Label>
                        <Input id="new" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm">Confirm New Password</Label>
                        <Input id="confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
