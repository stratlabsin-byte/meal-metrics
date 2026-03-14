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
import { Receipt, Plus, X, Eye, Edit } from "lucide-react";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const DEFAULT_CATEGORIES = [
  "Raw Materials",
  "Packaging",
  "Cleaning Supplies",
  "Staff Wages",
  "Utilities",
  "Repairs",
  "Hygiene Materials",
  "Marketing",
  "Misc"
];

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Other"];

const ExpenseEntry = ({ restaurants, user }) => {
  const { labels } = useBusinessConfig();
  const today = new Date().toISOString().split('T')[0];
  
  const [expenses, setExpenses] = useState([{
    id: Date.now(),
    date: today,
    manager_name: "",
    restaurant_id: "",
    category_id: "",
    description: "",
    vendor_name: "",
    amount: "",
    payment_method: "",
    payment_method_other: "",
  }]);

  const [categories, setCategories] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [manageCategoriesDialog, setManageCategoriesDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [editCategory, setEditCategory] = useState(null);
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNotes, setBalanceNotes] = useState("");

  useEffect(() => {
    fetchCategories();
    initializeDefaultCategories();
  }, []);

  useEffect(() => {
    const restaurantId = expenses[0]?.restaurant_id;
    if (restaurantId) {
      fetchOpeningBalance(restaurantId);
    }
  }, [expenses]);

  const fetchOpeningBalance = async (restaurantId) => {
    try {
      const response = await axiosInstance.get(`/balance-additions/total/${restaurantId}`);
      setOpeningBalance(response.data.opening_balance || 0);
    } catch (error) {
      console.error("Error fetching opening balance:", error);
      setOpeningBalance(0);
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

  const handleAddBalance = async () => {
    if (!expenses[0].restaurant_id) {
      toast.error(`Please select a ${labels.entity.toLowerCase()} first`);
      return;
    }

    if (!balanceAmount || parseFloat(balanceAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await axiosInstance.post("/balance-additions", {
        restaurant_id: expenses[0].restaurant_id,
        amount: parseFloat(balanceAmount),
        notes: balanceNotes
      });

      toast.success(`₹${balanceAmount} added to opening balance!`);
      setBalanceDialog(false);
      setBalanceAmount("");
      setBalanceNotes("");
      
      // Refresh opening balance
      fetchOpeningBalance(expenses[0].restaurant_id);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add balance");
    }
  };

  const initializeDefaultCategories = async () => {
    try {
      const existing = await axiosInstance.get("/expense-categories");
      if (existing.data.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          await axiosInstance.post("/expense-categories", { name: cat, description: "" });
        }
        fetchCategories();
      }
    } catch (error) {
      console.error("Error initializing categories:", error);
    }
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, {
      id: Date.now(),
      date: today,
      manager_name: expenses[0]?.manager_name || "",
      restaurant_id: expenses[0]?.restaurant_id || "",
      category_id: "",
      description: "",
      vendor_name: "",
      amount: "",
      payment_method: "",
      payment_method_other: "",
    }]);
  };

  const removeExpenseRow = (id) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter(exp => exp.id !== id));
    }
  };

  const updateExpense = (id, field, value) => {
    setExpenses(expenses.map(exp =>
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const calculateTotals = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const closingBalance = openingBalance - totalExpenses;

    return {
      totalExpenses,
      openingBalance,
      closingBalance
    };
  };

  const handleSubmit = async () => {
    // Validation
    for (const exp of expenses) {
      if (!exp.restaurant_id || !exp.category_id || !exp.description || !exp.amount || !exp.payment_method) {
        toast.error("Please fill all required fields for each expense");
        return;
      }
      if (parseFloat(exp.amount) <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }
    }

    setLoading(true);
    try {
      // Save all expenses
      for (const exp of expenses) {
        await axiosInstance.post("/expense-entries", {
          date: exp.date,
          manager_name: exp.manager_name,
          restaurant_id: exp.restaurant_id,
          category_id: exp.category_id,
          description: exp.description,
          vendor_name: exp.vendor_name,
          amount: parseFloat(exp.amount),
          payment_method: exp.payment_method,
          payment_method_other: exp.payment_method_other || ""
        });
      }

      toast.success("Expense entries saved successfully!");
      
      // Reset form
      setExpenses([{
        id: Date.now(),
        date: today,
        manager_name: "",
        restaurant_id: "",
        category_id: "",
        description: "",
        vendor_name: "",
        amount: "",
        payment_method: "",
        payment_method_other: "",
      }]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Please enter category name");
      return;
    }

    try {
      await axiosInstance.post("/expense-categories", newCategory);
      toast.success("Category added successfully!");
      setNewCategory({ name: "", description: "" });
      setCategoryDialog(false);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add category");
    }
  };

  const handleUpdateCategory = async (id) => {
    try {
      await axiosInstance.put(`/expense-categories/${id}`, editCategory);
      toast.success("Category updated successfully!");
      setEditCategory(null);
      fetchCategories();
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await axiosInstance.delete(`/expense-categories/${id}`);
      toast.success("Category deleted successfully!");
      fetchCategories();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expense Entry</h2>
          <p className="text-muted-foreground">Record daily expenses and manage petty cash</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setManageCategoriesDialog(true)} variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            Manage Categories
          </Button>
          <Button onClick={() => setCategoryDialog(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Petty Cash Balance Card */}
      <Card className="shadow-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Petty Cash Calculation</CardTitle>
          {(user?.role === 'admin' || user?.role === 'superuser') ? (
            <Button 
              onClick={() => setBalanceDialog(true)} 
              size="sm"
              className="gap-2"
              disabled={!expenses[0].restaurant_id}
            >
              <Plus className="w-4 h-4" />
              Add Balance
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Opening Balance (₹)</Label>
              <Input
                type="number"
                value={openingBalance.toFixed(2)}
                disabled
                className="bg-gray-100 font-semibold"
              />
              <p className="text-xs text-gray-500">Total balance added by admin</p>
            </div>
            <div className="space-y-2">
              <Label>Total Expenses (₹)</Label>
              <Input
                type="number"
                value={totals.totalExpenses.toFixed(2)}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Balance (₹)</Label>
              <Input
                type="number"
                value={totals.closingBalance.toFixed(2)}
                disabled
                className="bg-green-100 font-bold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Entries */}
      {expenses.map((expense, index) => (
        <Card key={expense.id} className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Expense #{index + 1}</CardTitle>
              {expenses.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExpenseRow(expense.id)}
                  className="text-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={expense.date}
                  onChange={(e) => updateExpense(expense.id, 'date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Manager Name *</Label>
                <Input
                  placeholder="Enter manager name"
                  value={expense.manager_name}
                  onChange={(e) => updateExpense(expense.id, 'manager_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Outlet / Stall *</Label>
                <Select
                  value={expense.restaurant_id}
                  onValueChange={(value) => updateExpense(expense.id, 'restaurant_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outlet" />
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expense Category *</Label>
                <Select
                  value={expense.category_id}
                  onValueChange={(value) => updateExpense(expense.id, 'category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  placeholder="Enter vendor name"
                  value={expense.vendor_name}
                  onChange={(e) => updateExpense(expense.id, 'vendor_name', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expense Description *</Label>
              <Textarea
                placeholder="Enter expense description"
                value={expense.description}
                onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expense.amount}
                  onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={expense.payment_method}
                  onValueChange={(value) => updateExpense(expense.id, 'payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
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
            </div>

            {expense.payment_method === "Other" && (
              <div className="space-y-2">
                <Label>Specify Payment Method</Label>
                <Input
                  placeholder="Enter payment method"
                  value={expense.payment_method_other}
                  onChange={(e) => updateExpense(expense.id, 'payment_method_other', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={addExpenseRow} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Expense Row
        </Button>
        <Button onClick={handleSubmit} disabled={loading} className="gap-2 flex-1 md:flex-none">
          <Receipt className="w-4 h-4" />
          {loading ? "Saving..." : "Save Petty Cash Entry"}
        </Button>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                placeholder="e.g., Office Supplies"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={manageCategoriesDialog} onOpenChange={setManageCategoriesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Expense Categories</DialogTitle>
            <DialogDescription>View, edit, and delete expense categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                {editCategory?.id === cat.id ? (
                  <Input
                    value={editCategory.name}
                    onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                    className="flex-1 mr-2"
                  />
                ) : (
                  <span className="flex-1">{cat.name}</span>
                )}
                <div className="flex gap-2">
                  {editCategory?.id === cat.id ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdateCategory(cat.id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditCategory(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditCategory(cat)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeleteCategory(cat.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setManageCategoriesDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Balance Dialog */}
      <Dialog open={balanceDialog} onOpenChange={setBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Balance to Opening Amount</DialogTitle>
            <DialogDescription>
              {`Add funds to the opening balance for ${expenses[0].restaurant_id ? restaurants.find(r => r.id === expenses[0].restaurant_id)?.name : `selected ${labels.entity.toLowerCase()}`}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this balance addition"
                value={balanceNotes}
                onChange={(e) => setBalanceNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Current Opening Balance:</strong> ₹{openingBalance.toFixed(2)}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>New Balance After Addition:</strong> ₹{(openingBalance + (parseFloat(balanceAmount) || 0)).toFixed(2)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBalanceDialog(false);
              setBalanceAmount("");
              setBalanceNotes("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddBalance}>
              Add Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseEntry;
