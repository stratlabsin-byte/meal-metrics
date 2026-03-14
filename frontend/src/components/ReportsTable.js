import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { CurrencyDisplay } from "./CurrencySettings";
import { FileSpreadsheet, Download, Filter } from "lucide-react";
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const ReportsTable = ({ restaurants }) => {
  const { labels } = useBusinessConfig();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState("restaurant");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [revenueCategories, setRevenueCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

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

  const getUniqueBrands = () => {
    const brandIds = restaurants
      .map(r => r.brand)
      .filter(brand => brand && brand.trim() !== '');
    const uniqueBrandIds = [...new Set(brandIds)];
    return uniqueBrandIds.map(id => ({
      id,
      name: getBrandName(id)
    }));
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/revenue-categories");
      setRevenueCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (selectedRestaurant && selectedRestaurant !== "all") params.append("restaurant_id", selectedRestaurant);

      const response = await axiosInstance.get(`/revenues?${params.toString()}`);
      let revenues = response.data;

      // Filter by brand if selected
      if (selectedBrand && selectedBrand !== "all") {
        revenues = revenues.filter(rev => {
          const restaurant = restaurants.find(r => r.id === rev.restaurant_id);
          return restaurant?.brand === selectedBrand;
        });
      }

      // Process data based on grouping
      let processedData = [];

      if (groupBy === "brand") {
        processedData = groupByBrand(revenues);
      } else if (groupBy === "restaurant") {
        processedData = groupByRestaurant(revenues);
      } else if (groupBy === "category") {
        processedData = groupByCategory(revenues);
      } else if (groupBy === "date") {
        processedData = groupByDate(revenues);
      } else if (groupBy === "all") {
        processedData = groupByAll(revenues);
      }

      setReportData(processedData);
      toast.success("Report generated successfully!");
    } catch (error) {
      toast.error("Failed to generate report");
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupByBrand = (revenues) => {
    const grouped = {};
    revenues.forEach((rev) => {
      const restaurant = restaurants.find(r => r.id === rev.restaurant_id);
      const brandName = getBrandName(restaurant?.brand);
      
      if (!grouped[brandName]) {
        grouped[brandName] = {
          brand_name: brandName,
          total_revenue: 0,
          entries: 0,
          categories: {},
        };
      }
      grouped[brandName].total_revenue += rev.total_amount || 0;
      grouped[brandName].entries += 1;
      
      // Aggregate category amounts
      Object.entries(rev.amounts || {}).forEach(([catId, amount]) => {
        if (!grouped[brandName].categories[catId]) {
          grouped[brandName].categories[catId] = 0;
        }
        grouped[brandName].categories[catId] += parseFloat(amount);
      });
    });
    return Object.values(grouped);
  };

  const groupByRestaurant = (revenues) => {
    const grouped = {};
    revenues.forEach((rev) => {
      if (!grouped[rev.restaurant_id]) {
        grouped[rev.restaurant_id] = {
          restaurant_name: rev.restaurant_name,
          total_revenue: 0,
          entries: 0,
          categories: {},
        };
      }
      grouped[rev.restaurant_id].total_revenue += rev.total_amount || 0;
      grouped[rev.restaurant_id].entries += 1;
      
      // Aggregate category amounts
      Object.entries(rev.amounts || {}).forEach(([catId, amount]) => {
        if (!grouped[rev.restaurant_id].categories[catId]) {
          grouped[rev.restaurant_id].categories[catId] = 0;
        }
        grouped[rev.restaurant_id].categories[catId] += parseFloat(amount);
      });
    });
    return Object.values(grouped);
  };

  const groupByCategory = (revenues) => {
    const grouped = {};
    const categoryCounts = {};
    
    revenues.forEach((rev) => {
      if (!rev.amounts) return;
      
      Object.entries(rev.amounts).forEach(([catId, amount]) => {
        const category = revenueCategories.find(c => c.id === catId);
        const catName = category ? category.name : catId;
        
        if (!grouped[catId]) {
          grouped[catId] = {
            category_name: catName,
            total_revenue: 0,
            entries: 0,
          };
          categoryCounts[catId] = new Set();
        }
        grouped[catId].total_revenue += parseFloat(amount || 0);
        categoryCounts[catId].add(rev.id);
      });
    });
    
    // Update entries count based on unique revenue entries
    Object.keys(grouped).forEach(catId => {
      grouped[catId].entries = categoryCounts[catId] ? categoryCounts[catId].size : 0;
    });
    
    return Object.values(grouped);
  };

  const groupByDate = (revenues) => {
    const grouped = {};
    revenues.forEach((rev) => {
      if (!grouped[rev.date]) {
        grouped[rev.date] = {
          date: rev.date,
          total_revenue: 0,
          entries: 0,
          categories: {},
        };
      }
      grouped[rev.date].total_revenue += rev.total_amount || 0;
      grouped[rev.date].entries += 1;
      
      Object.entries(rev.amounts || {}).forEach(([catId, amount]) => {
        if (!grouped[rev.date].categories[catId]) {
          grouped[rev.date].categories[catId] = 0;
        }
        grouped[rev.date].categories[catId] += parseFloat(amount);
      });
    });
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const groupByAll = (revenues) => {
    const grouped = {};
    revenues.forEach((rev) => {
      if (!rev || !rev.restaurant_id || !rev.date) return;
      
      const key = `${rev.restaurant_id}_${rev.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          restaurant_name: rev.restaurant_name || "Unknown",
          date: rev.date,
          total_revenue: 0,
          entries: 0,
          categories: {},
        };
      }
      grouped[key].total_revenue += rev.total_amount || 0;
      grouped[key].entries += 1;
      
      if (rev.amounts && typeof rev.amounts === 'object') {
        Object.entries(rev.amounts).forEach(([catId, amount]) => {
          const category = revenueCategories.find(c => c.id === catId);
          const catName = category ? category.name : "Unknown Category";
          if (!grouped[key].categories[catId]) {
            grouped[key].categories[catId] = { name: catName, amount: 0 };
          }
          grouped[key].categories[catId].amount += parseFloat(amount || 0);
        });
      }
    });
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const downloadCSV = () => {
    if (reportData.length === 0) {
      toast.error("No data to download");
      return;
    }

    let csvContent = "";
    
    // Generate CSV based on grouping type
    if (groupBy === "brand") {
      csvContent = `${labels.brand},Total ${labels.revenue},Entries,Category Breakdown\n`;
      reportData.forEach(row => {
        const categoryBreakdown = Object.entries(row.categories || {})
          .map(([catId, amount]) => {
            const category = revenueCategories.find(c => c.id === catId);
            const catName = category ? category.name : "Unknown";
            return `${catName}: ${amount}`;
          })
          .join("; ");
        csvContent += `"${row.brand_name}",${row.total_revenue},${row.entries},"${categoryBreakdown}"\n`;
      });
    } else if (groupBy === "restaurant") {
      csvContent = `${labels.entity},Total ${labels.revenue},Entries,Category Breakdown\n`;
      reportData.forEach(row => {
        const categoryBreakdown = Object.entries(row.categories || {})
          .map(([catId, amount]) => {
            const category = revenueCategories.find(c => c.id === catId);
            const catName = category ? category.name : "Unknown";
            return `${catName}: ${amount}`;
          })
          .join("; ");
        csvContent += `"${row.restaurant_name}",${row.total_revenue},${row.entries},"${categoryBreakdown}"\n`;
      });
    } else if (groupBy === "category") {
      csvContent = `Category,Total ${labels.revenue},Entries\n`;
      reportData.forEach(row => {
        csvContent += `"${row.category_name}",${row.total_revenue},${row.entries}\n`;
      });
    } else if (groupBy === "date") {
      csvContent = `Date,Total ${labels.revenue},Entries\n`;
      reportData.forEach(row => {
        csvContent += `"${row.date}",${row.total_revenue},${row.entries}\n`;
      });
    } else if (groupBy === "all") {
      csvContent = `${labels.entity},Date,Total ${labels.revenue},Entries,Categories\n`;
      reportData.forEach(row => {
        const categories = Object.values(row.categories).map(c => `${c.name}: ${c.amount}`).join("; ");
        csvContent += `"${row.restaurant_name}","${row.date}",${row.total_revenue},${row.entries},"${categories}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${groupBy}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Report downloaded successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Filters
          </CardTitle>
          <CardDescription>Configure your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">{labels.brand}</SelectItem>
                  <SelectItem value="restaurant">{labels.entity}</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="all">All ({labels.entity} + Date + Category)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {getUniqueBrands().map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{`Filter by ${labels.entity}`}</Label>
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                <SelectTrigger>
                  <SelectValue placeholder={`All ${labels.entities}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{`All ${labels.entities}`}</SelectItem>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end gap-2">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              >
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      {reportData.length > 0 && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Report Results
                </CardTitle>
                <CardDescription>
                  {reportData.length} {reportData.length === 1 ? 'entry' : 'entries'} found
                </CardDescription>
              </div>
              <Button onClick={downloadCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    {groupBy === "brand" && (
                      <>
                        <th className="text-left p-3 font-semibold">{labels.brand}</th>
                        <th className="text-right p-3 font-semibold">{`Total ${labels.revenue}`}</th>
                        <th className="text-right p-3 font-semibold">Entries</th>
                        <th className="text-left p-3 font-semibold">Category Breakdown</th>
                      </>
                    )}
                    {groupBy === "restaurant" && (
                      <>
                        <th className="text-left p-3 font-semibold">{labels.entity}</th>
                        <th className="text-right p-3 font-semibold">{`Total ${labels.revenue}`}</th>
                        <th className="text-right p-3 font-semibold">Entries</th>
                        <th className="text-left p-3 font-semibold">Category Breakdown</th>
                      </>
                    )}
                    {groupBy === "category" && (
                      <>
                        <th className="text-left p-3 font-semibold">Category</th>
                        <th className="text-right p-3 font-semibold">{`Total ${labels.revenue}`}</th>
                        <th className="text-right p-3 font-semibold">Entries</th>
                      </>
                    )}
                    {groupBy === "date" && (
                      <>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-right p-3 font-semibold">{`Total ${labels.revenue}`}</th>
                        <th className="text-right p-3 font-semibold">Entries</th>
                      </>
                    )}
                    {groupBy === "all" && (
                      <>
                        <th className="text-left p-3 font-semibold">{labels.entity}</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-right p-3 font-semibold">{`Total ${labels.revenue}`}</th>
                        <th className="text-right p-3 font-semibold">Entries</th>
                        <th className="text-left p-3 font-semibold">Categories</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      {groupBy === "brand" && (
                        <>
                          <td className="p-3">{row.brand_name}</td>
                          <td className="p-3 text-right font-semibold">
                            <CurrencyDisplay amount={row.total_revenue} />
                          </td>
                          <td className="p-3 text-right">{row.entries}</td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {Object.entries(row.categories || {}).map(([catId, amount], idx) => {
                                const category = revenueCategories.find(c => c.id === catId);
                                const catName = category ? category.name : "Unknown";
                                return (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium">{catName}:</span>{" "}
                                    <CurrencyDisplay amount={amount} />
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </>
                      )}
                      {groupBy === "restaurant" && (
                        <>
                          <td className="p-3">{row.restaurant_name}</td>
                          <td className="p-3 text-right font-semibold">
                            <CurrencyDisplay amount={row.total_revenue} />
                          </td>
                          <td className="p-3 text-right">{row.entries}</td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {Object.entries(row.categories || {}).map(([catId, amount], idx) => {
                                const category = revenueCategories.find(c => c.id === catId);
                                const catName = category ? category.name : "Unknown";
                                return (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium">{catName}:</span>{" "}
                                    <CurrencyDisplay amount={amount} />
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </>
                      )}
                      {groupBy === "category" && (
                        <>
                          <td className="p-3">{row.category_name}</td>
                          <td className="p-3 text-right font-semibold">
                            <CurrencyDisplay amount={row.total_revenue} />
                          </td>
                          <td className="p-3 text-right">{row.entries}</td>
                        </>
                      )}
                      {groupBy === "date" && (
                        <>
                          <td className="p-3">{formatDateDDMonYYYY(row.date)}</td>
                          <td className="p-3 text-right font-semibold">
                            <CurrencyDisplay amount={row.total_revenue} />
                          </td>
                          <td className="p-3 text-right">{row.entries}</td>
                        </>
                      )}
                      {groupBy === "all" && (
                        <>
                          <td className="p-3">{row.restaurant_name}</td>
                          <td className="p-3">{formatDateDDMonYYYY(row.date)}</td>
                          <td className="p-3 text-right font-semibold">
                            <CurrencyDisplay amount={row.total_revenue} />
                          </td>
                          <td className="p-3 text-right">{row.entries}</td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {Object.values(row.categories).map((cat, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{cat.name}:</span>{" "}
                                  <CurrencyDisplay amount={cat.amount} />
                                </div>
                              ))}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && reportData.length === 0 && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center text-gray-500">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Report Generated</h3>
              <p className="text-sm">Configure filters and click "Generate Report" to see results</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsTable;
