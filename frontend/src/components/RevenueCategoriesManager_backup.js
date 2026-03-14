import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MoreVertical, Settings, Tag, Search } from "lucide-react";
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import CategoryMasterManager from "./CategoryMasterManager";

const RevenueCategoriesManager = ({ categories, restaurants, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    is_required: true,
    restaurant_id: ""
  });
  const [bulkFormData, setBulkFormData] = useState({
    restaurant_id: "",
    selected_categories: [],
    is_required: true
  });
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, categoryId: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryMasterList, setCategoryMasterList] = useState([]);
  const [showCategoryMaster, setShowCategoryMaster] = useState(false);

  useEffect(() => {
    fetchCategoryMaster();
  }, []);

  const fetchCategoryMaster = async () => {
    try {
      const response = await axiosInstance.get("/category-master");
      setCategoryMasterList(response.data);
    } catch (error) {
      console.error("Failed to fetch category master list:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if bulk add mode
    if (!editingCategory && bulkFormData.selected_categories.length > 0) {
      return handleBulkSubmit();
    }
    
    // Validate restaurant selection
    if (!formData.restaurant_id) {
      toast.error("Please select a restaurant");
      return;
    }
    
    setLoading(true);
    try {
      if (editingCategory) {
        await axiosInstance.put(`/revenue-categories/${editingCategory.id}`, formData);
        toast.success("Revenue category updated successfully!");
      } else {
        await axiosInstance.post("/revenue-categories", formData);
        toast.success("Revenue category added successfully!");
      }
      setOpen(false);
      setFormData({ name: "", description: "", is_required: true, restaurant_id: "" });
      setBulkFormData({ restaurant_id: "", selected_categories: [], is_required: true });
      setEditingCategory(null);
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkFormData.restaurant_id) {
      toast.error("Please select a restaurant");
      return;
    }

    if (bulkFormData.selected_categories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }

    setLoading(true);
    try {
      // Create multiple categories in parallel
      const promises = bulkFormData.selected_categories.map(categoryName => {
        const category = categoryMasterList.find(c => c.name === categoryName);
        return axiosInstance.post("/revenue-categories", {
          name: categoryName,
          description: category?.description || "",
          is_required: bulkFormData.is_required,
          restaurant_id: bulkFormData.restaurant_id
        });
      });

      await Promise.all(promises);
      
      toast.success(`${bulkFormData.selected_categories.length} categories added successfully!`);
      setOpen(false);
      setFormData({ name: "", description: "", is_required: true, restaurant_id: "" });
      setBulkFormData({ restaurant_id: "", selected_categories: [], is_required: true });
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add categories");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ 
      name: category.name, 
      description: category.description,
      is_required: category.is_required,
      restaurant_id: category.restaurant_id
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/revenue-categories/${id}`);
      toast.success("Revenue category deleted successfully!");
      setDeleteDialog({ isOpen: false, categoryId: null });
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete revenue category");
    }
  };

  const openDeleteDialog = (categoryId) => {
    setDeleteDialog({ isOpen: true, categoryId });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "", is_required: true, restaurant_id: "" });
    setBulkFormData({ restaurant_id: "", selected_categories: [], is_required: true });
  };

  const toggleCategorySelection = (categoryName) => {
    setBulkFormData(prev => {
      const isSelected = prev.selected_categories.includes(categoryName);
      return {
        ...prev,
        selected_categories: isSelected
          ? prev.selected_categories.filter(c => c !== categoryName)
          : [...prev.selected_categories, categoryName]
      };
    });
  };

  // Memoize selected count to prevent re-render loops
  const selectedCount = useMemo(() => {
    return bulkFormData.selected_categories.length;
  }, [bulkFormData.selected_categories.length]);

  // Filter categories based on search query
  const filteredCategories = categories.filter((category) => {
    const query = searchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query) ||
      category.restaurant_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6" data-testid="revenue-categories-manager">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Revenue Categories</h2>
            <p className="text-sm text-gray-600">Manage categories for revenue entry forms</p>
          </div>
        </div>

        <Button 
          onClick={() => setOpen(true)} 
          className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
          data-testid="add-category-button"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent data-testid="category-dialog">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Revenue Category" : "Add New Revenue Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update the revenue category details below."
                  : "Create a new category for revenue entries."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Restaurant Selection */}
              <div className="space-y-2">
                <Label htmlFor="restaurant">Restaurant *</Label>
                {editingCategory ? (
                  <Select
                    value={formData.restaurant_id}
                    onValueChange={(value) => setFormData({ ...formData, restaurant_id: value })}
                  >
                    <SelectTrigger data-testid="category-restaurant-select">
                      <SelectValue placeholder="Select a restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants?.map((restaurant) => (
                        <SelectItem key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={bulkFormData.restaurant_id}
                    onValueChange={(value) => setBulkFormData({ ...bulkFormData, restaurant_id: value })}
                  >
                    <SelectTrigger data-testid="category-restaurant-select">
                      <SelectValue placeholder="Select a restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants?.map((restaurant) => (
                        <SelectItem key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Category Selection - Different for Edit vs Bulk Add */}
              {editingCategory ? (
                // Edit Mode: Single category
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name *</Label>
                  <Input
                    id="category-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Category name"
                    required
                  />
                </div>
              ) : (
                // Bulk Add Mode: Multiple categories
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Categories *</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowCategoryMaster(true)}
                      className="text-xs h-auto p-0"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Manage Categories
                    </Button>
                  </div>
                  <div className="border rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                    {categoryMasterList.length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-500">
                        No categories available. Click &quot;Manage Categories&quot; to add.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categoryMasterList.map((category) => (
                          <div
                            key={category.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              bulkFormData.selected_categories.includes(category.name)
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                            onClick={() => toggleCategorySelection(category.name)}
                          >
                            <Checkbox
                              checked={bulkFormData.selected_categories.includes(category.name)}
                              readOnly
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{category.name}</p>
                              {category.description && (
                                <p className="text-xs text-gray-500 truncate">{category.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCount > 0 && (
                    <p className="text-sm text-indigo-600 font-medium">
                      {selectedCount} category(ies) selected
                    </p>
                  )}
                </div>
              )}

              {/* Description - Only for Edit Mode */}
              {editingCategory && (
                <div className="space-y-2">
                  <Label htmlFor="category-description">Description</Label>
                  <Textarea
                    id="category-description"
                    data-testid="category-description-input"
                    placeholder="Optional description for this category"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              )}

              {/* Required Field Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="is-required">Required Field</Label>
                  <p className="text-sm text-gray-600">Make {editingCategory ? 'this category' : 'these categories'} mandatory for revenue entries</p>
                </div>
                {editingCategory ? (
                  <Switch
                    id="is-required"
                    data-testid="category-required-switch"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                  />
                ) : (
                  <Switch
                    id="is-required"
                    data-testid="category-required-switch"
                    checked={bulkFormData.is_required}
                    onCheckedChange={(checked) => setBulkFormData({ ...bulkFormData, is_required: checked })}
                  />
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleClose} data-testid="cancel-category-button">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} data-testid="save-category-button">
                  {loading ? "Saving..." : editingCategory ? "Update" : `Add ${selectedCount} Categories`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search categories by name, description, or restaurant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="category-search-input"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:shadow-md transition-all"
            data-testid={`category-card-${category.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900" data-testid={`category-name-${category.id}`}>
                    {category.name}
                  </h3>
                  {category.is_required && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-600 font-medium mb-1">
                  {category.restaurant_name}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {category.description || "No description"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid={`category-menu-${category.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(category)} className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Category
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => openDeleteDialog(category.id)} 
                    className="gap-2 text-red-600 focus:text-red-600"
                    data-testid={`delete-category-${category.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="text-xs text-gray-500">
              Created: {formatDateDDMonYYYY(category.created_at)}
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white/50 rounded-lg border-2 border-dashed border-gray-300">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Revenue Categories</h3>
          <p className="text-sm text-gray-500">Create your first revenue category to get started</p>
        </div>
      )}
      
      {categories.length > 0 && filteredCategories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No categories found matching &quot;{searchQuery}&quot;. Try a different search term.
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, categoryId: null })}>
        <AlertDialogContent data-testid="delete-category-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Revenue Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this revenue category? This action cannot be undone and may affect existing revenue entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-category">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialog.categoryId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-category"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Master Manager Dialog */}
      <Dialog open={showCategoryMaster} onOpenChange={setShowCategoryMaster}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Category Master List</DialogTitle>
            <DialogDescription>
              Add, edit, or delete category templates for revenue tracking
            </DialogDescription>
          </DialogHeader>
          <CategoryMasterManager />
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => {
              setShowCategoryMaster(false);
              fetchCategoryMaster();
            }}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RevenueCategoriesManager;