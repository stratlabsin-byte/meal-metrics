import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Building2, TrendingUp } from "lucide-react";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const LoginPage = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const { labels } = useBusinessConfig();

  // Check if database is empty (first-time setup)
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await axiosInstance.get("/auth/check-setup");
        setIsFirstTimeSetup(!response.data.has_users);
      } catch (error) {
        console.error("Failed to check setup status:", error);
      }
    };
    checkSetup();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosInstance.post("/auth/login", loginData);
      localStorage.setItem("token", response.data.token);
      onLogin(response.data);
      toast.success("Login successful!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200">
              <Building2 className="w-6 h-6 text-blue-600" />
              <span className="font-semibold text-gray-800">{labels.appName}</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Track Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                {labels.revenue} Flow
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-md">
              {`Manage multiple ${labels.entities.toLowerCase()}, track daily ${labels.revenue.toLowerCase()}`}, and get insights with beautiful analytics.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Real-time Analytics</h3>
                <p className="text-sm text-gray-600">Get instant insights into your revenue performance</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Multi-{labels.entity} Support</h3>
                <p className="text-sm text-gray-600">{`Manage all your ${labels.entities.toLowerCase()} in one place`}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="p-8 shadow-2xl border-0 bg-white/90 backdrop-blur-xl" data-testid="auth-card">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your account to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                data-testid="login-username-input"
                placeholder="Enter your username"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({ ...loginData, username: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Default Credentials Info - Only show on first-time setup */}
          {isFirstTimeSetup && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                🔑 First Time Setup
              </p>
              <p className="text-xs text-blue-700 mb-2">
                A default Super Admin account has been automatically created:
              </p>
              <div className="bg-white p-3 rounded border border-blue-200 space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Username:</span>
                  <span className="font-semibold text-gray-900">suadmin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-semibold text-gray-900">suadmin</span>
                </div>
              </div>
              <p className="text-xs text-red-600 mt-2 italic">
                ⚠️ Change the password immediately after first login!
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;