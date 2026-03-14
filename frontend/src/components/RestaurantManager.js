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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const RestaurantManager = ({ restaurants, onUpdate }) => {
  const { labels, config } = useBusinessConfig();
  const customFields = (config.custom_fields || []).sort((a, b) => (a.order || 0) - (b.order || 0));

  const [open, setOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    brand: "",
    custom_fields: {}
  });
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axiosInstance.get("/brands");
      setBrands(response.data);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        gst_number: formData.custom_fields?.gst_number || "",
        address: formData.custom_fields?.address || "",
        phone: formData.custom_fields?.phone || "",
        msme_number: formData.custom_fields?.msme_number || "",
      };
      if (editingRestaurant) {
        await axiosInstance.put(`/restaurants/${editingRestaurant.id}`, payload);
        toast.success(`${labels.entity} updated successfully!`);
      } else {
        await axiosInstance.post("/restaurants", payload);
        toast.success(`${labels.entity} added successfully!`);
      }
      setOpen(false);
      setFormData({
        name: "",
        description: "",
        brand: "",
        custom_fields: {}
      });
      setEditingRestaurant(null);
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      description: restaurant.description,
      brand: restaurant.brand || "",
      custom_fields: restaurant.custom_fields || {
        gst_number: restaurant.gst_number || "",
        phone: restaurant.phone || "",
        address: restaurant.address || "",
        msme_number: restaurant.msme_number || ""
      }
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/restaurants/${id}`);
      toast.success(`${labels.entity} deleted successfully!`);
      setDeleteDialogOpen(false);
      setRestaurantToDelete(null);
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to delete ${labels.entity.toLowerCase()}`);
    }
  };

  const openDeleteDialog = (restaurant) => {
    setRestaurantToDelete(restaurant);
    setDeleteDialogOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      name: "",
      description: "",
      brand: "",
      custom_fields: {}
    });
    setEditingRestaurant(null);
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      handleClose();
    } else {
      setOpen(newOpen);
    }
  };

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter((restaurant) => {
    const query = searchQuery.toLowerCase();
    return (
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.brand?.toLowerCase().includes(query) ||
      restaurant.description?.toLowerCase().includes(query) ||
      restaurant.phone?.toLowerCase().includes(query) ||
      restaurant.address?.toLowerCase().includes(query) ||
      restaurant.gst_number?.toLowerCase().includes(query) ||
      restaurant.msme_number?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6" data-testid="restaurant-manager">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700" data-testid="add-restaurant-button">
              <Plus className="w-4 h-4" />
              {`Add ${labels.entity}`}
            </Button>
          </DialogTrigger>
        <DialogContent data-testid="restaurant-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingRestaurant ? `Edit ${labels.entity}` : `Add New ${labels.entity}`}
            </DialogTitle>
            <DialogDescription>
              {editingRestaurant
                ? `Update the ${labels.entity.toLowerCase()} details below.`
                : `Enter the details for the new ${labels.entity.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{`${labels.entity} Name`} *</Label>
              <Input
                id="name"
                data-testid="restaurant-name-input"
                placeholder={`Enter ${labels.entity.toLowerCase()} name`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">{`${labels.brand}/Group`} *</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value })}
                required
              >
                <SelectTrigger data-testid="restaurant-brand-select">
                  <SelectValue placeholder={`Select a ${labels.brand.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {`Group multiple ${labels.entities.toLowerCase()} under same ${labels.brand.toLowerCase()} for aggregate reporting`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="restaurant-description-input"
                placeholder={`Enter ${labels.entity.toLowerCase()} description`}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            
            {/* Dynamic Custom Fields */}
            {customFields.map((field) => (
              <div key={field.field_key} className="space-y-2">
                <Label htmlFor={field.field_key}>
                  {field.label}{field.required ? " *" : ""}
                </Label>
                {field.field_type === "textarea" ? (
                  <textarea
                    id={field.field_key}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={field.placeholder}
                    value={(formData.custom_fields || {})[field.field_key] || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      custom_fields: { ...(formData.custom_fields || {}), [field.field_key]: e.target.value }
                    })}
                    rows={2}
                    required={field.required}
                  />
                ) : (
                  <Input
                    id={field.field_key}
                    type={field.field_type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={(formData.custom_fields || {})[field.field_key] || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      custom_fields: { ...(formData.custom_fields || {}), [field.field_key]: e.target.value }
                    })}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="cancel-restaurant-button">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} data-testid="save-restaurant-button">
                {loading ? "Saving..." : editingRestaurant ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={`Search ${labels.entities.toLowerCase()} by name, ${labels.brand.toLowerCase()}, phone, address...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="restaurant-search-input"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRestaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            className="p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:shadow-md transition-all"
            data-testid={`restaurant-card-${restaurant.id}`}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid={`restaurant-name-${restaurant.id}`}>
              {restaurant.name}
            </h3>
            {restaurant.brand && (
              <p className="text-xs font-medium text-blue-600 mb-2">
                {labels.brand}: {brands.find(b => b.id === restaurant.brand)?.name || restaurant.brand}
              </p>
            )}
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {restaurant.description || "No description"}
            </p>
            
            {/* Dynamic Custom Fields Display */}
            <div className="space-y-1.5 mb-4 text-xs text-gray-600">
              {customFields.map((field) => {
                const value = restaurant.custom_fields?.[field.field_key] || restaurant[field.field_key];
                if (!value) return null;
                return (
                  <p key={field.field_key} className="flex items-start gap-1">
                    <span className="font-medium">{field.label}:</span>
                    <span className="line-clamp-2">{value}</span>
                  </p>
                );
              })}
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleEdit(restaurant)}
                data-testid={`edit-restaurant-${restaurant.id}`}
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                onClick={() => openDeleteDialog(restaurant)}
                data-testid={`delete-restaurant-${restaurant.id}`}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {restaurants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {`No ${labels.entities.toLowerCase()} yet. Click "Add ${labels.entity}" to get started.`}
        </div>
      )}
      
      {restaurants.length > 0 && filteredRestaurants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {`No ${labels.entities.toLowerCase()} found matching "${searchQuery}". Try a different search term.`}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <span className="font-semibold">{restaurantToDelete?.name}</span> and
              remove all associated {labels.revenue.toLowerCase()} data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(restaurantToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-button"
            >
              {`Delete ${labels.entity}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantManager;