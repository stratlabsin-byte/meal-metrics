import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Target, Plus, Edit, Trash2, TrendingUp } from "lucide-react";
import { CurrencyDisplay } from "./CurrencySettings";

const PERIOD_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly (Fiscal Year)" }
];

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const QUARTERS = ["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"];
const HALVES = ["H1 (Apr-Sep)", "H2 (Oct-Mar)"];

const RestaurantTargetManager = ({ restaurants }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  // Fiscal year starts in April
  const currentFiscalYear = currentMonth >= 3 ? currentYear : currentYear - 1;

  const [targets, setTargets] = useState([]);
  const [targetsWithRevenue, setTargetsWithRevenue] = useState([]);
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ isOpen: false, target: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, targetId: null });
  const [loading, setLoading] = useState(false);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  
  const [formData, setFormData] = useState({
    restaurant_id: "",
    fiscal_year: currentFiscalYear,
    period_type: "yearly",
    period_value: null,
    target_amount: "",
  });

  const fetchTargets = async () => {
    try {
      const response = await axiosInstance.get("/restaurant-targets");
      setTargets(response.data);
    } catch (error) {
      toast.error("Failed to fetch targets");
      console.error(error);
    }
  };

  const fetchRevenueData = useCallback(async () => {
    setLoadingRevenue(true);
    try {
      const targetsWithRevenueData = await Promise.all(
        targets.map(async (target) => {
          try {
            const params = new URLSearchParams({
              fiscal_year: target.fiscal_year.toString(),
              period_type: target.period_type,
            });
            
            if (target.period_value !== null && target.period_value !== undefined) {
              params.append("period_value", target.period_value.toString());
            }

            const response = await axiosInstance.get(
              `/restaurant-targets/calculate/${target.restaurant_id}?${params.toString()}`
            );
            
            return {
              ...target,
              actual_amount: response.data.actual_amount || 0,
              achievement_percentage: response.data.achievement_percentage || 0,
            };
          } catch (error) {
            console.error(`Failed to fetch revenue for target ${target.id}:`, error);
            return {
              ...target,
              actual_amount: 0,
              achievement_percentage: 0,
            };
          }
        })
      );
      
      setTargetsWithRevenue(targetsWithRevenueData);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    } finally {
      setLoadingRevenue(false);
    }
  }, [targets]);

  useEffect(() => {
    fetchTargets();
  }, []);

  useEffect(() => {
    if (targets.length > 0) {
      fetchRevenueData();
    }
  }, [targets, fetchRevenueData]);

  const getPeriodLabel = (target) => {
    if (target.period_type === "monthly") {
      return `${MONTHS[target.period_value - 1]} FY${target.fiscal_year}-${(target.fiscal_year + 1) % 100}`;
    } else if (target.period_type === "quarterly") {
      return `${QUARTERS[target.period_value - 1]} FY${target.fiscal_year}-${(target.fiscal_year + 1) % 100}`;
    } else if (target.period_type === "half_yearly") {
      return `${HALVES[target.period_value - 1]} FY${target.fiscal_year}-${(target.fiscal_year + 1) % 100}`;
    } else {
      return `FY ${target.fiscal_year}-${(target.fiscal_year + 1) % 100}`;
    }
  };

  const handleAdd = async () => {
    if (!formData.restaurant_id || !formData.target_amount) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        period_value: formData.period_type === "yearly" ? null : formData.period_value ? parseInt(formData.period_value) : null
      };

      await axiosInstance.post("/restaurant-targets", payload);
      toast.success("Target created successfully!");
      setAddDialog(false);
      resetForm();
      fetchTargets();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create target");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editDialog.target) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        target_amount: parseFloat(formData.target_amount),
        period_value: formData.period_type === "yearly" ? null : formData.period_value ? parseInt(formData.period_value) : null
      };

      await axiosInstance.put(`/restaurant-targets/${editDialog.target.id}`, payload);
      toast.success("Target updated successfully!");
      setEditDialog({ isOpen: false, target: null });
      resetForm();
      fetchTargets();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update target");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/restaurant-targets/${deleteDialog.targetId}`);
      toast.success("Target deleted successfully!");
      setDeleteDialog({ isOpen: false, targetId: null });
      fetchTargets();
    } catch (error) {
      toast.error("Failed to delete target");
    }
  };

  const handleEdit = (target) => {
    setFormData({
      restaurant_id: target.restaurant_id,
      fiscal_year: target.fiscal_year,
      period_type: target.period_type,
      period_value: target.period_value,
      target_amount: target.target_amount.toString(),
    });
    setEditDialog({ isOpen: true, target });
  };

  const resetForm = () => {
    setFormData({
      restaurant_id: "",
      fiscal_year: currentFiscalYear,
      period_type: "yearly",
      period_value: null,
      target_amount: "",
    });
  };

  const generateFiscalYears = () => {
    const years = [];
    for (let i = currentFiscalYear - 2; i <= currentFiscalYear + 3; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Restaurant Targets</h2>
          <p className="text-muted-foreground">Set and manage revenue targets for restaurants (Fiscal Year: April-March)</p>
        </div>
        <Button onClick={() => setAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Set New Target
        </Button>
      </div>

      {/* Targets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(targetsWithRevenue.length > 0 ? targetsWithRevenue : targets).map((target) => {
          const achievementPercentage = target.achievement_percentage || 0;
          const actualAmount = target.actual_amount || 0;
          const isOnTrack = achievementPercentage >= 90;
          const isWarning = achievementPercentage >= 50 && achievementPercentage < 90;
          const isBehind = achievementPercentage < 50;
          
          return (
            <Card key={target.id} className="shadow-lg border-0 bg-white/90 backdrop-blur-xl hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isOnTrack ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                      isWarning ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                      'bg-gradient-to-br from-red-500 to-pink-500'
                    }`}>
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{target.restaurant_name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {getPeriodLabel(target)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Target and Actual Revenue */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Target</span>
                      <span className="text-lg font-bold text-blue-600">
                        <CurrencyDisplay amount={target.target_amount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Actual</span>
                      <span className="text-lg font-bold text-green-600">
                        <CurrencyDisplay amount={actualAmount} />
                      </span>
                    </div>
                  </div>

                  {/* Achievement Progress */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Achievement</span>
                      <span className={`text-lg font-bold ${
                        isOnTrack ? 'text-green-600' :
                        isWarning ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {loadingRevenue ? "..." : `${achievementPercentage.toFixed(1)}%`}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(achievementPercentage, 100)} 
                      className="h-2"
                      indicatorClassName={
                        isOnTrack ? 'bg-green-500' :
                        isWarning ? 'bg-yellow-500' :
                        'bg-red-500'
                      }
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(target)}
                      className="flex-1 gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialog({ isOpen: true, targetId: target.id })}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {targets.length === 0 && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Target className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Targets Set</h3>
            <p className="text-sm text-gray-500 mb-4">
              Start by setting revenue targets for your restaurants
            </p>
            <Button onClick={() => setAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Set New Target
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Target Dialog */}
      <Dialog open={addDialog || editDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setAddDialog(false);
          setEditDialog({ isOpen: false, target: null });
          resetForm();
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editDialog.isOpen ? "Edit Target" : "Set New Target"}</DialogTitle>
            <DialogDescription>
              Set revenue target for a restaurant (Fiscal Year: April to March)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Restaurant *</Label>
              <Select
                value={formData.restaurant_id}
                onValueChange={(value) => setFormData({ ...formData, restaurant_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select restaurant" />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fiscal Year *</Label>
                <Select
                  value={formData.fiscal_year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, fiscal_year: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateFiscalYears().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        FY {year}-{(year + 1) % 100}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Period Type *</Label>
                <Select
                  value={formData.period_type}
                  onValueChange={(value) => setFormData({ ...formData, period_type: value, period_value: null })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.period_type === "monthly" && (
              <div className="space-y-2">
                <Label>Select Month *</Label>
                <Select
                  value={formData.period_value?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, period_value: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.period_type === "quarterly" && (
              <div className="space-y-2">
                <Label>Select Quarter *</Label>
                <Select
                  value={formData.period_value?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, period_value: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map((quarter, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {quarter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.period_type === "half_yearly" && (
              <div className="space-y-2">
                <Label>Select Half *</Label>
                <Select
                  value={formData.period_value?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, period_value: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select half" />
                  </SelectTrigger>
                  <SelectContent>
                    {HALVES.map((half, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {half}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Target Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter target amount"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddDialog(false);
              setEditDialog({ isOpen: false, target: null });
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={editDialog.isOpen ? handleUpdate : handleAdd} disabled={loading}>
              {loading ? "Saving..." : (editDialog.isOpen ? "Update Target" : "Set Target")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, targetId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this target? This action cannot be undone.
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

export default RestaurantTargetManager;
