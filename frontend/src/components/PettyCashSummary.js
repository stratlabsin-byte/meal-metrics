import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Search, Edit, Trash2, Eye, Download, TrendingUp, Receipt, Calendar } from "lucide-react";
import * as XLSX from 'xlsx';
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Other"];

const PettyCashSummary = ({ restaurants }) => {
  const { labels } = useBusinessConfig();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewDialog, setViewDialog] = useState({ isOpen: false, entry: null });
  const [editDialog, setEditDialog] = useState({ isOpen: false, entry: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, entryId: null });
  const [loading, setLoading] = useState(false);

  const [editFormData, setEditFormData] = useState({
    date: "",
    manager_name: "",
    restaurant_id: "",
    category_id: "",
    description: "",
    vendor_name: "",
    amount: "",
    payment_method: "",
    payment_method_other: "",
  });

  useEffect(() => {
    fetchEntries();
    fetchCategories();
    fetchBrands();
  }, []);

  useEffect(() => {
    filterAndSortEntries();
  }, [entries, searchTerm, sortBy, selectedBrand, selectedRestaurant, startDate, endDate]);

  const fetchEntries = async () => {
    try {
      const response = await axiosInstance.get("/expense-entries");
      setEntries(response.data);
    } catch (error) {
      toast.error("Failed to fetch entries");
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/expense-categories");
      setCategories(response.data);
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
    const brand = brands.find(b => b.id === brandId);
    return brand ? brand.name : "Unknown";
  };

  const filterAndSortEntries = () => {
    let filtered = [...entries];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((entry) =>
        entry.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.date?.includes(searchTerm)
      );
    }

    // Brand filter
    if (selectedBrand && selectedBrand !== "all" && restaurants) {
      const brandRestaurantIds = restaurants
        .filter(r => r.brand === selectedBrand)
        .map(r => r.id);
      filtered = filtered.filter(entry => brandRestaurantIds.includes(entry.restaurant_id));
    }

    // Restaurant filter
    if (selectedRestaurant && selectedRestaurant !== "all") {
      filtered = filtered.filter(entry => entry.restaurant_id === selectedRestaurant);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(entry => entry.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(entry => entry.date <= endDate);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.date.localeCompare(a.date);
        case "amount":
          return b.amount - a.amount;
        case "category":
          return (a.category_name || "").localeCompare(b.category_name || "");
        case "outlet":
          return (a.restaurant_name || "").localeCompare(b.restaurant_name || "");
        default:
          return 0;
      }
    });

    setFilteredEntries(filtered);
  };

  const calculateTotals = () => {
    const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
    
    // Group by date
    const byDate = {};
    filteredEntries.forEach(entry => {
      byDate[entry.date] = (byDate[entry.date] || 0) + entry.amount;
    });

    // Group by month
    const byMonth = {};
    filteredEntries.forEach(entry => {
      const month = entry.date.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + entry.amount;
    });

    return { totalAmount, byDate, byMonth };
  };

  const handleView = (entry) => {
    setViewDialog({ isOpen: true, entry });
  };

  const handleEdit = (entry) => {
    setEditFormData({
      date: entry.date,
      manager_name: entry.manager_name,
      restaurant_id: entry.restaurant_id,
      category_id: entry.category_id,
      description: entry.description,
      vendor_name: entry.vendor_name,
      amount: entry.amount.toString(),
      payment_method: entry.payment_method,
      payment_method_other: entry.payment_method_other || "",
    });
    setEditDialog({ isOpen: true, entry });
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await axiosInstance.put(`/expense-entries/${editDialog.entry.id}`, {
        ...editFormData,
        amount: parseFloat(editFormData.amount),
      });
      toast.success("Entry updated successfully!");
      setEditDialog({ isOpen: false, entry: null });
      fetchEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update entry");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/expense-entries/${deleteDialog.entryId}`);
      toast.success("Entry deleted successfully!");
      setDeleteDialog({ isOpen: false, entryId: null });
      fetchEntries();
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const handleDownloadExcel = () => {
    if (filteredEntries.length === 0) {
      toast.error("No data to download");
      return;
    }

    const csvData = filteredEntries.map(entry => ({
      'Date': formatDateDDMonYYYY(entry.date),
      'Manager': entry.manager_name,
      'Outlet': entry.restaurant_name,
      'Category': entry.category_name,
      'Description': entry.description,
      'Vendor': entry.vendor_name,
      'Amount (₹)': entry.amount,
      'Payment Method': entry.payment_method === "Other" ? entry.payment_method_other : entry.payment_method
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Petty Cash");
    XLSX.writeFile(workbook, `Petty_Cash_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Downloaded successfully!");
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Petty Cash Summary</h2>
        <p className="text-muted-foreground">View and manage all expense entries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹ {totals.totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Outlets</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredEntries.map(e => e.restaurant_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters & Search</CardTitle>
            <Button onClick={handleDownloadExcel} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Filter by Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((brand) => (
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
                  {restaurants && restaurants.map((restaurant) => (
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
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by category, outlet, vendor, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest First)</SelectItem>
                  <SelectItem value="amount">Amount (High to Low)</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="outlet">Outlet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outlet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No expense entries found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, index) => (
                    <tr key={entry.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDateDDMonYYYY(entry.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{entry.manager_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{entry.restaurant_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {entry.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{entry.vendor_name || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                        ₹ {entry.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleView(entry)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => setDeleteDialog({ isOpen: true, entryId: entry.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog.isOpen} onOpenChange={(open) => !open && setViewDialog({ isOpen: false, entry: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {viewDialog.entry && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label className="text-gray-600">Date</Label>
                <p className="font-semibold">{formatDateDDMonYYYY(viewDialog.entry.date)}</p>
              </div>
              <div>
                <Label className="text-gray-600">Manager</Label>
                <p className="font-semibold">{viewDialog.entry.manager_name}</p>
              </div>
              <div>
                <Label className="text-gray-600">Outlet</Label>
                <p className="font-semibold">{viewDialog.entry.restaurant_name}</p>
              </div>
              <div>
                <Label className="text-gray-600">Category</Label>
                <p className="font-semibold">{viewDialog.entry.category_name}</p>
              </div>
              <div>
                <Label className="text-gray-600">Vendor</Label>
                <p className="font-semibold">{viewDialog.entry.vendor_name || "N/A"}</p>
              </div>
              <div>
                <Label className="text-gray-600">Amount</Label>
                <p className="font-semibold text-lg text-green-600">₹ {viewDialog.entry.amount.toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-gray-600">Description</Label>
                <p className="font-semibold">{viewDialog.entry.description}</p>
              </div>
              <div>
                <Label className="text-gray-600">Payment Method</Label>
                <p className="font-semibold">
                  {viewDialog.entry.payment_method === "Other" 
                    ? viewDialog.entry.payment_method_other 
                    : viewDialog.entry.payment_method}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialog({ isOpen: false, entry: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, entry: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Manager Name *</Label>
                <Input
                  value={editFormData.manager_name}
                  onChange={(e) => setEditFormData({ ...editFormData, manager_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outlet *</Label>
                <Select
                  value={editFormData.restaurant_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, restaurant_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants && restaurants.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={editFormData.category_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={editFormData.vendor_name}
                  onChange={(e) => setEditFormData({ ...editFormData, vendor_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={editFormData.payment_method}
                onValueChange={(value) => setEditFormData({ ...editFormData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editFormData.payment_method === "Other" && (
              <div className="space-y-2">
                <Label>Specify Payment Method</Label>
                <Input
                  value={editFormData.payment_method_other}
                  onChange={(e) => setEditFormData({ ...editFormData, payment_method_other: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ isOpen: false, entry: null })}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, entryId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PettyCashSummary;
