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

const RestaurantManager = ({ restaurants, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    brand: "",
    gst_number: "",
    address: "",
    phone: "",
    msme_number: ""
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
      if (editingRestaurant) {
        await axiosInstance.put(`/restaurants/${editingRestaurant.id}`, formData);
        toast.success("Restaurant updated successfully!");
      } else {
        await axiosInstance.post("/restaurants", formData);
        toast.success("Restaurant added successfully!");
      }
      setOpen(false);
      setFormData({ 
        name: "", 
        description: "", 
        brand: "",
        gst_number: "",
        address: "",
        phone: "",
        msme_number: ""
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
      gst_number: restaurant.gst_number || "",
      address: restaurant.address || "",
      phone: restaurant.phone || "",
      msme_number: restaurant.msme_number || ""
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/restaurants/${id}`);
      toast.success("Restaurant deleted successfully!");
      setDeleteDialogOpen(false);
      setRestaurantToDelete(null);
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete restaurant");
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
      gst_number: "",
      address: "",
      phone: "",
      msme_number: ""
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
              Add Restaurant
            </Button>
          </DialogTrigger>
        <DialogContent data-testid="restaurant-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingRestaurant ? "Edit Restaurant" : "Add New Restaurant"}
            </DialogTitle>
            <DialogDescription>
              {editingRestaurant
                ? "Update the restaurant details below."
                : "Enter the details for the new restaurant."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                data-testid="restaurant-name-input"
                placeholder="Enter restaurant name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand/Group *</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value })}
                required
              >
                <SelectTrigger data-testid="restaurant-brand-select">
                  <SelectValue placeholder="Select a brand" />
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
                Group multiple centers under same brand for aggregate reporting
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                data-testid="restaurant-description-input"
                placeholder="Enter restaurant description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            
            {/* Additional Restaurant Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  data-testid="restaurant-gst-input"
                  placeholder="e.g., 22AAAAA0000A1Z5"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  data-testid="restaurant-phone-input"
                  placeholder="e.g., +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                data-testid="restaurant-address-input"
                placeholder="Enter full restaurant address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="msme_number">MSME Number</Label>
              <Input
                id="msme_number"
                data-testid="restaurant-msme-input"
                placeholder="Enter MSME registration number"
                value={formData.msme_number}
                onChange={(e) => setFormData({ ...formData, msme_number: e.target.value })}
              />
            </div>
            
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
              placeholder="Search restaurants by name, brand, phone, address..."
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
                Brand: {brands.find(b => b.id === restaurant.brand)?.name || restaurant.brand}
              </p>
            )}
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {restaurant.description || "No description"}
            </p>
            
            {/* Additional Details */}
            <div className="space-y-1.5 mb-4 text-xs text-gray-600">
              {restaurant.phone && (
                <p className="flex items-center gap-1">
                  <span className="font-medium">Phone:</span> {restaurant.phone}
                </p>
              )}
              {restaurant.address && (
                <p className="flex items-start gap-1">
                  <span className="font-medium">Address:</span> 
                  <span className="line-clamp-2">{restaurant.address}</span>
                </p>
              )}
              {restaurant.gst_number && (
                <p className="flex items-center gap-1">
                  <span className="font-medium">GST:</span> {restaurant.gst_number}
                </p>
              )}
              {restaurant.msme_number && (
                <p className="flex items-center gap-1">
                  <span className="font-medium">MSME:</span> {restaurant.msme_number}
                </p>
              )}
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
          No restaurants yet. Click &quot;Add Restaurant&quot; to get started.
        </div>
      )}
      
      {restaurants.length > 0 && filteredRestaurants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No restaurants found matching &quot;{searchQuery}&quot;. Try a different search term.
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
              remove all associated revenue data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(restaurantToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-button"
            >
              Delete Restaurant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantManager;