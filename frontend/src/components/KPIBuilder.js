import { useState, useEffect } from "react";
import { axiosInstance } from "../App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreVertical, Plus, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table2, Copy, Edit, Download, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { CurrencyDisplay } from "./CurrencySettings";
import DataDetailPopup from "./DataDetailPopup";
import { toast } from "sonner";
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const KPIBuilder = ({ stats, employeeStats, restaurants, revenues, onApplyKPI }) => {
  const { labels } = useBusinessConfig();
  const [open, setOpen] = useState(false);
  const [kpiConfig, setKpiConfig] = useState({
    name: "",
    groupBy: "brand",
    groupByMultiple: [],
    startDate: "",
    endDate: "",
    selectedRestaurants: [],
    selectedCategories: [],
    selectedBrands: [],
    minAmount: "",
    maxAmount: "",
    chartType: "bar",
    color: "#3B82F6",
    textSize: "text-base",
  });
  const [customKPIs, setCustomKPIs] = useState(() => {
    try {
      const saved = localStorage.getItem('customKPIs');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('Loaded Custom KPIs from localStorage:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading custom KPIs:', error);
    }
    return [];
  });
  const [revenueCategories, setRevenueCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [detailPopup, setDetailPopup] = useState({
    isOpen: false,
    data: null,
    type: "general"
  });
  const [editingKPI, setEditingKPI] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, kpiId: null });

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  // Save custom KPIs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('customKPIs', JSON.stringify(customKPIs));
      console.log('Saved Custom KPIs to localStorage:', customKPIs.length);
    } catch (error) {
      console.error('Error saving custom KPIs:', error);
    }
  }, [customKPIs]);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/revenue-categories");
      setRevenueCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await axiosInstance.get("/brands");
      setBrands(response.data);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  const getBrandName = (brandId) => {
    if (!brandId) return "Unknown Brand";
    const brand = brands.find(b => b.id === brandId);
    return brand ? brand.name : brandId;
  };

  const showDataDetail = (data, type = "chart") => {
    setDetailPopup({
      isOpen: true,
      data,
      type
    });
  };

  const handleApply = () => {
    if (editingKPI) {
      // Update existing KPI
      const updatedKPIs = customKPIs.map(kpi => 
        kpi.id === editingKPI.id ? { ...kpiConfig, id: editingKPI.id } : kpi
      );
      setCustomKPIs(updatedKPIs);
      toast.success("KPI updated successfully!");
    } else {
      // Create new KPI
      const newKPI = {
        ...kpiConfig,
        id: Date.now(),
      };
      setCustomKPIs([...customKPIs, newKPI]);
      toast.success("KPI created successfully!");
    }
    
    onApplyKPI(kpiConfig);
    setOpen(false);
    setEditingKPI(null);
    resetKpiConfig();
  };

  const resetKpiConfig = () => {
    setKpiConfig({
      name: "",
      groupBy: "brand",
      groupByMultiple: [],
      startDate: "",
      endDate: "",
      selectedRestaurants: [],
      selectedCategories: [],
      selectedBrands: [],
      minAmount: "",
      maxAmount: "",
      chartType: "bar",
      color: "#3B82F6",
      textSize: "text-base",
    });
  };

  const handleCloneKPI = (kpi) => {
    const clonedKPI = {
      ...kpi,
      id: Date.now().toString(),
      name: `${kpi.name} (Copy)`,
      // Deep clone arrays to avoid reference issues
      groupBy: kpi.groupBy, // groupBy is a string, not an array
      groupByMultiple: [...(kpi.groupByMultiple || [])],
      selectedRestaurants: [...(kpi.selectedRestaurants || [])],
      selectedCategories: [...(kpi.selectedCategories || [])],
      selectedBrands: [...(kpi.selectedBrands || [])]
    };
    setCustomKPIs([...customKPIs, clonedKPI]);
    toast.success(`KPI "${kpi.name}" cloned successfully!`);
  };

  const handleEditKPI = (kpi) => {
    setEditingKPI(kpi);
    setKpiConfig({ ...kpi });
    setOpen(true);
  };

  const handleDownloadKPICSV = (kpi) => {
    // Build complete list of all groupings
    const allGroupings = [kpi.groupBy, ...(kpi.groupByMultiple || [])];
    const uniqueGroupings = [...new Set(allGroupings.filter(Boolean))];
    
    let csvContent = `KPI Name,${kpi.name}\n`;
    csvContent += `Chart Type,${kpi.chartType}\n`;
    csvContent += `Group By,${uniqueGroupings.join(' > ')}\n`;
    csvContent += `Exported At,${formatDateDDMonYYYY(new Date())}\n\n`;
    
    const data = getMultiDimensionalData(kpi);
    
    if (kpi.chartType === 'table' && uniqueGroupings.length > 1) {
      // For multi-dimensional table - create headers based on actual groupings
      const headers = [...uniqueGroupings.map(g => g.charAt(0).toUpperCase() + g.slice(1)), labels.revenue, 'Count'];
      csvContent += headers.join(',') + '\n';
      
      // Export each row with all dimension values
      data.forEach(item => {
        const row = uniqueGroupings.map(field => {
          const value = item[field.toLowerCase()] || 'N/A';
          return `"${value}"`;
        });
        row.push(item.value || 0);
        row.push(item.count || 0);
        csvContent += row.join(',') + '\n';
      });
      
      // Add total row
      const totalRevenue = data.reduce((sum, item) => sum + (item.value || 0), 0);
      const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
      const totalRow = Array(uniqueGroupings.length).fill('""');
      totalRow[0] = '"Total"';
      totalRow.push(totalRevenue, totalCount);
      csvContent += totalRow.join(',') + '\n';
    } else {
      // For simple charts or single grouping tables
      csvContent += `Name,${labels.revenue},Count\n`;
      data.forEach(item => {
        const name = item.name || item[uniqueGroupings[0]] || 'N/A';
        csvContent += `"${name}",${item.value || 0},${item.count || 0}\n`;
      });
      
      // Add total row
      const totalRevenue = data.reduce((sum, item) => sum + (item.value || 0), 0);
      const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
      csvContent += `"Total",${totalRevenue},${totalCount}\n`;
    }

    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvA = document.createElement('a');
    csvA.href = csvUrl;
    csvA.download = `${kpi.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(csvA);
    csvA.click();
    document.body.removeChild(csvA);
    URL.revokeObjectURL(csvUrl);
    
    toast.success("KPI data downloaded as CSV!");
  };

  const handleDownloadKPIImage = async (kpi) => {
    try {
      const element = document.querySelector(`[data-kpi-id="${kpi.id}"]`);
      if (!element) {
        toast.error("KPI element not found");
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
        a.download = `${kpi.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("KPI downloaded as image!");
      });
    } catch (error) {
      console.error("Error downloading KPI:", error);
      toast.error("Failed to download KPI image");
    }
  };

  const handleDeleteKPI = (kpiId) => {
    setCustomKPIs(customKPIs.filter(kpi => kpi.id !== kpiId));
    setDeleteDialog({ isOpen: false, kpiId: null });
    toast.success("KPI deleted successfully!");
  };

  const openDeleteDialog = (kpiId) => {
    setDeleteDialog({ isOpen: true, kpiId });
  };

  const handleRemoveKPI = (id) => {
    openDeleteDialog(id);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingKPI(null);
    resetKpiConfig();
  };

  const formatDate = (dateString) => {
    return formatDateDDMonYYYY(dateString) || "Unknown Date";
  };

  const formatMonth = (dateString) => {
    if (!dateString) return "Unknown Month";
    const [year, month] = dateString.split('-');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]}-${year}`;
  };

  const getMultiDimensionalData = (kpi) => {
    if (!revenues || revenues.length === 0) return [];
    
    // Build unique list of all groupings including primary
    const allGroupings = [kpi.groupBy, ...(kpi.groupByMultiple || [])];
    const groupings = [...new Set(allGroupings)].filter(g => g); // Remove duplicates and empty values
    
    // For single grouping, use the simpler getDataForKPI function
    if (groupings.length <= 1) {
      return getDataForKPI(kpi);
    }

    // Multi-dimensional grouping
    const grouped = {};
    
    revenues.forEach(rev => {
      if (!rev.amounts) return;
      
      // Build base data parts (non-category dimensions)
      // Initialize all possible fields first
      const baseDataParts = {};
      const baseKeyParts = [];
      
      // Process each grouping type and set the data
      groupings.forEach(groupType => {
        if (groupType === "brand") {
          // Get brand from restaurant data
          const restaurant = restaurants.find(r => r.id === rev.restaurant_id);
          const brandName = getBrandName(restaurant?.brand);
          baseKeyParts.push(brandName);
          baseDataParts.brand = brandName;
        }
      });
      
      groupings.forEach(groupType => {
        if (groupType === "restaurant") {
          const restaurantName = rev.restaurant_name || `Unknown ${labels.entity}`;
          baseKeyParts.push(restaurantName);
          baseDataParts.restaurant = restaurantName;
        }
      });
      
      groupings.forEach(groupType => {
        if (groupType === "date") {
          const dateValue = formatDate(rev.date);
          baseKeyParts.push(rev.date || "Unknown Date"); // Use original for sorting
          baseDataParts.date = dateValue; // Use formatted for display
          baseDataParts._dateSort = rev.date; // Keep original for sorting
        }
      });
      
      groupings.forEach(groupType => {
        if (groupType === "month") {
          const monthValue = formatMonth(rev.date);
          baseKeyParts.push(rev.date ? rev.date.substring(0, 7) : "Unknown"); // Use YYYY-MM for sorting
          baseDataParts.month = monthValue; // Use formatted for display
          baseDataParts._monthSort = rev.date ? rev.date.substring(0, 7) : "Unknown"; // Keep for sorting
        }
      });
      
      // For category grouping, we need to iterate through each category
      if (groupings.includes("category")) {
        Object.entries(rev.amounts).forEach(([catId, amount]) => {
          const category = revenueCategories.find(c => c.id === catId);
          const catName = category ? category.name : "Unknown";
          
          // Create key with all dimensions including this specific category
          const fullKeyParts = [...baseKeyParts, catName];
          const key = fullKeyParts.join("_");
          
          if (!grouped[key]) {
            grouped[key] = {
              ...baseDataParts,
              category: catName,
              value: 0,
              count: new Set()
            };
          }
          
          grouped[key].value += parseFloat(amount || 0);
          grouped[key].count.add(rev.id);
        });
      } else {
        // No category grouping - aggregate all amounts
        const key = baseKeyParts.join("_");
        
        if (!grouped[key]) {
          grouped[key] = {
            ...baseDataParts,
            value: 0,
            count: new Set()
          };
        }
        
        grouped[key].value += rev.total_amount || 0;
        grouped[key].count.add(rev.id);
      }
    });
    
    // Convert to array format and sort by grouping columns
    const result = Object.values(grouped).map(item => ({
      ...item,
      count: item.count.size
    }));
    
    // Sort by all grouping columns in order for proper table merging
    // This ensures brand groups are sequential
    result.sort((a, b) => {
      for (const groupType of groupings) {
        const aVal = String(a[groupType] || "").toLowerCase();
        const bVal = String(b[groupType] || "").toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });
    
    return result;
  };

  const renderChart = (data, chartType, kpi = {}) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available for selected criteria
        </div>
      );
    }

    // Check if multi-dimensional grouping
    const hasMultipleGroupings = kpi.groupByMultiple && kpi.groupByMultiple.length > 0;
    const groupings = [kpi.groupBy, ...(kpi.groupByMultiple || [])];
    const uniqueGroupings = [...new Set(groupings.filter(Boolean))];

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                angle={0} 
                textAnchor="middle" 
                height={60}
                tick={{ fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [<CurrencyDisplay amount={value} />, labels.revenue]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar 
                dataKey="value" 
                fill={kpiConfig.color || "#3B82F6"} 
                name={labels.revenue} 
                radius={[8, 8, 0, 0]} 
                onClick={(data) => showDataDetail(data, "chart")}
                style={{ cursor: "pointer" }}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                formatter={(value) => [<CurrencyDisplay amount={value} />, labels.revenue]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke={kpiConfig.color || "#10B981"}
                strokeWidth={3}
                name={labels.revenue}
                dot={{ fill: kpiConfig.color || "#10B981", r: 5, cursor: "pointer" }}
                onClick={(data) => showDataDetail(data, "chart")}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => showDataDetail(data, "chart")}
                style={{ cursor: "pointer" }}
              >
                {data.map((entry, index) => (
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
                formatter={(value) => [<CurrencyDisplay amount={value} />, labels.revenue]}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case "table":
        // Calculate rowspans for grouped columns - FIXED LOGIC
        const calculateRowSpans = () => {
          if (!hasMultipleGroupings || uniqueGroupings.length <= 1) return null;
          
          const rowSpans = [];
          
          // For each row, calculate the rowspan for each column
          for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const spans = [];
            
            // For each grouping column
            for (let colIdx = 0; colIdx < uniqueGroupings.length; colIdx++) {
              const groupType = uniqueGroupings[colIdx];
              
              // Check if this cell should be merged with the one above
              if (i > 0) {
                const prevItem = data[i - 1];
                
                // Cell merges if:
                // 1. All columns to the LEFT have the same value as previous row
                // 2. This column ALSO has the same value as previous row
                let shouldMerge = true;
                
                // Check all columns up to and including current column
                for (let checkIdx = 0; checkIdx <= colIdx; checkIdx++) {
                  if (item[uniqueGroupings[checkIdx]] !== prevItem[uniqueGroupings[checkIdx]]) {
                    shouldMerge = false;
                    break;
                  }
                }
                
                if (shouldMerge) {
                  spans.push(0); // Skip this cell (merged with above)
                  continue;
                }
              }
              
              // This is the first cell in a group - count how many rows it should span
              let span = 1;
              for (let j = i + 1; j < data.length; j++) {
                const nextItem = data[j];
                
                // Check if all columns up to and including current column match
                let allMatch = true;
                for (let checkIdx = 0; checkIdx <= colIdx; checkIdx++) {
                  if (item[uniqueGroupings[checkIdx]] !== nextItem[uniqueGroupings[checkIdx]]) {
                    allMatch = false;
                    break;
                  }
                }
                
                if (allMatch) {
                  span++;
                } else {
                  break;
                }
              }
              
              spans.push(span);
            }
            
            rowSpans.push({ item, spans });
          }
          
          return rowSpans;
        };
        
        const rowSpanData = calculateRowSpans();
        
        return (
          <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {hasMultipleGroupings && uniqueGroupings.map((groupType, idx) => (
                    <th key={idx} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 capitalize">
                      {groupType}
                    </th>
                  ))}
                  {!hasMultipleGroupings && (
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                      Name
                    </th>
                  )}
                  <th className="border border-gray-200 px-3 py-2 text-right font-semibold text-gray-700">
                    {labels.revenue}
                  </th>
                  <th className="border border-gray-200 px-3 py-2 text-right font-semibold text-gray-700">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => {
                  const spans = rowSpanData ? rowSpanData[index].spans : null;
                  
                  return (
                    <tr 
                      key={index} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => showDataDetail(item, "table")}
                      data-testid={`table-row-${index}`}
                    >
                      {hasMultipleGroupings && uniqueGroupings.map((groupType, idx) => {
                        const rowSpan = spans ? spans[idx] : 1;
                        if (rowSpan === 0) return null; // Skip merged cells
                        
                        return (
                          <td 
                            key={idx} 
                            className="border border-gray-200 px-3 py-2"
                            rowSpan={rowSpan > 1 ? rowSpan : undefined}
                            style={rowSpan > 1 ? { verticalAlign: 'middle' } : undefined}
                          >
                            {item[groupType] || "-"}
                          </td>
                        );
                      })}
                      {!hasMultipleGroupings && (
                        <td className="border border-gray-200 px-3 py-2">{item.name}</td>
                      )}
                      <td className="border border-gray-200 px-3 py-2 text-right font-semibold text-green-600">
                        <CurrencyDisplay amount={item.value} />
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right">{item.count || "-"}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={hasMultipleGroupings ? uniqueGroupings.length : 1} className="border border-gray-200 px-3 py-2">
                    Total
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-blue-600">
                    <CurrencyDisplay amount={data.reduce((sum, item) => sum + item.value, 0)} />
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right">
                    {data.reduce((sum, item) => sum + (item.count || 0), 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getDataForKPI = (kpi) => {
    if (!stats) return [];
    
    if (kpi.groupBy === "brand") {
      // Group by brand
      if (!revenues || revenues.length === 0) return [];
      
      const brandData = {};
      const brandCounts = {};
      
      revenues.forEach(rev => {
        const restaurant = restaurants.find(r => r.id === rev.restaurant_id);
        const brandName = getBrandName(restaurant?.brand);
        
        if (!brandData[brandName]) {
          brandData[brandName] = { total: 0 };
          brandCounts[brandName] = new Set();
        }
        brandData[brandName].total += rev.total_amount || 0;
        brandCounts[brandName].add(rev.id);
      });
      
      return Object.entries(brandData).map(([brand, data]) => ({
        name: brand,
        value: data.total,
        count: brandCounts[brand] ? brandCounts[brand].size : 0
      }));
    } else if (kpi.groupBy === "restaurant") {
      return stats.restaurant_breakdown.map(r => ({
        name: r.restaurant_name,
        value: r.total,
        count: r.count
      }));
    } else if (kpi.groupBy === "category") {
      // Group by revenue categories
      if (!revenues || revenues.length === 0) return [];
      
      const categoryData = {};
      const categoryCounts = {};
      
      revenues.forEach(rev => {
        if (!rev.amounts) return;
        
        Object.entries(rev.amounts).forEach(([catId, amount]) => {
          const category = revenueCategories.find(c => c.id === catId);
          const catName = category ? category.name : "Unknown Category";
          
          if (!categoryData[catId]) {
            categoryData[catId] = { name: catName, total: 0 };
            categoryCounts[catId] = new Set();
          }
          categoryData[catId].total += parseFloat(amount || 0);
          categoryCounts[catId].add(rev.id);
        });
      });
      
      return Object.entries(categoryData).map(([catId, data]) => ({
        name: data.name,
        value: data.total,
        count: categoryCounts[catId] ? categoryCounts[catId].size : 0
      }));
    } else if (kpi.groupBy === "month") {
      // Group date_wise data by month
      const monthData = {};
      stats.date_wise_revenue.forEach(d => {
        const dateParts = d.date.split('-');
        if (dateParts.length >= 2) {
          const monthKey = `${dateParts[0]}-${dateParts[1]}`;
          if (!monthData[monthKey]) {
            monthData[monthKey] = { total: 0, count: 0 };
          }
          monthData[monthKey].total += d.total;
          monthData[monthKey].count += 1;
        }
      });
      
      return Object.entries(monthData).map(([month, data]) => ({
        name: formatMonth(month + "-01"), // Convert YYYY-MM to "Month, Year"
        value: data.total,
        count: data.count
      })).sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Default to date
      return stats.date_wise_revenue.map(d => ({
        name: formatDate(d.date), // Convert YYYY-MM-DD to DD-MM-YYYY
        value: d.total,
        count: 1
      }));
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="kpi-builder-button"
          >
            <MoreVertical className="w-4 h-4" />
            Create Custom KPI
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="kpi-builder-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingKPI ? "Edit KPI" : "Create Custom KPI"}
            </DialogTitle>
            <DialogDescription>
              {editingKPI 
                ? "Modify the existing KPI settings and visualizations" 
                : "Build custom visualizations with filters and grouping options"
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kpi-name">KPI Name *</Label>
                <Input
                  id="kpi-name"
                  placeholder="e.g., Top Restaurants This Month"
                  value={kpiConfig.name}
                  onChange={(e) => setKpiConfig({ ...kpiConfig, name: e.target.value })}
                  data-testid="kpi-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-by">Primary Group By</Label>
                <Select
                  value={kpiConfig.groupBy}
                  onValueChange={(value) => setKpiConfig({ ...kpiConfig, groupBy: value })}
                >
                  <SelectTrigger data-testid="kpi-groupby-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand">Brand</SelectItem>
                    <SelectItem value="restaurant">{labels.entity}</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-by-multiple">Additional Groupings (Optional)</Label>
                <div className="text-sm text-gray-600 mb-2">Select multiple grouping options</div>
                <div className="grid grid-cols-2 gap-2">
                  {["brand", "restaurant", "category", "date", "month"].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={kpiConfig.groupByMultiple.includes(option)}
                        onChange={(e) => {
                          const newMultiple = e.target.checked
                            ? [...kpiConfig.groupByMultiple, option]
                            : kpiConfig.groupByMultiple.filter(g => g !== option);
                          setKpiConfig({ ...kpiConfig, groupByMultiple: newMultiple });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="kpi-start-date">Start Date</Label>
                  <Input
                    id="kpi-start-date"
                    type="date"
                    value={kpiConfig.startDate}
                    onChange={(e) => setKpiConfig({ ...kpiConfig, startDate: e.target.value })}
                    data-testid="kpi-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kpi-end-date">End Date</Label>
                  <Input
                    id="kpi-end-date"
                    type="date"
                    value={kpiConfig.endDate}
                    onChange={(e) => setKpiConfig({ ...kpiConfig, endDate: e.target.value })}
                    data-testid="kpi-end-date"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min-amount">Minimum Amount (₹)</Label>
                  <Input
                    id="min-amount"
                    type="number"
                    placeholder="0"
                    value={kpiConfig.minAmount}
                    onChange={(e) => setKpiConfig({ ...kpiConfig, minAmount: e.target.value })}
                    data-testid="kpi-min-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-amount">Maximum Amount (₹)</Label>
                  <Input
                    id="max-amount"
                    type="number"
                    placeholder="Unlimited"
                    value={kpiConfig.maxAmount}
                    onChange={(e) => setKpiConfig({ ...kpiConfig, maxAmount: e.target.value })}
                    data-testid="kpi-max-amount"
                  />
                </div>
              </div>

              {restaurants.length > 0 && (
                <div className="space-y-2">
                  <Label>{`Select ${labels.entities} (Optional)`}</Label>
                  <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-40 overflow-y-auto">
                    {restaurants.map((restaurant) => (
                      <label key={restaurant.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kpiConfig.selectedRestaurants.includes(restaurant.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setKpiConfig({
                                ...kpiConfig,
                                selectedRestaurants: [...kpiConfig.selectedRestaurants, restaurant.id]
                              });
                            } else {
                              setKpiConfig({
                                ...kpiConfig,
                                selectedRestaurants: kpiConfig.selectedRestaurants.filter(id => id !== restaurant.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{restaurant.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {revenueCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Revenue Categories (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-40 overflow-y-auto">
                    {revenueCategories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kpiConfig.selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setKpiConfig({
                                ...kpiConfig,
                                selectedCategories: [...kpiConfig.selectedCategories, category.id]
                              });
                            } else {
                              setKpiConfig({
                                ...kpiConfig,
                                selectedCategories: kpiConfig.selectedCategories.filter(id => id !== category.id)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="visualization" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Chart Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: "bar", icon: BarChart3, label: "Bar Chart" },
                      { type: "line", icon: LineChartIcon, label: "Line Chart" },
                      { type: "pie", icon: PieChartIcon, label: "Pie Chart" },
                      { type: "table", icon: Table2, label: "Table" },
                    ].map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        onClick={() => setKpiConfig({ ...kpiConfig, chartType: type })}
                        className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-all ${
                          kpiConfig.chartType === type
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        data-testid={`chart-type-${type}`}
                      >
                        <Icon className={`w-6 h-6 ${kpiConfig.chartType === type ? "text-blue-600" : "text-gray-600"}`} />
                        <span className={`text-xs ${kpiConfig.chartType === type ? "text-blue-600 font-semibold" : "text-gray-600"}`}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="chart-color">Chart Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="chart-color"
                        value={kpiConfig.color}
                        onChange={(e) => setKpiConfig({ ...kpiConfig, color: e.target.value })}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        data-testid="chart-color-picker"
                      />
                      <Input
                        placeholder="#3B82F6"
                        value={kpiConfig.color}
                        onChange={(e) => setKpiConfig({ ...kpiConfig, color: e.target.value })}
                        className="flex-1"
                        data-testid="chart-color-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text-size">Text Size</Label>
                    <Select
                      value={kpiConfig.textSize}
                      onValueChange={(value) => setKpiConfig({ ...kpiConfig, textSize: value })}
                    >
                      <SelectTrigger data-testid="text-size-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-sm">Small</SelectItem>
                        <SelectItem value="text-base">Medium</SelectItem>
                        <SelectItem value="text-lg">Large</SelectItem>
                        <SelectItem value="text-xl">Extra Large</SelectItem>
                        <SelectItem value="text-2xl">XXL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 text-gray-700">Preview</h4>
                <div style={{ color: kpiConfig.color }} className={kpiConfig.textSize}>
                  {renderChart(getMultiDimensionalData(kpiConfig), kpiConfig.chartType, kpiConfig)}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!kpiConfig.name}
              className="bg-gradient-to-r from-blue-600 to-green-600"
              data-testid="apply-kpi-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              {editingKPI ? "Update KPI" : "Create KPI"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Display Custom KPIs */}
      {customKPIs.length > 0 && (
        <div className="flex flex-col gap-6">
          {customKPIs.map((kpi) => (
            <Card 
              key={kpi.id} 
              className="shadow-xl border-0 bg-white/90 backdrop-blur-xl relative group" 
              data-testid={`custom-kpi-${kpi.id}`}
              data-kpi-id={kpi.id}
              style={{ 
                resize: 'horizontal', 
                overflow: 'auto',
                minWidth: '300px',
                minHeight: '350px',
                width: '50%',
                maxWidth: '100%'
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle 
                    className={`${kpi.textSize || 'text-lg'} truncate pr-2`} 
                    style={{ color: kpi.color || '#374151' }}
                    title={kpi.name}
                  >
                    {kpi.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`kpi-menu-${kpi.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => handleCloneKPI(kpi)}
                        className="gap-2"
                        data-testid={`clone-kpi-${kpi.id}`}
                      >
                        <Copy className="w-4 h-4" />
                        Clone KPI
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditKPI(kpi)}
                        className="gap-2"
                        data-testid={`edit-kpi-${kpi.id}`}
                      >
                        <Edit className="w-4 h-4" />
                        Edit KPI
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadKPICSV(kpi)}
                        className="gap-2"
                        data-testid={`download-csv-kpi-${kpi.id}`}
                      >
                        <Download className="w-4 h-4" />
                        Download CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadKPIImage(kpi)}
                        className="gap-2"
                        data-testid={`download-image-kpi-${kpi.id}`}
                      >
                        <Download className="w-4 h-4" />
                        Download Image
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(kpi.id)}
                        className="gap-2 text-red-600 focus:text-red-600"
                        data-testid={`delete-kpi-${kpi.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete KPI
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto">
                {renderChart(getMultiDimensionalData(kpi), kpi.chartType, kpi)}
              </CardContent>
              <div className="absolute bottom-1 right-1 w-4 h-4 opacity-30 group-hover:opacity-60 cursor-nwse-resize">
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path d="M16 0v16H0L16 0zM14 14V2L2 14h12z" opacity="0.3"/>
                </svg>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Data Detail Popup */}
      <DataDetailPopup
        isOpen={detailPopup.isOpen}
        onClose={() => setDetailPopup({ isOpen: false, data: null, type: "general" })}
        data={detailPopup.data}
        type={detailPopup.type}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, kpiId: null })}>
        <AlertDialogContent data-testid="delete-kpi-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this KPI? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-kpi">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteKPI(deleteDialog.kpiId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-kpi"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KPIBuilder;
