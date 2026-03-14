import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from 'xlsx';
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
import { Search, Edit, Trash2, FileText, DollarSign, TrendingUp, Download, Filter } from "lucide-react";
import { CurrencyDisplay } from "./CurrencySettings";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ROYALTY_TYPES = [
  "Sales Royalty",
  "Delivery Royalty",
  "Franchise Royalty",
  "Streaming Royalty",
  "Marketing Royalty",
  "Technology Royalty"
];

const RoyaltySummary = ({ restaurants }) => {
  const { labels } = useBusinessConfig();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [payees, setPayees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editDialog, setEditDialog] = useState({ isOpen: false, entry: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, entryId: null });
  const [loading, setLoading] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    month: 1,
    year: new Date().getFullYear(),
    payee_id: "",
    royalty_type: "",
    amount: "",
    notes: "",
  });

  useEffect(() => {
    fetchEntries();
    fetchPayees();
    fetchBrands();
  }, []);

  useEffect(() => {
    filterAndSortEntries();
  }, [entries, searchTerm, sortBy, selectedBrand, selectedRestaurant, startDate, endDate]);

  const fetchEntries = async () => {
    try {
      const response = await axiosInstance.get("/royalty-entries");
      setEntries(response.data);
    } catch (error) {
      toast.error("Failed to fetch royalty entries");
      console.error(error);
    }
  };

  const fetchPayees = async () => {
    try {
      const response = await axiosInstance.get("/royalty-payees");
      setPayees(response.data);
    } catch (error) {
      console.error("Error fetching payees:", error);
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

  const filterAndSortEntries = () => {
    let filtered = [...entries];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((entry) =>
        entry.payee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.royalty_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        MONTHS[entry.month - 1].toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.year.toString().includes(searchTerm)
      );
    }

    // Filter by brand
    if (selectedBrand && selectedBrand !== "all" && restaurants) {
      const brandRestaurantIds = restaurants
        .filter(r => r.brand === selectedBrand)
        .map(r => r.id);
      filtered = filtered.filter(entry => 
        entry.restaurant_id && brandRestaurantIds.includes(entry.restaurant_id)
      );
    }

    // Filter by restaurant
    if (selectedRestaurant && selectedRestaurant !== "all") {
      filtered = filtered.filter(entry => entry.restaurant_id === selectedRestaurant);
    }

    // Filter by date range
    if (startDate) {
      const [startYear, startMonth] = startDate.split('-').map(Number);
      filtered = filtered.filter(entry => {
        if (entry.year > startYear) return true;
        if (entry.year === startYear && entry.month >= startMonth) return true;
        return false;
      });
    }

    if (endDate) {
      const [endYear, endMonth] = endDate.split('-').map(Number);
      filtered = filtered.filter(entry => {
        if (entry.year < endYear) return true;
        if (entry.year === endYear && entry.month <= endMonth) return true;
        return false;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        case "amount":
          return b.amount - a.amount;
        case "payee":
          return a.payee_name.localeCompare(b.payee_name);
        default:
          return 0;
      }
    });

    setFilteredEntries(filtered);
  };

  const handleDownloadCSV = () => {
    if (filteredEntries.length === 0) {
      toast.error("No data to download");
      return;
    }

    const csvData = filteredEntries.map(entry => ({
      'Month': MONTHS[entry.month - 1],
      'Year': entry.year,
      'Payee': entry.payee_name,
      'Type': entry.royalty_type,
      'Amount (INR)': entry.amount,
      'Notes': entry.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Royalty Summary");
    XLSX.writeFile(workbook, `Royalty_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Downloaded successfully!");
  };

  const handleEdit = (entry) => {
    setEditFormData({
      month: entry.month,
      year: entry.year,
      payee_id: entry.payee_id,
      royalty_type: entry.royalty_type,
      amount: entry.amount.toString(),
      notes: entry.notes,
    });
    setEditDialog({ isOpen: true, entry });
  };

  const handleUpdate = async () => {
    if (!editFormData.payee_id || !editFormData.royalty_type || !editFormData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...editFormData,
        month: parseInt(editFormData.month),
        year: parseInt(editFormData.year),
        amount: parseFloat(editFormData.amount),
      };

      await axiosInstance.put(`/royalty-entries/${editDialog.entry.id}`, payload);
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
      await axiosInstance.delete(`/royalty-entries/${deleteDialog.entryId}`);
      toast.success("Entry deleted successfully!");
      setDeleteDialog({ isOpen: false, entryId: null });
      fetchEntries();
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const calculateYearlyTotal = () => {
    const yearlyTotals = {};
    filteredEntries.forEach((entry) => {
      yearlyTotals[entry.year] = (yearlyTotals[entry.year] || 0) + entry.amount;
    });
    return yearlyTotals;
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  const generateMonths = () => {
    return [
      { value: 1, label: "January" },
      { value: 2, label: "February" },
      { value: 3, label: "March" },
      { value: 4, label: "April" },
      { value: 5, label: "May" },
      { value: 6, label: "June" },
      { value: 7, label: "July" },
      { value: 8, label: "August" },
      { value: 9, label: "September" },
      { value: 10, label: "October" },
      { value: 11, label: "November" },
      { value: 12, label: "December" },
    ];
  };

  const yearlyTotals = calculateYearlyTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Royalty Summary</h2>
        <p className="text-muted-foreground">View and manage all royalty payment entries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={filteredEntries.reduce((sum, e) => sum + e.amount, 0)} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Payees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredEntries.map(e => e.payee_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </div>
            <Button onClick={handleDownloadCSV} variant="outline" className="gap-2">
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
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by payee, type, month, or year..."
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
                  <SelectItem value="payee">Payee (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Totals */}
      {Object.keys(yearlyTotals).length > 0 && (
        <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-lg">Yearly Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(yearlyTotals).map(([year, total]) => (
                <div key={year} className="bg-white rounded-lg p-4 shadow">
                  <div className="text-sm text-gray-600">{year}</div>
                  <div className="text-xl font-bold text-green-600">
                    <CurrencyDisplay amount={total} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No royalty entries found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {MONTHS[entry.month - 1]} {entry.year}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{entry.payee_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {entry.royalty_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          <CurrencyDisplay amount={entry.amount} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {entry.notes || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ isOpen: true, entryId: entry.id })}
                            className="text-red-600 hover:text-red-700"
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, entry: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Royalty Entry</DialogTitle>
            <DialogDescription>
              Update the royalty payment details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month *</Label>
                <Select
                  value={editFormData.month.toString()}
                  onValueChange={(value) => setEditFormData({ ...editFormData, month: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonths().map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select
                  value={editFormData.year.toString()}
                  onValueChange={(value) => setEditFormData({ ...editFormData, year: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateYears().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payee *</Label>
              <Select
                value={editFormData.payee_id}
                onValueChange={(value) => setEditFormData({ ...editFormData, payee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {payees.map((payee) => (
                    <SelectItem key={payee.id} value={payee.id}>
                      {payee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Royalty Type *</Label>
              <Select
                value={editFormData.royalty_type}
                onValueChange={(value) => setEditFormData({ ...editFormData, royalty_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROYALTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                rows={3}
              />
            </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, entryId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Royalty Entry</AlertDialogTitle>
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

export default RoyaltySummary;
