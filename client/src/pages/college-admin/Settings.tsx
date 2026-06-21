import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";

interface CollegeConfig {
  enableGateSecurity: boolean;
  requireWardenApproval: boolean;
}

interface SettingRowProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  enabledLabel: string;
  disabledLabel: string;
  saving?: boolean;
}

function SettingRow({ icon: Icon, title, description, checked, onChange, enabledLabel, disabledLabel, saving }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/30">
      <div className="flex gap-4">
        <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">{title}</Label>
            <Badge variant="outline" className={cn("text-[10px]", checked ? "border-primary/30 text-primary" : "text-muted-foreground")}>
              {checked ? enabledLabel : disabledLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} disabled={saving} onCheckedChange={onChange} className="mt-1" />
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<CollegeConfig>({ enableGateSecurity: true, requireWardenApproval: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get("/college-admin/settings");
        const data = res.data.data || {};
        setConfig({
          enableGateSecurity: data.enableGateSecurity !== false,
          requireWardenApproval: data.requireWardenApproval !== false,
        });
      } catch (error) {
        console.error("Failed to load settings", error);
        toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Optimistically update one key; roll back on failure.
  const updateSetting = async (key: keyof CollegeConfig, value: boolean, successMsg: string) => {
    const previous = config[key];
    setConfig((c) => ({ ...c, [key]: value }));
    setSaving(true);
    try {
      await apiClient.put("/college-admin/settings", { [key]: value });
      toast({ title: "Settings updated", description: successMsg });
    } catch (error) {
      setConfig((c) => ({ ...c, [key]: previous }));
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure how the outing workflow behaves for your college" />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Configuration</CardTitle>
            <CardDescription>These settings take effect immediately for new requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow
              icon={UserCheck}
              title="Require Warden Approval"
              enabledLabel="Required"
              disabledLabel="Skipped"
              description={
                config.requireWardenApproval ? (
                  <>After a parent approves, the request goes to the assigned <strong>warden</strong> for final approval before a gate pass is issued.</>
                ) : (
                  <>Warden approval is <strong>skipped</strong> — requests are approved automatically once the parent approves (or immediately, for Mess/Exam).</>
                )
              }
              checked={config.requireWardenApproval}
              onChange={(v) => updateSetting("requireWardenApproval", v, `Warden approval is now ${v ? "required" : "skipped"}.`)}
              saving={saving}
            />

            <SettingRow
              icon={ShieldCheck}
              title="Gate Security (Watchman Module)"
              enabledLabel="Watchman"
              disabledLabel="Warden"
              description={
                config.enableGateSecurity ? (
                  <><strong>Watchmen</strong> scan the QR pass to mark students "Out" and "Returned" at the gate.</>
                ) : (
                  <><strong>Wardens</strong> mark students "Out" and "Returned" (the watchman module is hidden).</>
                )
              }
              checked={config.enableGateSecurity}
              onChange={(v) => updateSetting("enableGateSecurity", v, `Gate security ${v ? "enabled — watchmen" : "disabled — wardens"} will handle exits.`)}
              saving={saving}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
