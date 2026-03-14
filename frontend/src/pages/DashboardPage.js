import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LogOut, Building2, TrendingUp, DollarSign, FileText, Filter, FileSpreadsheet, Users, User, Menu, X, MoreHorizontal, ChevronDown, Tag, Target, Receipt, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    password: "",
  });
  
  // Filter states - Load from localStorage for persistence
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

  const { labels, config } = useBusinessConfig();

  // Currency settings
  const [currencySettings, setCurrencySettings] = useState(() => {
    const saved = localStorage.getItem("currencySettings");
    return saved ? JSON.parse(saved) : { icon: "₹", size: "text-base", position: "before", customText: "" };
  });

  useEffect(() => {
    localStorage.setItem("currencySettings", JSON.stringify(currencySettings));
  }, [currencySettings]);

  // Save filter states to localStorage for persistence
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
    // Fetch data with saved filters on mount
    fetchData({
      start_date: startDate,
      end_date: endDate,
      group_by: groupBy
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
      setStats(statsRes.data);
      setRevenueCategories(categoriesRes.data);
      setEmployeeStats(employeeStatsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchData({
      start_date: startDate,
      end_date: endDate,
      group_by: groupBy
    });
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setGroupBy("date");
    fetchData();
  };

  const handleApplyKPI = (kpiConfig) => {
    // Apply KPI filters to the dashboard
    fetchData({
      start_date: kpiConfig.startDate,
      end_date: kpiConfig.endDate,
      group_by: kpiConfig.groupBy
    });
  };

  const handleCurrencyUpdate = (newSettings) => {
    setCurrencySettings(newSettings);
    // Re-fetch data to trigger re-render with new currency settings
    fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy });
  };

  const handleRevenueAdded = () => {
    fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy });
    toast.success("Revenue entry added successfully!");
  };

  const handleRestaurantUpdated = () => {
    fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{labels.appName}</h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Welcome, <span className="font-medium">{user.username}</span>
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                    {user.role}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Desktop buttons */}
              <div className="hidden md:flex items-center gap-3">
                <CurrencySettings onUpdate={handleCurrencyUpdate} />
                <Button
                  onClick={() => setProfileDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">My Profile</span>
                </Button>
                <Button
                  onClick={onLogout}
                  variant="outline"
                  className="gap-2"
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </div>
              {/* Mobile menu button */}
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-8">
          {/* Mobile Current Tab Indicator */}
          <div className="md:hidden sticky top-[64px] z-40 bg-gradient-to-br from-blue-50 via-white to-green-50 pb-4">
            <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 p-3 rounded-lg mt-4">
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {activeTab === "revenue-categories" ? `${labels.revenue} Categories` : activeTab}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tap menu to switch sections
              </p>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:block sticky top-[64px] z-40 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-gray-700 shadow-lg">
            <TabsList className="bg-transparent backdrop-blur-sm border-0 p-3 h-auto rounded-none gap-1 w-full justify-start overflow-x-auto" data-testid="dashboard-tabs">
            <TabsTrigger 
              value="dashboard" 
              className="gap-2 text-gray-300 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:rounded-lg hover:text-white hover:bg-white/10 transition-all px-4 py-2.5 font-medium border-0" 
              data-testid="dashboard-tab"
            >
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="revenue" 
              className="gap-2 text-gray-300 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:rounded-lg hover:text-white hover:bg-white/10 transition-all px-4 py-2.5 font-medium border-0" 
              data-testid="revenue-tab"
            >
              <DollarSign className="w-4 h-4" />
              {`Add ${labels.revenue}`}
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="gap-2 text-gray-300 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:rounded-lg hover:text-white hover:bg-white/10 transition-all px-4 py-2.5 font-medium border-0" 
              data-testid="history-tab"
            >
              <FileText className="w-4 h-4" />
              {`${labels.revenue} History`}
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="gap-2 text-gray-300 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:rounded-lg hover:text-white hover:bg-white/10 transition-all px-4 py-2.5 font-medium border-0" 
              data-testid="reports-tab"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Reports
            </TabsTrigger>
            {user.role === "admin" && (
              <TabsTrigger 
                value="restaurants" 
                className="gap-2 text-gray-300 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:rounded-lg hover:text-white hover:bg-white/10 transition-all px-4 py-2.5 font-medium border-0" 
                data-testid="restaurants-tab"
              >
                <Building2 className="w-4 h-4" />
                {labels.entities}
              </TabsTrigger>
            )}
            {user.role === "admin" && (
              <TabsTrigger 
                value="categories" 
                className="gap-2 text-gray-300 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:rounded-lg hover:text-white hover:bg-white/10 transition-all px-4 py-2.5 font-medium border-0" 
                data-testid="categories-tab"
              >
                <FileText className="w-4 h-4" />
                Categories
              </TabsTrigger>
            )}
            {/* More Menu - Ellipsis */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium transition-all border-0 rounded-lg ${
                    ['users', 'employees', 'documents', 'brands', 'royaltyentry', 'royaltysummary', 'royaltypayees', 'targets', 'expenseentry', 'pettycashsummary', 'business-config'].includes(activeTab)
                      ? 'bg-transparent text-white border-2 border-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  More
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-gradient-to-br from-slate-800 to-slate-700 border-gray-600 text-white min-w-48">
                {(user.role === "admin" || user.role === "superuser" || (user.role === "manager" && user.permissions?.users !== "none")) && (
                  <DropdownMenuItem 
                    onClick={() => setActiveTab("users")}
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Users
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setActiveTab("employees")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Employees
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("documents")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Documents
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("royaltyentry")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Royalty Entry
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("royaltysummary")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Royalty Summary
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("royaltypayees")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Payees
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("targets")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {`${labels.entity} Targets`}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("expenseentry")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Expense Entry
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setActiveTab("pettycashsummary")}
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Petty Cash Summary
                </DropdownMenuItem>
                {(user.role === "admin" || user.role === "superuser") && (
                  <DropdownMenuItem
                    onClick={() => setActiveTab("brands")}
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Brands
                  </DropdownMenuItem>
                )}
                {(user.role === "admin" || user.role === "superuser") && (
                  <DropdownMenuItem
                    onClick={() => setActiveTab("business-config")}
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Business Settings
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6 pt-6" data-testid="dashboard-content">
            {/* Filter Controls */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter & Group Data
                </CardTitle>
                <CardDescription>
                  {`Filter ${labels.revenue.toLowerCase()} data by date range and group by different periods`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="filter-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="filter-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-by">Group By</Label>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                      <SelectTrigger data-testid="group-by-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Daily</SelectItem>
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="restaurant">{labels.entity}</SelectItem>
                        <SelectItem value="brand">{labels.brand}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-filter">{`Filter by ${labels.brand}`}</Label>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger data-testid="brand-filter-select">
                        <SelectValue placeholder={`All ${labels.brand}s`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{`All ${labels.brand}s`}</SelectItem>
                        {getUniqueBrands().map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex items-end gap-2">
                    <Button
                      onClick={handleApplyFilters}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                      data-testid="apply-filters-button"
                    >
                      Apply
                    </Button>
                    <Button
                      onClick={handleClearFilters}
                      variant="outline"
                      data-testid="clear-filters-button"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DashboardStats stats={stats} employeeStats={employeeStats} groupBy={groupBy} />

            {/* Custom KPI Builder */}
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle>Custom KPIs & Visualizations</CardTitle>
                <CardDescription>
                  Create custom reports with advanced filtering and visualization options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KPIBuilder 
                  stats={stats}
                  employeeStats={employeeStats}
                  restaurants={restaurants}
                  revenues={revenues}
                  onApplyKPI={handleApplyKPI}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="pt-6" data-testid="revenue-form-content">
            <Card className="max-w-2xl mx-auto shadow-xl border-0 bg-white/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl">{`Add ${labels.revenue} Entry`}</CardTitle>
                <CardDescription>
                  {`Submit daily ${labels.revenue.toLowerCase()} for a ${labels.entity.toLowerCase()}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueForm
                  restaurants={restaurants}
                  onSuccess={handleRevenueAdded}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="pt-6" data-testid="history-content">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl">{`${labels.revenue} History`}</CardTitle>
                <CardDescription>
                  {`View and manage all submitted ${labels.revenue.toLowerCase()} entries`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueList 
                  revenues={revenues} 
                  restaurants={restaurants} 
                  onUpdate={() => fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy })}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="pt-6" data-testid="reports-content">
            <ReportsTable restaurants={restaurants} />
          </TabsContent>

          {user.role === "admin" && (
            <TabsContent value="restaurants" className="pt-6" data-testid="restaurants-content">
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">{`Manage ${labels.entities}`}</CardTitle>
                  <CardDescription>
                    {`Add, edit, or delete ${labels.entities.toLowerCase()}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RestaurantManager
                    restaurants={restaurants}
                    onUpdate={handleRestaurantUpdated}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {user.role === "admin" && (
            <TabsContent value="categories" className="pt-6" data-testid="categories-content">
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">{`${labels.revenue} Categories`}</CardTitle>
                  <CardDescription>
                    {`Manage ${labels.revenue.toLowerCase()} categories for detailed reporting`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RevenueCategoriesManager
                    categories={revenueCategories}
                    restaurants={restaurants}
                    onUpdate={() => fetchData({ start_date: startDate, end_date: endDate, group_by: groupBy })}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {(user.role === "admin" || user.role === "superuser" || (user.role === "manager" && user.permissions?.users !== "none")) && (
            <TabsContent value="users" className="pt-6" data-testid="users-content">
              <UserManager currentUser={user} />
            </TabsContent>
          )}

          <TabsContent value="employees" className="pt-6" data-testid="employees-content">
            <EmployeeManager restaurants={restaurants} />
          </TabsContent>

          <TabsContent value="documents" className="pt-6" data-testid="documents-content">
            <RestaurantDocuments restaurants={restaurants} />
          </TabsContent>

          <TabsContent value="brands" className="pt-6" data-testid="brands-content">
            <BrandManager />
          </TabsContent>

          <TabsContent value="royaltyentry" className="pt-6" data-testid="royaltyentry-content">
            <RoyaltyEntry restaurants={restaurants} />
          </TabsContent>

          <TabsContent value="royaltysummary" className="pt-6" data-testid="royaltysummary-content">
            <RoyaltySummary restaurants={restaurants} />
          </TabsContent>

          <TabsContent value="royaltypayees" className="pt-6" data-testid="royaltypayees-content">
            <RoyaltyPayeeManager />
          </TabsContent>

          <TabsContent value="targets" className="pt-6" data-testid="targets-content">
            <RestaurantTargetManager restaurants={restaurants} />
          </TabsContent>

          <TabsContent value="expenseentry" className="pt-6" data-testid="expenseentry-content">
            <ExpenseEntry restaurants={restaurants} user={user} />
          </TabsContent>

          <TabsContent value="pettycashsummary" className="pt-6" data-testid="pettycashsummary-content">
            <PettyCashSummary restaurants={restaurants} />
          </TabsContent>

          {(user.role === "admin" || user.role === "superuser") && (
            <TabsContent value="business-config" className="pt-6" data-testid="business-config-content">
              <BusinessConfigManager />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user.username} disabled className="bg-gray-100" />
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
              <Button type="button" variant="outline" onClick={() => setProfileDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Menu
            </SheetTitle>
            <SheetDescription>
              Quick access to key features
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-2">
            {/* Primary Navigation Items */}
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => {
                setActiveTab("dashboard");
                setMobileMenuOpen(false);
              }}
            >
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </Button>

            <Button
              variant={activeTab === "revenue" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => {
                setActiveTab("revenue");
                setMobileMenuOpen(false);
              }}
            >
              <DollarSign className="w-4 h-4" />
              {`Add ${labels.revenue}`}
            </Button>

            {/* More Options - Expandable */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  More Options
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>More Options</SheetTitle>
                  <SheetDescription>
                    Additional sections and settings
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-2">
                  <Button
                    variant={activeTab === "restaurants" ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setActiveTab("restaurants");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Building2 className="w-4 h-4" />
                    {labels.entities}
                  </Button>

                  <Button
                    variant={activeTab === "revenue-categories" ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setActiveTab("revenue-categories");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {`${labels.revenue} Categories`}
                  </Button>

                  <Button
                    variant={activeTab === "employees" ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setActiveTab("employees");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Users className="w-4 h-4" />
                    Employees
                  </Button>

                  <Button
                    variant={activeTab === "documents" ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setActiveTab("documents");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Documents
                  </Button>

                  {(user.role === "admin" || user.role === "superuser" || (user.role === "manager" && user.permissions?.users !== "none")) && (
                    <Button
                      variant={activeTab === "users" ? "default" : "ghost"}
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        setActiveTab("users");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Users className="w-4 h-4" />
                      User Management
                    </Button>
                  )}
                  {(user.role === "admin" || user.role === "superuser") && (
                    <Button
                      variant={activeTab === "business-config" ? "default" : "ghost"}
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        setActiveTab("business-config");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                      Business Settings
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <div className="pt-4 mt-4 border-t space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setProfileDialogOpen(true);
                  setMobileMenuOpen(false);
                }}
              >
                <User className="w-4 h-4" />
                My Profile
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DashboardPage;