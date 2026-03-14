import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Edit, Trash2, MoreVertical, TrendingUp, Download, FileSpreadsheet, FileText } from "lucide-react";
import { CurrencyDisplay } from "./CurrencySettings";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const RevenueList = ({ revenues, restaurants, onUpdate }) => {
  const { labels, config } = useBusinessConfig();
  const [filterRestaurant, setFilterRestaurant] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [searchDate, setSearchDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editDialog, setEditDialog] = useState({ isOpen: false, revenue: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, revenueId: null });
  const [editFormData, setEditFormData] = useState({
    restaurant_id: "",
    amounts: {},
    date: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [revenueCategories, setRevenueCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const getUniqueBrands = () => {
    const brands = restaurants
      .map(r => r.brand)
      .filter(brand => brand && brand.trim() !== '');
    return [...new Set(brands)];
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/revenue-categories");
      setRevenueCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = revenueCategories.find(cat => cat.id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  const getDateRange = (filterType) => {
    const today = new Date();
    let start = "";
    let end = "";

    switch (filterType) {
      case "this_month":
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case "this_quarter":
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        end = new Date(today.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
        break;
      case "this_year":
        // Financial year: April to March
        const currentMonth = today.getMonth();
        const fiscalYearStart = currentMonth >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        start = `${fiscalYearStart}-04-01`;
        end = `${fiscalYearStart + 1}-03-31`;
        break;
      default:
        break;
    }
    return { start, end };
  };

  const filteredRevenues = revenues.filter((revenue) => {
    const matchesRestaurant =
      filterRestaurant === "all" || revenue.restaurant_id === filterRestaurant;
    
    // Brand filtering
    const restaurant = restaurants.find(r => r.id === revenue.restaurant_id);
    const matchesBrand = filterBrand === "all" || restaurant?.brand === filterBrand;
    
    // Date filtering based on type
    let matchesDate = true;
    
    if (dateFilterType === "all") {
      matchesDate = true;
    } else if (dateFilterType === "exact") {
      matchesDate = !searchDate || revenue.date === searchDate;
    } else if (dateFilterType === "custom") {
      if (startDate && endDate) {
        matchesDate = revenue.date >= startDate && revenue.date <= endDate;
      } else if (startDate) {
        matchesDate = revenue.date >= startDate;
      } else if (endDate) {
        matchesDate = revenue.date <= endDate;
      }
    } else {
      // this_month, this_quarter, this_year
      const { start, end } = getDateRange(dateFilterType);
      if (start && end) {
        matchesDate = revenue.date >= start && revenue.date <= end;
      }
    }
    
    return matchesRestaurant && matchesBrand && matchesDate;
  });

  const totalAmount = filteredRevenues.reduce((sum, r) => sum + (r.total_amount || r.amount || 0), 0);

  const handleEditRevenue = (revenue) => {
    setEditFormData({
      restaurant_id: revenue.restaurant_id,
      amounts: revenue.amounts || {},
      date: revenue.date,
      notes: revenue.notes || "",
    });
    setEditDialog({ isOpen: true, revenue });
  };

  const handleUpdateRevenue = async () => {
    setLoading(true);
    try {
      await axiosInstance.put(`/revenues/${editDialog.revenue.id}`, {
        restaurant_id: editFormData.restaurant_id,
        amounts: editFormData.amounts,
        date: editFormData.date,
        notes: editFormData.notes,
      });
      toast.success(`${labels.revenue} entry updated successfully!`);
      setEditDialog({ isOpen: false, revenue: null });
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to update ${labels.revenue.toLowerCase()} entry`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRevenue = async (revenueId) => {
    try {
      await axiosInstance.delete(`/revenues/${revenueId}`);
      toast.success(`${labels.revenue} entry deleted successfully!`);
      setDeleteDialog({ isOpen: false, revenueId: null });
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to delete ${labels.revenue.toLowerCase()} entry`);
    }
  };

  const exportToCSV = () => {
    if (filteredRevenues.length === 0) {
      toast.error("No data to export");
      return;
    }

    let csvContent = `${labels.entity},Date,Total Amount,Notes,Category Breakdown\n`;
    
    filteredRevenues.forEach(revenue => {
      const categoryBreakdown = revenue.amounts 
        ? Object.entries(revenue.amounts)
            .map(([catId, amount]) => `${getCategoryName(catId)}: ${amount}`)
            .join("; ")
        : "";
      
      csvContent += `"${revenue.restaurant_name}","${revenue.date}",${revenue.total_amount || 0},"${revenue.notes || ""}","${categoryBreakdown}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Exported to CSV successfully!");
  };

  const exportToExcel = () => {
    if (filteredRevenues.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create Excel-compatible HTML table
    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>${labels.entity}</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Notes</th>
                <th>Category Breakdown</th>
              </tr>
            </thead>
            <tbody>
    `;

    filteredRevenues.forEach(revenue => {
      const categoryBreakdown = revenue.amounts 
        ? Object.entries(revenue.amounts)
            .map(([catId, amount]) => `${getCategoryName(catId)}: ${amount}`)
            .join("; ")
        : "";
      
      htmlContent += `
        <tr>
          <td>${revenue.restaurant_name}</td>
          <td>${revenue.date}</td>
          <td>${revenue.total_amount || 0}</td>
          <td>${revenue.notes || ""}</td>
          <td>${categoryBreakdown}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue_history_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    toast.success("Exported to Excel successfully!");
  };

  const exportToPDF = () => {
    try {
      console.log("Starting PDF export...");
      if (filteredRevenues.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Check if a single restaurant is selected
      if (filterRestaurant === "all") {
        toast.error(`Please select a specific ${labels.entity.toLowerCase()} to generate PDF statement`);
        return;
      }

      const selectedRestaurant = restaurants.find(r => r.id === filterRestaurant);
      if (!selectedRestaurant) {
        toast.error(`${labels.entity} not found`);
        return;
      }

      console.log("Creating jsPDF instance...");
      const doc = new jsPDF();
      console.log("jsPDF created successfully");
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header - Restaurant Details
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text("Account Statement", pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(selectedRestaurant.name, 14, 35);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      let yPos = 42;
      
      if (selectedRestaurant.brand) {
        doc.text(`${labels.brand}: ${selectedRestaurant.brand}`, 14, yPos);
        yPos += 5;
      }

      const customFields = (config.custom_fields || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      customFields.forEach(field => {
        const value = selectedRestaurant[field.field_key];
        if (value) {
          doc.text(`${field.label}: ${value}`, 14, yPos);
          yPos += 5;
        }
      });
      
      yPos += 5;
      doc.setFontSize(9);
      doc.text(`Statement Date: ${formatDateDDMonYYYY(new Date())}`, 14, yPos);
      
      yPos += 10;

      // Get all unique categories from filtered revenues
      const allCategoryIds = new Set();
      filteredRevenues.forEach(revenue => {
        if (revenue.amounts) {
          Object.keys(revenue.amounts).forEach(catId => allCategoryIds.add(catId));
        }
      });
      
      const categoryColumns = Array.from(allCategoryIds).map(catId => getCategoryName(catId));
      
      // Prepare table headers
      const headers = [['Date', 'Notes', ...categoryColumns, 'Total Amount']];
      
      // Prepare table data
      const tableData = filteredRevenues.map(revenue => {
        const row = [
          formatDateDDMonYYYY(revenue.date),
          revenue.notes || '-'
        ];
        
        // Add category amounts in the same order as headers
        Array.from(allCategoryIds).forEach(catId => {
          const amount = revenue.amounts && revenue.amounts[catId] ? parseFloat(revenue.amounts[catId]) : 0;
          row.push(amount.toFixed(2));
        });
        
        row.push(parseFloat(revenue.total_amount || 0).toFixed(2));
        return row;
      });
      
      // Add totals row
      const totalsRow = ['', 'Total'];
      Array.from(allCategoryIds).forEach(catId => {
        const categoryTotal = filteredRevenues.reduce((sum, revenue) => {
          const amount = revenue.amounts && revenue.amounts[catId] ? parseFloat(revenue.amounts[catId]) : 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        totalsRow.push(categoryTotal.toFixed(2));
      });
      totalsRow.push(parseFloat(totalAmount || 0).toFixed(2));
      tableData.push(totalsRow);
      
      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'left', cellWidth: 'auto' }
        },
        footStyles: {
          fillColor: [240, 240, 240],
          fontStyle: 'bold'
        },
        didParseCell: function(data) {
          // Make the last row (totals) bold
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
          
          // Right align amount columns
          if (data.column.index >= 2) {
            data.cell.styles.halign = 'right';
          }
        }
      });
      
      // Footer
      const finalY = doc.lastAutoTable?.finalY || yPos + 50;
      doc.setFontSize(8);
      doc.setTextColor(128);
      const now = new Date();
      doc.text(
        `Generated on ${formatDateDDMonYYYY(now)}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    
      // Save PDF
      const fileName = `${selectedRestaurant.name.replace(/\s+/g, '_')}_Statement_${formatDateDDMonYYYY(new Date()).replace(/-/g, '_')}.pdf`;
      doc.save(fileName);
      toast.success("PDF statement generated successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };

  const openDeleteDialog = (revenueId) => {
    setDeleteDialog({ isOpen: true, revenueId });
  };

  return (
    <div className="space-y-6" data-testid="revenue-list">
      {/* Filters */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Filter by {labels.brand}</Label>
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger data-testid="filter-brand-select">
                <SelectValue />
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

          <div className="space-y-2">
            <Label>Filter by {labels.entity}</Label>
            <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
              <SelectTrigger data-testid="filter-restaurant-select">
                <SelectValue />
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
            <Label>Date Filter</Label>
            <Select value={dateFilterType} onValueChange={setDateFilterType}>
              <SelectTrigger data-testid="date-filter-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="exact">Exact Date</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="this_year">This Year (Financial)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Conditional date inputs */}
        {dateFilterType === "exact" && (
          <div className="space-y-2">
            <Label htmlFor="exact-date-filter">Select Date</Label>
            <Input
              id="exact-date-filter"
              data-testid="filter-exact-date-input"
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>
        )}

        {dateFilterType === "custom" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date-filter">Start Date</Label>
              <Input
                id="start-date-filter"
                data-testid="filter-start-date-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date-filter">End Date</Label>
              <Input
                id="end-date-filter"
                data-testid="filter-end-date-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="gap-2"
            data-testid="export-csv-button"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="gap-2"
            data-testid="export-excel-button"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
          {filterRestaurant !== "all" && (
            <Button
              onClick={exportToPDF}
              variant="default"
              className="gap-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
              data-testid="export-pdf-button"
            >
              <FileText className="w-4 h-4" />
              Download PDF Statement
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total {labels.revenue} (Filtered)</p>
            <p className="text-3xl font-bold text-gray-900" data-testid="filtered-total-revenue">
              <CurrencyDisplay amount={totalAmount} />
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Revenue List */}
      <div className="space-y-3">
        {filteredRevenues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {labels.revenue.toLowerCase()} entries found.
          </div>
        ) : (
          filteredRevenues.map((revenue) => (
            <div
              key={revenue.id}
              className="p-4 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:shadow-md transition-all"
              data-testid={`revenue-entry-${revenue.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1" data-testid={`revenue-restaurant-${revenue.id}`}>
                    {revenue.restaurant_name}
                  </h4>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span data-testid={`revenue-date-${revenue.id}`}>{formatDateDDMonYYYY(revenue.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>By:</span>
                      <span className="font-medium">{revenue.submitted_by_username}</span>
                    </div>
                  </div>
                  {revenue.notes && (
                    <p className="text-sm text-gray-600 mt-2">{revenue.notes}</p>
                  )}
                  {revenue.amounts && Object.keys(revenue.amounts).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 mb-2">{labels.revenue} Breakdown:</p>
                      <div className="space-y-1 text-xs">
                        {Object.entries(revenue.amounts).map(([categoryId, amount]) => (
                          <div key={categoryId} className="flex justify-between">
                            <span className="text-gray-600">{getCategoryName(categoryId)}:</span>
                            <span className="font-medium">
                              <CurrencyDisplay amount={amount} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600" data-testid={`revenue-amount-${revenue.id}`}>
                      <CurrencyDisplay amount={revenue.total_amount || revenue.amount || 0} />
                    </p>
                    {revenue.total_amount && (
                      <p className="text-xs text-gray-500">Total</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`revenue-menu-${revenue.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditRevenue(revenue)}
                        className="gap-2"
                        data-testid={`edit-revenue-${revenue.id}`}
                      >
                        <Edit className="w-4 h-4" />
                        Edit Entry
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(revenue.id)}
                        className="gap-2 text-red-600 focus:text-red-600"
                        data-testid={`delete-revenue-${revenue.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Entry
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Revenue Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => setEditDialog({ isOpen: open, revenue: null })}>
        <DialogContent className="max-w-md" data-testid="edit-revenue-dialog">
          <DialogHeader>
            <DialogTitle>Edit {labels.revenue} Entry</DialogTitle>
            <DialogDescription>
              Update the {labels.revenue.toLowerCase()} entry details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-restaurant">{labels.entity} *</Label>
              <Select
                value={editFormData.restaurant_id}
                onValueChange={(value) => setEditFormData({ ...editFormData, restaurant_id: value })}
              >
                <SelectTrigger data-testid="edit-restaurant-select">
                  <SelectValue placeholder={`Select a ${labels.entity.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold">{labels.revenue} by Category</Label>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {Object.entries(editFormData.amounts).map(([categoryId, amount]) => (
                  <div key={categoryId} className="space-y-1">
                    <Label htmlFor={`edit-amount-${categoryId}`}>
                      {getCategoryName(categoryId)}
                    </Label>
                    <Input
                      id={`edit-amount-${categoryId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        amounts: {
                          ...editFormData.amounts,
                          [categoryId]: e.target.value
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                data-testid="edit-date-input"
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                data-testid="edit-notes-input"
                placeholder="Add any additional notes..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setEditDialog({ isOpen: false, revenue: null })}
              data-testid="cancel-edit-revenue"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRevenue}
              disabled={loading || !editFormData.restaurant_id}
              data-testid="save-edit-revenue"
            >
              {loading ? "Updating..." : "Update Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, revenueId: null })}>
        <AlertDialogContent data-testid="delete-revenue-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {labels.revenue} Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {labels.revenue.toLowerCase()} entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-revenue">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteRevenue(deleteDialog.revenueId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-revenue"
            >
              Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RevenueList;