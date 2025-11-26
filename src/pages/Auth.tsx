import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number");

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<"email" | "phone">("email");

  // Email/Password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Phone fields
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: displayName || email.split("@")[0],
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "You can now sign in with your credentials.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      phoneSchema.parse(phone);

      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          data: {
            display_name: displayName || phone,
          },
        },
      });

      if (error) throw error;

      setOtpSent(true);
      toast({
        title: "OTP sent!",
        description: "Check your phone for the verification code.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-accent/10 px-6 py-8 safe-top">
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <div className="flex items-center gap-3 mb-12 justify-center">
          <div className="p-3 bg-primary rounded-xl">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">The Cash Book</h1>
            <p className="text-muted-foreground text-base">Smart expense splitting</p>
          </div>
        </div>

        <Tabs defaultValue="email" onValueChange={(v) => setAuthType(v as "email" | "phone")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
            <TabsTrigger value="email" className="text-base">Email</TabsTrigger>
            <TabsTrigger value="phone" className="text-base">Phone</TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
                <TabsTrigger value="signin" className="text-base">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-base">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleEmailSignIn} className="space-y-5">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 text-base"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 text-base"
                  />
                  <Button type="submit" className="w-full h-14 text-base" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleEmailSignUp} className="space-y-5">
                  <Input
                    type="text"
                    placeholder="Display Name (optional)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-14 text-base"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 text-base"
                  />
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 text-base"
                  />
                  <Button type="submit" className="w-full h-14 text-base" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Sign Up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="phone">
            {!otpSent ? (
              <form onSubmit={handlePhoneSignUp} className="space-y-5">
                <Input
                  type="text"
                  placeholder="Display Name (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-14 text-base"
                />
                <Input
                  type="tel"
                  placeholder="Phone Number (+1234567890)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-14 text-base"
                />
                <Button type="submit" className="w-full h-14 text-base" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Send OTP
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <Input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="h-14 text-base text-center text-xl tracking-widest"
                />
                <Button type="submit" className="w-full h-14 text-base" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Verify OTP
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-12 text-base"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                  }}
                >
                  Back
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
