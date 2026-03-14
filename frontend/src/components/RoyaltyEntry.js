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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { DollarSign, Plus, Calendar } from "lucide-react";
import { CurrencyDisplay } from "./CurrencySettings";

const MONTHS = [
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

const ROYALTY_TYPES = [
  "Sales Royalty",
  "Delivery Royalty",
  "Franchise Royalty",
  "Streaming Royalty",
  "Marketing Royalty",
  "Technology Royalty"
];

const RoyaltyEntry = ({ restaurants }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [formData, setFormData] = useState({
    month: currentMonth,
    year: currentYear,
    payee_id: "",
    royalty_type: "",
    amount: "",
    restaurant_id: "",
    notes: "",
  });
  
  const [payees, setPayees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addPayeeDialog, setAddPayeeDialog] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState("");

  useEffect(() => {
    fetchPayees();
  }, []);

  const fetchPayees = async () => {
    try {
      const response = await axiosInstance.get("/royalty-payees");
      setPayees(response.data);
    } catch (error) {
      console.error("Error fetching payees:", error);
    }
  };

  const handleAddPayee = async () => {
    if (!newPayeeName.trim()) {
      toast.error("Please enter payee name");
      return;
    }

    try {
      await axiosInstance.post("/royalty-payees", { name: newPayeeName });
      toast.success("Payee added successfully!");
      setNewPayeeName("");
      setAddPayeeDialog(false);
      fetchPayees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add payee");
    }
  };

  const validateForm = () => {
    if (!formData.month) {
      toast.error("Please select a month");
      return false;
    }
    if (!formData.year) {
      toast.error("Please select a year");
      return false;
    }
    if (!formData.payee_id) {
      toast.error("Please select a payee");
      return false;
    }
    if (!formData.royalty_type) {
      toast.error("Please select a royalty type");
      return false;
    }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        amount: parseFloat(formData.amount),
      };

      await axiosInstance.post("/royalty-entries", payload);
      toast.success("Royalty Added Successfully!");
      
      // Reset form
      setFormData({
        month: currentMonth,
        year: currentYear,
        payee_id: "",
        royalty_type: "",
        amount: "",
        restaurant_id: "",
        notes: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save royalty entry");
    } finally {
      setLoading(false);
    }
  };

  const generateYears = () => {
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Royalty Entry</h2>
          <p className="text-muted-foreground">Add new royalty payment entries</p>
        </div>
        <Button onClick={() => setAddPayeeDialog(true)} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add New Payee
        </Button>
      </div>

      {/* Entry Form */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            New Royalty Entry
          </CardTitle>
          <CardDescription>
            Enter royalty payment details for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Month and Year Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month *</Label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
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
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
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

            {/* Payee */}
            <div className="space-y-2">
              <Label>Royalty Payee *</Label>
              <Select
                value={formData.payee_id}
                onValueChange={(value) => setFormData({ ...formData, payee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payee" />
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

            {/* Royalty Type */}
            <div className="space-y-2">
              <Label>Royalty Type *</Label>
              <Select
                value={formData.royalty_type}
                onValueChange={(value) => setFormData({ ...formData, royalty_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select royalty type" />
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

            {/* Restaurant (Optional) */}
            <div className="space-y-2">
              <Label>Restaurant (Optional)</Label>
              <Select
                value={formData.restaurant_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, restaurant_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None - Not linked to any restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants && restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Leave unselected if not related to a specific restaurant
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Royalty Amount (INR) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes or remarks..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {loading ? "Saving..." : "Save Royalty"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Add Payee Dialog */}
      <Dialog open={addPayeeDialog} onOpenChange={setAddPayeeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Payee</DialogTitle>
            <DialogDescription>
              Enter the name of the new royalty payee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payee Name *</Label>
              <Input
                placeholder="e.g., Zomato, Swiggy, Magic Pin"
                value={newPayeeName}
                onChange={(e) => setNewPayeeName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPayeeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayee}>
              Add Payee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoyaltyEntry;
