import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Loader2, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoError = params.get("sso_error");
    if (ssoError) {
      const messages: Record<string, string> = {
        not_configured: "Azure AD SSO is not configured on the server.",
        no_code: "Authentication was cancelled or failed.",
        no_email: "Could not retrieve your email from Microsoft.",
        auth_failed: "Authentication failed. Please try again.",
      };
      toast({
        title: "Sign-in failed",
        description: messages[ssoError] || "An unknown error occurred.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      registerMutation.mutate({ username, password, email: email || undefined, displayName: displayName || undefined });
    } else {
      loginMutation.mutate({ username, password });
    }
  };

  const handleSsoLogin = async () => {
    setSsoLoading(true);
    try {
      const res = await apiRequest("GET", "/api/auth/sso/login");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "SSO unavailable",
          description: "Azure AD SSO is not configured.",
          variant: "destructive",
        });
        setSsoLoading(false);
      }
    } catch (error: any) {
      toast({
        title: "SSO error",
        description: error.message || "Failed to start SSO login.",
        variant: "destructive",
      });
      setSsoLoading(false);
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <CardTitle data-testid="text-login-title">{isRegister ? "Create Account" : "Sign In"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Create an account to access FinanceHub" : "Sign in to FinanceHub"}
          </p>
        </CardHeader>
        <CardContent>
          {!isRegister && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4 gap-2"
                data-testid="button-sso-login"
                onClick={handleSsoLogin}
                disabled={ssoLoading}
              >
                {ssoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Sign in with Microsoft
              </Button>
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
            </>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name (optional)</Label>
                  <Input
                    id="displayName"
                    data-testid="input-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-auth">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              data-testid="button-toggle-auth-mode"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm"
            >
              {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
