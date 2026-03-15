import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Building2, Filter, Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RevenueForm from "../components/RevenueForm";
import RestaurantManager from "../components/RestaurantManager";
import RevenueList from "../components/RevenueList";
import DashboardStats from "../components/DashboardStats";
import KPIBuilder from "../components/KPIBuilder";
import CurrencySettings from "../components/CurrencySettings";
import RevenueCategoriesManager from "../components/RevenueCategoriesManager";
import ReportsTable from "../components/ReportsTable";
import EmployeeManager from "../components/EmployeeManager";
import RestaurantDocuments from "../components/RestaurantDocuments";
import UserManager from "../components/UserManager";
import BrandManager from "../components/BrandManager";
import RoyaltyEntry from "../components/RoyaltyEntry";
import RoyaltySummary from "../components/RoyaltySummary";
import RoyaltyPayeeManager from "../components/RoyaltyPayeeManager";
import RestaurantTargetManager from "../components/RestaurantTargetManager";
import ExpenseEntry from "../components/ExpenseEntry";
import PettyCashSummary from "../components/PettyCashSummary";
import BusinessConfigManager from "../components/BusinessConfigManager";
import Sidebar from "../components/Sidebar";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const DashboardPage = ({ user, onLogout }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [stats, setStats] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [revenueCategories, setRevenueCategories] = useState([]);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    password: "",
  });

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem("dashboardStartDate");
    return saved || "";
  });
  const [endDate, setEndDate] = useState(() => {
    const saved = localStorage.getItem("dashboardEndDate");
    return saved || "";
  });
  const [groupBy, setGroupBy] = useState(() => {
    const saved = localStorage.getItem("dashboardGroupBy");
    return saved || "date";
  });
  const [selectedBrand, setSelectedBrand] = useState("all");

  const { labels } = useBusinessConfig();

  // Currency settings
  const [currencySettings, setCurrencySettings] = useState(() => {
    const saved = localStorage.getItem("currencySettings");
    return saved ? JSON.parse(saved) : { icon: "₹", size: "text-base", position: "before", customText: "" };
  });

  useEffect(() => {
    localStorage.setItem("currencySettings", JSON.stringify(currencySettings));
  }, [currencySettings]);

  useEffect(() => {
    localStorage.setItem("dashboardStartDate", startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem("dashboardEndDate", endDate);
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem("dashboardGroupBy", groupBy);
  }, [groupBy]);

  const getUniqueBrands = () => {
    const brands = restaurants
      .map(r => r.brand)
      .filter(brand => brand && brand.trim() !== '');
    return [...new Set(brands)];
  };

  useEffect(() => {
    fetchData({
      start_date: startDate,
      end_date: endDate,
      group_by: groupBy,
      brand: selectedBrand
    });
  }, []);

  const fetchData = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.group_by) params.append('group_by', filters.group_by);

      const [restaurantsRes, revenuesRes, statsRes, categoriesRes, employeeStatsRes] = await Promise.all([
        axiosInstance.get("/restaurants"),
        axiosInstance.get(`/revenues?${params.toString()}`),
        axiosInstance.get(`/dashboard/stats?${params.toString()}`),
        axiosInstance.get("/revenue-categories"),
        axiosInstance.get("/employees/stats"),
      ]);
      setRestaurants(restaurantsRes.data);
      setRevenues(revenuesRes.data);
      setRevenueCategories(categoriesRes.data);
      setEmployeeStats(employeeStatsRes.data);

      // Apply brand filter client-side (API doesn't support brand param)
      const brandFilter = filters.brand || "all";
      let statsData = statsRes.data;
      if (brandFilter && brandFilter !== "all") {
        const brandRestaurants = restaurantsRes.data
          .filter(r => r.brand === brandFilter)
          .map(r => r.name);
        const filteredBreakdown = (statsData.restaurant_breakdown || [])
          .filter(r => brandRestaurants.includes(r.restaurant_name));
        const filteredDateWise = (statsData.date_wise_revenue || []).map(d => {
          // If date_wise has per-restaurant data we can filter; otherwise keep as-is
          return d;
        });
        const filteredTotal = filteredBreakdown.reduce((sum, r) => sum + r.total, 0);
        const filteredEntries = filteredBreakdown.reduce((sum, r) => sum + (r.count || 0), 0);
        statsData = {
          ...statsData,
          total_revenue: filteredTotal,
          total_entries: filteredEntries || statsData.total_entries,
          restaurant_breakdown: filteredBreakdown,
        };
      }
      setStats(statsData);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy, brand: selectedBrand });
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setGroupBy("date");
    setSelectedBrand("all");
    fetchData({});
  };

  const handleApplyKPI = (kpiConfig) => {
    fetchData({ start_date: kpiConfig.startDate, end_date: kpiConfig.endDate, group_by: kpiConfig.groupBy, brand: selectedBrand });
  };

  const handleCurrencyUpdate = (newSettings) => {
    setCurrencySettings(newSettings);
    fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy, brand: selectedBrand });
  };

  const handleRevenueAdded = () => {
    fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy, brand: selectedBrand });
    toast.success("Revenue entry added successfully!");
  };

  const handleRestaurantUpdated = () => {
    fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy, brand: selectedBrand });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const updateData = {};
      if (profileData.name) updateData.name = profileData.name;
      if (profileData.email) updateData.email = profileData.email;
      if (profileData.mobile) updateData.mobile = profileData.mobile;
      if (profileData.password) updateData.password = profileData.password;

      await axiosInstance.put("/profile", updateData);
      toast.success("Profile updated successfully!");
      setProfileDialogOpen(false);
      setProfileData({ ...profileData, password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  // Page title mapping
  const pageTitles = {
    dashboard: "Dashboard",
    revenue: `Add ${labels.revenue}`,
    history: `${labels.revenue} History`,
    reports: "Reports",
    restaurants: labels.entities,
    categories: `${labels.revenue} Categories`,
    users: "User Management",
    employees: "Employees",
    documents: "Documents",
    brands: "Brands",
    royaltyentry: "Royalty Entry",
    royaltysummary: "Royalty Summary",
    royaltypayees: "Manage Payees",
    targets: `${labels.entity} Targets`,
    expenseentry: "Expense Entry",
    pettycashsummary: "Petty Cash Summary",
    "business-config": "Business Settings",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center animate-pulse">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Inline Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
              <div className="flex flex-wrap items-center gap-2">
                {/* Date range */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-0 p-0 h-auto text-sm w-[120px] focus-visible:ring-0 bg-transparent"
                    data-testid="filter-start-date"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-0 p-0 h-auto text-sm w-[120px] focus-visible:ring-0 bg-transparent"
                    data-testid="filter-end-date"
                  />
                </div>
                {/* Group by */}
                <Select value={groupBy} onValueChange={(v) => { setGroupBy(v); }}>
                  <SelectTrigger className="w-auto gap-1.5 text-sm border-gray-200 dark:border-gray-700 rounded-lg h-9 bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Daily</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="restaurant">{labels.entity}</SelectItem>
                    <SelectItem value="brand">{labels.brand}</SelectItem>
                  </SelectContent>
                </Select>
                {/* Brand filter */}
                <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); }}>
                  <SelectTrigger className="w-auto gap-1.5 text-sm border-gray-200 dark:border-gray-700 rounded-lg h-9 bg-white dark:bg-gray-800">
                    <SelectValue placeholder={`All ${labels.brand}s`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{`All ${labels.brand}s`}</SelectItem>
                    {getUniqueBrands().map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Apply */}
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-9 px-5 text-sm font-medium"
                  onClick={handleApplyFilters}
                >
                  Apply
                </Button>
                {/* Clear - only show when filters are active */}
                {(startDate || endDate || groupBy !== "date" || selectedBrand !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-9 text-sm"
                    onClick={handleClearFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <DashboardStats stats={stats} employeeStats={employeeStats} groupBy={groupBy} />

            {/* Custom KPI Builder */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Custom KPIs & Visualizations</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Create custom reports with advanced filtering and visualization options
                </p>
              </div>
              <div className="p-6">
                <KPIBuilder
                  stats={stats}
                  employeeStats={employeeStats}
                  restaurants={restaurants}
                  revenues={revenues}
                  onApplyKPI={handleApplyKPI}
                />
              </div>
            </div>
          </div>
        );

      case "revenue":
        return (
          <Card className="max-w-2xl mx-auto shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl dark:text-white">{`Add ${labels.revenue} Entry`}</CardTitle>
              <CardDescription>{`Submit daily ${labels.revenue.toLowerCase()} for a ${labels.entity.toLowerCase()}`}</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueForm restaurants={restaurants} onSuccess={handleRevenueAdded} />
            </CardContent>
          </Card>
        );

      case "history":
        return (
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl dark:text-white">{`${labels.revenue} History`}</CardTitle>
              <CardDescription>{`View and manage all submitted ${labels.revenue.toLowerCase()} entries`}</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueList
                revenues={revenues}
                restaurants={restaurants}
                onUpdate={() => fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy, brand: selectedBrand })}
              />
            </CardContent>
          </Card>
        );

      case "reports":
        return <ReportsTable restaurants={restaurants} />;

      case "restaurants":
        return user.role === "admin" ? (
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl dark:text-white">{`Manage ${labels.entities}`}</CardTitle>
              <CardDescription>{`Add, edit, or delete ${labels.entities.toLowerCase()}`}</CardDescription>
            </CardHeader>
            <CardContent>
              <RestaurantManager restaurants={restaurants} onUpdate={handleRestaurantUpdated} />
            </CardContent>
          </Card>
        ) : null;

      case "categories":
        return user.role === "admin" ? (
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl dark:text-white">{`${labels.revenue} Categories`}</CardTitle>
              <CardDescription>{`Manage ${labels.revenue.toLowerCase()} categories for detailed reporting`}</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueCategoriesManager
                categories={revenueCategories}
                restaurants={restaurants}
                onUpdate={() => fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy, brand: selectedBrand })}
              />
            </CardContent>
          </Card>
        ) : null;

      case "users":
        return <UserManager currentUser={user} />;
      case "employees":
        return <EmployeeManager restaurants={restaurants} />;
      case "documents":
        return <RestaurantDocuments restaurants={restaurants} />;
      case "brands":
        return <BrandManager />;
      case "royaltyentry":
        return <RoyaltyEntry restaurants={restaurants} />;
      case "royaltysummary":
        return <RoyaltySummary restaurants={restaurants} />;
      case "royaltypayees":
        return <RoyaltyPayeeManager />;
      case "targets":
        return <RestaurantTargetManager restaurants={restaurants} />;
      case "expenseentry":
        return <ExpenseEntry restaurants={restaurants} user={user} />;
      case "pettycashsummary":
        return <PettyCashSummary restaurants={restaurants} />;
      case "business-config":
        return <BusinessConfigManager />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={onLogout}
          onProfileOpen={() => setProfileDialogOpen(true)}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{labels.appName}</span>
        </div>
        <div className="ml-auto">
          <CurrencySettings onUpdate={handleCurrencyUpdate} />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="md:hidden fixed inset-y-0 left-0 z-50">
            <Sidebar
              user={user}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onLogout={onLogout}
              onProfileOpen={() => { setProfileDialogOpen(true); setMobileSidebarOpen(false); }}
              collapsed={false}
              onCollapse={() => {}}
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? "md:ml-[68px]" : "md:ml-[250px]"}`}>
        {/* Top bar for page title + currency */}
        <div className="sticky top-0 z-30 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-800/60">
          <div className="flex items-center justify-between px-6 lg:px-8 h-14">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden md:block">
              {pageTitles[activeTab] || "Dashboard"}
            </h1>
            <div className="hidden md:block">
              <CurrencySettings onUpdate={handleCurrencyUpdate} />
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 mt-14 md:mt-0">
          {renderContent()}
        </div>
      </main>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>Update your personal information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user.username} disabled className="bg-gray-100 dark:bg-gray-800" />
              <p className="text-xs text-gray-500">Username cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={profileData.mobile}
                onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={profileData.password}
                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
              />
              <p className="text-xs text-gray-500">Only fill if you want to change password</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Update Profile</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
