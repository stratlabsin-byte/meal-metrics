import { useState } from "react";
import {
  TrendingUp, DollarSign, FileText, FileSpreadsheet, Building2,
  Users, Tag, Target, Receipt, Settings, User, LogOut, Moon, Sun,
  ChevronLeft, ChevronRight, MoreHorizontal, Search
} from "lucide-react";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";
import { useThemeContext } from "../contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Sidebar = ({ user, activeTab, onTabChange, onLogout, onProfileOpen, collapsed, onCollapse }) => {
  const { labels } = useBusinessConfig();
  const { theme, toggleTheme } = useThemeContext();

  // Navigation sections
  const mainNav = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "revenue", label: `Add ${labels.revenue}`, icon: DollarSign },
    { id: "history", label: `${labels.revenue} History`, icon: FileText },
    { id: "reports", label: "Reports", icon: FileSpreadsheet },
  ];

  const managementNav = [
    { id: "restaurants", label: labels.entities, icon: Building2, roles: ["admin"] },
    { id: "categories", label: "Categories", icon: FileText, roles: ["admin"] },
    { id: "employees", label: "Employees", icon: Users },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "users", label: "Users", icon: Users, roles: ["admin", "superuser"], permission: "users" },
    { id: "brands", label: "Brands", icon: Tag, roles: ["admin", "superuser"] },
  ];

  const financeNav = [
    { id: "royaltyentry", label: "Royalty Entry", icon: DollarSign },
    { id: "royaltysummary", label: "Royalty Summary", icon: FileSpreadsheet },
    { id: "royaltypayees", label: "Manage Payees", icon: Users },
    { id: "targets", label: `${labels.entity} Targets`, icon: Target },
    { id: "expenseentry", label: "Expense Entry", icon: Receipt },
    { id: "pettycashsummary", label: "Petty Cash", icon: FileSpreadsheet },
  ];

  const settingsNav = [
    { id: "business-config", label: "Business Settings", icon: Settings, roles: ["admin", "superuser"] },
  ];

  const canAccess = (item) => {
    if (!item.roles) return true;
    if (item.permission && user.role === "manager") {
      return user.permissions?.[item.permission] !== "none";
    }
    return item.roles.includes(user.role);
  };

  const NavItem = ({ item }) => {
    if (!canAccess(item)) return null;
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    const button = (
      <button
        onClick={() => onTabChange(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group
          ${isActive
            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
          }
          ${collapsed ? "justify-center" : ""}
        `}
      >
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );

    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  const SectionLabel = ({ label }) => {
    if (collapsed) return <div className="my-2 mx-3 border-t border-gray-200 dark:border-gray-700" />;
    return (
      <div className="px-3 pt-4 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</span>
      </div>
    );
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[250px]"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-gray-200 dark:border-gray-800 px-3 flex-shrink-0 ${collapsed ? "justify-center" : "gap-2.5"}`}>
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4.5 h-4.5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-gray-900 dark:text-white truncate">{labels.appName}</span>
        )}
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 sidebar-scroll">
        {/* Main */}
        <SectionLabel label="Main" />
        {mainNav.map((item) => <NavItem key={item.id} item={item} />)}

        {/* Management */}
        <SectionLabel label="Management" />
        {managementNav.map((item) => <NavItem key={item.id} item={item} />)}

        {/* Finance */}
        <SectionLabel label="Finance" />
        {financeNav.map((item) => <NavItem key={item.id} item={item} />)}

        {/* Settings */}
        <SectionLabel label="Settings" />
        {settingsNav.map((item) => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Bottom section */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 p-2 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          {theme === "dark" ? (
            <Sun className="w-[18px] h-[18px] text-amber-500 flex-shrink-0" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" />
          )}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => onCollapse && onCollapse(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] flex-shrink-0" />
          ) : (
            <ChevronLeft className="w-[18px] h-[18px] flex-shrink-0" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* User profile */}
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${collapsed ? "justify-center" : ""}`}>
          <div
            className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 cursor-pointer flex-shrink-0"
            onClick={onProfileOpen}
          >
            {user.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">{user.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
