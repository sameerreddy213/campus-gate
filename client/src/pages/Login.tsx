import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Ensure these exist
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

// Re-using api instance from lib would be better.
import apiClient from "@/lib/api";

export default function LoginPage() {
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("staff");

  // Staff/Student Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Parent OTP State
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login({ email, password });

      const rolePaths: Record<string, string> = {
        "dev-admin": "/dev-admin",
        "college-admin": "/college-admin",
        "warden": "/warden",
        "student": "/student",
        "parent": "/parent",
        "watchman": "/watchman",
      };

      navigate(rolePaths[user.role] || "/");

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await apiClient.post('/auth/parent/send-otp', { phone });
      toast.success(`OTP sent to ${phone}`);
      setOtpStep("otp");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await verifyOtp(phone, otp);
      navigate("/parent");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            CG
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CampusGate</h1>
          <p className="text-sm text-muted-foreground">Login to your account</p>
        </div>

        <Tabs defaultValue="staff" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="staff">Staff / Student</TabsTrigger>
            <TabsTrigger value="parent">Parent</TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parent">
            <Card>
              <CardHeader>
                <CardTitle>Parent Login</CardTitle>
                <CardDescription>
                  {otpStep === "phone" ? "Enter your registered mobile number" : `Enter OTP sent to ${phone}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {otpStep === "phone" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter mobile number"
                      />
                    </div>
                    <Button className="w-full" onClick={handleSendOtp} disabled={loading}>
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button className="w-full" onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
                      {loading ? "Verifying..." : "Verify & Login"}
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={() => setOtpStep("phone")}>
                      Change Number
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
