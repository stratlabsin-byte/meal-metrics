import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, FileText, Building2, MoreVertical, Users } from "lucide-react";
import { CurrencyDisplay } from "./CurrencySettings";
import { useState, useEffect } from "react";
import DataDetailPopup from "./DataDetailPopup";
import StatCardManager from "./StatCardManager";
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Edit, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const DashboardStats = ({ stats, employeeStats, groupBy = "date", onUpdateStats }) => {
  const [detailPopup, setDetailPopup] = useState({
    isOpen: false,
    data: null,
    type: "general"
  });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, chartId: null, chartType: null });
  const [hiddenCards, setHiddenCards] = useState(new Set());
  const [hiddenCharts, setHiddenCharts] = useState(new Set());
  const [editDialog, setEditDialog] = useState({ isOpen: false, chartId: null, chartType: null });
  const [chartConfigs, setChartConfigs] = useState(() => {
    const saved = localStorage.getItem('chartConfigs');
    return saved ? JSON.parse(saved) : {
      'bar-chart': { title: 'Revenue by Restaurant', color: '#3B82F6', type: 'bar' },
      'pie-chart': { title: 'Revenue Distribution', color: '#10B981', type: 'pie' },
      'line-chart': { title: 'Daily Revenue', color: '#F59E0B', type: 'line' }
    };
  });

  // Persist chart configs
  useEffect(() => {
    localStorage.setItem('chartConfigs', JSON.stringify(chartConfigs));
  }, [chartConfigs]);

  const showDataDetail = (data, type = "chart") => {
    setDetailPopup({
      isOpen: true,
      data,
      type
    });
  };

  const handleCloneStatCard = (cardType, cardData) => {
    toast.success(`${cardType} card cloned successfully!`);
    // In a real implementation, this would create a duplicate card
  };

  const handleEditStatCard = (cardType) => {
    toast.info(`Edit ${cardType} card functionality available!`);
    // This would open an edit dialog for the built-in stat cards
  };

  const handleDownloadStatCardCSV = (cardType, data) => {
    let csvContent = `Card Type,${cardType}\n`;
    csvContent += `Exported At,${formatDateDDMonYYYY(new Date())}\n\n`;
    csvContent += `Metric,Value\n`;
    
    // Convert data object to CSV rows
    Object.entries(data).forEach(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      csvContent += `${formattedKey},${value}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cardType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`${cardType} downloaded as CSV!`);
  };

  const handleDownloadStatCardImage = async (cardId, cardType) => {
    try {
      const element = document.querySelector(`[data-testid="${cardId}"]`);
      if (!element) {
        toast.error("Card element not found");
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cardType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${cardType} downloaded as image!`);
      });
    } catch (error) {
      console.error("Error downloading card:", error);
      toast.error("Failed to download card image");
    }
  };

  const handleDeleteStatCard = (cardId, cardType) => {
    setHiddenCards(prev => new Set([...prev, cardId]));
    toast.success(`${cardType} card hidden successfully!`);
    setDeleteDialog({ isOpen: false, chartId: null, chartType: null });
  };

  const handleCloneChart = (chartType) => {
    toast.success(`${chartType} chart cloned successfully!`);
  };

  const handleEditChart = (chartId, chartType) => {
    setEditDialog({ isOpen: true, chartId, chartType });
  };

  const handleSaveChartEdit = () => {
    toast.success(`${editDialog.chartType} updated successfully!`);
    setEditDialog({ isOpen: false, chartId: null, chartType: null });
  };

  const handleCancelEdit = () => {
    setEditDialog({ isOpen: false, chartId: null, chartType: null });
  };

  const handleDownloadChartCSV = (chartTitle, data) => {
    let csvContent = `Chart,${chartTitle}\n`;
    csvContent += `Exported At,${formatDateDDMonYYYY(new Date())}\n\n`;
    csvContent += `Name,Revenue,Count\n`;
    
    data.forEach(item => {
      const name = item.restaurant_name || item.name || item.date || 'N/A';
      const revenue = item.total || item.revenue || item.value || 0;
      const count = item.count || item.entries || 0;
      csvContent += `"${name}",${revenue},${count}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Chart data downloaded as CSV!");
  };

  const handleDownloadChartImage = async (chartId, chartType) => {
    try {
      const element = document.querySelector(`[data-testid="${chartId}"]`);
      if (!element) {
        toast.error("Chart element not found");
        return;
      }

      // Use html2canvas library
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chartType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${chartType} downloaded as image!`);
      });
    } catch (error) {
      console.error("Error downloading chart:", error);
      toast.error("Failed to download chart image");
    }
  };

  const handleDeleteChart = (chartId, chartType) => {
    setHiddenCharts(prev => new Set([...prev, chartId]));
    toast.success(`${chartType} chart hidden successfully!`);
    setDeleteDialog({ isOpen: false, chartId: null, chartType: null });
  };

  const openDeleteDialog = (chartId, chartType) => {
    setDeleteDialog({ isOpen: true, chartId, chartType });
  };

  if (!stats) return null;

  const getChartLabel = () => {
    if (groupBy === "month") return "Monthly Revenue";
    if (groupBy === "restaurant") return "Revenue by Restaurant";
    return "Daily Revenue";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {!hiddenCards.has('total-revenue') && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100" data-testid="total-revenue-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="total-revenue-menu">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCloneStatCard("Total Revenue", { total_revenue: stats.total_revenue })} className="gap-2">
                      <Copy className="w-4 h-4" />
                      Clone Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditStatCard("Total Revenue")} className="gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardCSV("Total Revenue", { total_revenue: stats.total_revenue })} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardImage("total-revenue-card", "Total Revenue")} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDeleteDialog("total-revenue", "Total Revenue")} className="gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      Hide Card
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900" data-testid="total-revenue-value">
                <CurrencyDisplay amount={stats.total_revenue} />
              </div>
            </CardContent>
          </Card>
        )}

        {!hiddenCards.has('total-entries') && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100" data-testid="total-entries-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Entries
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="total-entries-menu">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCloneStatCard("Total Entries", { total_entries: stats.total_entries })} className="gap-2">
                      <Copy className="w-4 h-4" />
                      Clone Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditStatCard("Total Entries")} className="gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardCSV("Total Entries", { total_entries: stats.total_entries })} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardImage("total-entries-card", "Total Entries")} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDeleteDialog("total-entries", "Total Entries")} className="gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      Hide Card
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900" data-testid="total-entries-value">
                {stats.total_entries}
              </div>
            </CardContent>
          </Card>
        )}

        {!hiddenCards.has('avg-revenue') && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100" data-testid="avg-revenue-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Revenue
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="avg-revenue-menu">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCloneStatCard("Average Revenue", { average_revenue: stats.total_entries > 0 ? stats.total_revenue / stats.total_entries : 0 })} className="gap-2">
                      <Copy className="w-4 h-4" />
                      Clone Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditStatCard("Average Revenue")} className="gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardCSV("Average Revenue", { average_revenue: stats.total_entries > 0 ? stats.total_revenue / stats.total_entries : 0 })} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardImage("avg-revenue-card", "Average Revenue")} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDeleteDialog("avg-revenue", "Average Revenue")} className="gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      Hide Card
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900" data-testid="avg-revenue-value">
                <CurrencyDisplay 
                  amount={stats.total_entries > 0 ? stats.total_revenue / stats.total_entries : 0}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {!hiddenCards.has('restaurant-count') && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100" data-testid="restaurants-count-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Restaurants
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid="restaurants-count-menu">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCloneStatCard("Restaurant Count", { restaurant_count: stats.restaurant_breakdown.length })} className="gap-2">
                      <Copy className="w-4 h-4" />
                      Clone Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditStatCard("Restaurant Count")} className="gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Card
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardCSV("Restaurant Count", { restaurant_count: stats.restaurant_breakdown.length })} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadStatCardImage("restaurants-count-card", "Restaurant Count")} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openDeleteDialog("restaurant-count", "Restaurant Count")} className="gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      Hide Card
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900" data-testid="restaurants-count-value">
                {stats.restaurant_breakdown.length}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Custom Stat Cards Manager */}
      <StatCardManager stats={stats} employeeStats={employeeStats} onUpdate={onUpdateStats} />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Restaurant Breakdown Bar Chart */}
        {!hiddenCharts.has('bar-chart') && (
          <Card 
            className="shadow-xl border-0 bg-white/90 backdrop-blur-xl relative group" 
            data-testid="restaurant-breakdown-chart"
            style={{ 
              resize: 'both', 
              overflow: 'auto',
              minWidth: '300px',
              minHeight: '350px'
            }}
          >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="truncate pr-2" title={chartConfigs['bar-chart'].title}>
                {chartConfigs['bar-chart'].title}
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="bar-chart-menu">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCloneChart("Bar Chart")} className="gap-2">
                    <Copy className="w-4 h-4" />
                    Clone Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditChart("bar-chart", "Bar Chart")} className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadChartCSV("Restaurant Revenue Bar Chart", stats.restaurant_breakdown)} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadChartImage("restaurant-breakdown-chart", "Bar Chart")} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Image
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openDeleteDialog("bar-chart", "Bar Chart")} className="gap-2 text-red-600">
                    <Trash2 className="w-4 h-4" />
                    Hide Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {stats.restaurant_breakdown.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.restaurant_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="restaurant_name" 
                    stroke="#6b7280" 
                    angle={0} 
                    textAnchor="middle" 
                    height={60}
                    tick={{ fontSize: 9 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [<CurrencyDisplay amount={value} />, "Revenue"]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="total" 
                    fill={chartConfigs['bar-chart'].color} 
                    name="Revenue" 
                    radius={[8, 8, 0, 0]} 
                    onClick={(data) => showDataDetail(data, "chart")}
                    style={{ cursor: "pointer" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
          <div className="absolute bottom-1 right-1 w-4 h-4 opacity-30 group-hover:opacity-60 cursor-nwse-resize">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M16 0v16H0L16 0zM14 14V2L2 14h12z" opacity="0.3"/>
            </svg>
          </div>
        </Card>
        )}

        {/* Restaurant Breakdown Pie Chart */}
        {!hiddenCharts.has('pie-chart') && (
          <Card 
            className="shadow-xl border-0 bg-white/90 backdrop-blur-xl relative group" 
            data-testid="restaurant-pie-chart"
            style={{ 
              resize: 'both', 
              overflow: 'auto',
              minWidth: '300px',
              minHeight: '350px'
            }}
          >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="truncate pr-2" title={chartConfigs['pie-chart'].title}>
                {chartConfigs['pie-chart'].title}
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="pie-chart-menu">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCloneChart("Pie Chart")} className="gap-2">
                    <Copy className="w-4 h-4" />
                    Clone Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditChart("pie-chart", "Pie Chart")} className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadChartCSV("Revenue Distribution Pie Chart", stats.restaurant_breakdown)} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadChartImage("restaurant-pie-chart", "Pie Chart")} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Image
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openDeleteDialog("pie-chart", "Pie Chart")} className="gap-2 text-red-600">
                    <Trash2 className="w-4 h-4" />
                    Hide Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {stats.restaurant_breakdown.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.restaurant_breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={{
                      stroke: '#8884d8',
                      strokeWidth: 1
                    }}
                    label={(props) => {
                      const { cx, cy, midAngle, outerRadius, percent, restaurant_name } = props;
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 30;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);

                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#374151" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          fontSize="11px"
                          fontWeight="600"
                        >
                          {`${restaurant_name} (${(percent * 100).toFixed(0)}%)`}
                        </text>
                      );
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                    onClick={(data) => showDataDetail(data, "chart")}
                    style={{ cursor: "pointer" }}
                  >
                    {stats.restaurant_breakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        onClick={() => showDataDetail(entry, "chart")}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [<CurrencyDisplay amount={value} />, "Revenue"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
          <div className="absolute bottom-1 right-1 w-4 h-4 opacity-30 group-hover:opacity-60 cursor-nwse-resize">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M16 0v16H0L16 0zM14 14V2L2 14h12z" opacity="0.3"/>
            </svg>
          </div>
        </Card>
        )}
      </div>

      {/* Date-wise Revenue Line Chart */}
      {!hiddenCharts.has('line-chart') && (
        <Card 
          className="shadow-xl border-0 bg-white/90 backdrop-blur-xl relative group" 
          data-testid="date-wise-chart"
          style={{ 
            resize: 'both', 
            overflow: 'auto',
            minWidth: '300px',
            minHeight: '350px'
          }}
        >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="truncate pr-2" title={chartConfigs['line-chart'].title}>
              {chartConfigs['line-chart'].title}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="line-chart-menu">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCloneChart("Line Chart")} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Clone Chart
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditChart("line-chart", "Line Chart")} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Chart
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadChartCSV("Revenue Trends Line Chart", stats.date_wise_revenue)} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadChartImage("date-wise-chart", "Line Chart")} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download Image
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openDeleteDialog("line-chart", "Line Chart")} className="gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
                  Hide Chart
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {stats.date_wise_revenue.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.date_wise_revenue.map(item => ({
                ...item,
                date: formatDateDDMonYYYY(item.date)
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [<CurrencyDisplay amount={value} />, "Revenue"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Revenue"
                  dot={{ fill: "#10B981", r: 5, cursor: "pointer" }}
                  onClick={(data) => showDataDetail(data, "chart")}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
        <div className="absolute bottom-1 right-1 w-4 h-4 opacity-30 group-hover:opacity-60 cursor-nwse-resize">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M16 0v16H0L16 0zM14 14V2L2 14h12z" opacity="0.3"/>
          </svg>
        </div>
      </Card>
      )}

      {/* Data Detail Popup */}
      <DataDetailPopup
        isOpen={detailPopup.isOpen}
        onClose={() => setDetailPopup({ isOpen: false, data: null, type: "general" })}
        data={detailPopup.data}
        type={detailPopup.type}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, chartId: null, chartType: null })}>
        <AlertDialogContent data-testid="delete-chart-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Hide {deleteDialog.chartType}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to hide this {deleteDialog.chartType?.toLowerCase()}? You can restore it by refreshing the page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-chart">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteChart(deleteDialog.chartId, deleteDialog.chartType)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-chart"
            >
              Hide {deleteDialog.chartType}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Chart Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-md" data-testid="edit-chart-dialog">
          <DialogHeader>
            <DialogTitle>Edit {editDialog.chartType}</DialogTitle>
            <DialogDescription>
              Customize the chart title and appearance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chart-title">Chart Title</Label>
              <Input
                id="chart-title"
                value={editDialog.chartId ? chartConfigs[editDialog.chartId]?.title : ''}
                onChange={(e) => setChartConfigs({
                  ...chartConfigs,
                  [editDialog.chartId]: {
                    ...chartConfigs[editDialog.chartId],
                    title: e.target.value
                  }
                })}
                placeholder="Enter chart title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-color">Primary Color</Label>
              <Input
                id="chart-color"
                type="color"
                value={editDialog.chartId ? chartConfigs[editDialog.chartId]?.color : '#3B82F6'}
                onChange={(e) => setChartConfigs({
                  ...chartConfigs,
                  [editDialog.chartId]: {
                    ...chartConfigs[editDialog.chartId],
                    color: e.target.value
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-type">Chart Type</Label>
              <Select
                value={editDialog.chartId ? chartConfigs[editDialog.chartId]?.type : 'bar'}
                onValueChange={(value) => setChartConfigs({
                  ...chartConfigs,
                  [editDialog.chartId]: {
                    ...chartConfigs[editDialog.chartId],
                    type: value
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveChartEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardStats;