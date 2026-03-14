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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { CurrencyDisplay } from "./CurrencySettings";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";
import { Calculator, AlertCircle } from "lucide-react";

const RevenueForm = ({ restaurants, onSuccess }) => {
  const { labels } = useBusinessConfig();
  const [formData, setFormData] = useState({
    restaurant_id: "",
    amounts: {},
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    if (formData.restaurant_id) {
      fetchCategories(formData.restaurant_id);
    } else {
      setCategories([]);
      setFormData(prev => ({ ...prev, amounts: {} }));
    }
  }, [formData.restaurant_id]);

  const fetchCategories = async (restaurantId) => {
    try {
      setLoadingCategories(true);
      const response = await axiosInstance.get(`/revenue-categories/restaurant/${restaurantId}`);
      setCategories(response.data);
      // Initialize amounts with empty values for each category
      const initialAmounts = {};
      response.data.forEach(category => {
        initialAmounts[category.id] = "";
      });
      setFormData(prev => ({ ...prev, amounts: initialAmounts }));
    } catch (error) {
      toast.error(`Failed to load ${labels.revenue.toLowerCase()} categories`);
      console.error("Error loading categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const getCurrencySymbol = () => {
    const settings = JSON.parse(localStorage.getItem("currencySettings") || '{"icon": "₹", "customText": ""}');
    return settings.icon === "custom" ? settings.customText || "₹" : settings.icon;
  };

  const handleAmountChange = (categoryId, value) => {
    setFormData(prev => ({
      ...prev,
      amounts: {
        ...prev.amounts,
        [categoryId]: value
      }
    }));
  };

  const calculateTotal = () => {
    return Object.values(formData.amounts)
      .filter(amount => amount && !isNaN(parseFloat(amount)))
      .reduce((sum, amount) => sum + parseFloat(amount), 0);
  };

  const validateForm = () => {
    if (!formData.restaurant_id) {
      toast.error(`Please select a ${labels.entity.toLowerCase()}`);
      return false;
    }

    const requiredCategories = categories.filter(cat => cat.is_required);
    const missingRequired = requiredCategories.filter(cat => 
      !formData.amounts[cat.id] || !formData.amounts[cat.id].trim()
    );

    if (missingRequired.length > 0) {
      toast.error(`Please fill in required categories: ${missingRequired.map(cat => cat.name).join(", ")}`);
      return false;
    }

    const hasAnyAmount = Object.values(formData.amounts).some(amount => 
      amount && amount.trim() && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0
    );

    if (!hasAnyAmount) {
      toast.error(`Please enter at least one ${labels.revenue.toLowerCase()} amount`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Clean amounts - convert to numbers and remove empty values
      const cleanAmounts = {};
      Object.entries(formData.amounts).forEach(([categoryId, amount]) => {
        if (amount && amount.trim() && !isNaN(parseFloat(amount))) {
          cleanAmounts[categoryId] = parseFloat(amount);
        }
      });

      await axiosInstance.post("/revenues", {
        ...formData,
        amounts: cleanAmounts,
      });
      
      setFormData({
        restaurant_id: "",
        amounts: categories.reduce((acc, cat) => ({ ...acc, [cat.id]: "" }), {}),
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to add ${labels.revenue.toLowerCase()} entry`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="revenue-form">
      <div className="space-y-2">
        <Label htmlFor="restaurant">{labels.entity} *</Label>
        <Select
          value={formData.restaurant_id}
          onValueChange={(value) =>
            setFormData({ ...formData, restaurant_id: value })
          }
          required
        >
          <SelectTrigger data-testid="restaurant-select">
            <SelectValue placeholder={`Select a ${labels.entity.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {restaurants.map((restaurant) => (
              <SelectItem key={restaurant.id} value={restaurant.id} data-testid={`restaurant-option-${restaurant.id}`}>
                {restaurant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state for categories */}
      {loadingCategories && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{`Loading ${labels.revenue.toLowerCase()} categories...`}</p>
          </div>
        </div>
      )}

      {/* No restaurant selected */}
      {!formData.restaurant_id && !loadingCategories && (
        <div className="text-center p-8 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">{`Select a ${labels.entity}`}</h3>
          <p className="text-blue-700">{`Please select a ${labels.entity.toLowerCase()} to view its ${labels.revenue.toLowerCase()} categories.`}</p>
        </div>
      )}

      {/* No categories for selected restaurant */}
      {formData.restaurant_id && !loadingCategories && categories.length === 0 && (
        <div className="text-center p-8 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-orange-900 mb-2">{`No ${labels.revenue} Categories Found`}</h3>
          <p className="text-orange-700">{`This ${labels.entity.toLowerCase()} has no ${labels.revenue.toLowerCase()} categories assigned. Please ask your administrator to create ${labels.revenue.toLowerCase()} categories for this ${labels.entity.toLowerCase()}.`}</p>
        </div>
      )}

      {/* Revenue Categories */}
      {!loadingCategories && categories.length > 0 && (
        <div className="space-y-4">
          <Label className="text-base font-semibold">{labels.revenue} Categories</Label>
          <div className="grid gap-4 md:grid-cols-2">
              {categories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <Label htmlFor={`amount-${category.id}`} className="flex items-center gap-2">
                    {category.name}
                    {category.is_required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </Label>
                  <Input
                    id={`amount-${category.id}`}
                    data-testid={`amount-input-${category.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Enter ${category.name.toLowerCase()} amount`}
                    value={formData.amounts[category.id] || ""}
                    onChange={(e) => handleAmountChange(category.id, e.target.value)}
                    required={category.is_required}
                  />
                  {category.description && (
                    <p className="text-xs text-gray-500">{category.description}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Total Amount Display */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Total Amount:</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700" data-testid="total-amount-display">
                    <CurrencyDisplay amount={calculateTotal()} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {!loadingCategories && categories.length > 0 && (
        <>
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            data-testid="date-input"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            data-testid="notes-input"
            placeholder="Add any additional notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          disabled={loading}
          data-testid="submit-revenue-button"
        >
          {loading ? "Submitting..." : `Submit ${labels.revenue} Entry`}
        </Button>
      </>
      )}
    </form>
  );
};

export default RevenueForm;