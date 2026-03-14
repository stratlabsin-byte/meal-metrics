import { useState, useEffect, useCallback } from "react";
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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bulkRestaurantId, setBulkRestaurantId] = useState("");
  const [bulkIsRequired, setBulkIsRequired] = useState(true);
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

  const toggleCategory = useCallback((categoryName) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  }, []);

  const openAddDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", is_required: true, restaurant_id: "" });
    setSelectedCategories([]);
    setBulkRestaurantId("");
    setBulkIsRequired(true);
    setOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      is_required: category.is_required,
      restaurant_id: category.restaurant_id
    });
    setSelectedCategories([]);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDelete = async (categoryId) => {
    setDeleteDialog({ isOpen: true, categoryId });
  };

  const confirmDelete = async () => {
    try {
      await axiosInstance.delete(`/revenue-categories/${deleteDialog.categoryId}`);
      toast.success("Revenue category deleted successfully!");
      setDeleteDialog({ isOpen: false, categoryId: null });
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete category");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingCategory) {
      // Edit mode - single category
      if (!formData.restaurant_id) {
        toast.error("Please select a restaurant");
        return;
      }

      setLoading(true);
      try {
        await axiosInstance.put(`/revenue-categories/${editingCategory.id}`, formData);
        toast.success("Revenue category updated successfully!");
        setOpen(false);
        onUpdate();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to update category");
      } finally {
        setLoading(false);
      }
    } else {
      // Bulk add mode
      if (!bulkRestaurantId) {
        toast.error("Please select a restaurant");
        return;
      }

      if (selectedCategories.length === 0) {
        toast.error("Please select at least one category");
        return;
      }

      setLoading(true);
      try {
        const promises = selectedCategories.map(categoryName => {
          const category = categoryMasterList.find(c => c.name === categoryName);
          return axiosInstance.post("/revenue-categories", {
            name: categoryName,
            description: category?.description || "",
            is_required: bulkIsRequired,
            restaurant_id: bulkRestaurantId
          });
        });

        await Promise.all(promises);
        
        toast.success(`${selectedCategories.length} categories added successfully!`);
        setOpen(false);
        onUpdate();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to add categories");
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter((category) => {
    const query = searchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(query) ||
      (category.description && category.description.toLowerCase().includes(query)) ||
      (category.restaurant_name && category.restaurant_name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Revenue Categories</h2>
            <p className="text-sm text-gray-600">Manage categories for revenue entry forms</p>
          </div>
        </div>

        <Button 
          onClick={openAddDialog}
          className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
          data-testid="add-category-button"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="category-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Revenue Category" : "Add New Revenue Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the revenue category details below."
                : "Select multiple categories to add to the restaurant."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Restaurant Selection */}
            <div className="space-y-2">
              <Label>Restaurant *</Label>
              {editingCategory ? (
                <Select
                  value={formData.restaurant_id}
                  onValueChange={(value) => setFormData({ ...formData, restaurant_id: value })}
                >
                  <SelectTrigger>
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
                <Select value={bulkRestaurantId} onValueChange={setBulkRestaurantId}>
                  <SelectTrigger>
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

            {/* Category Selection */}
            {editingCategory ? (
              <>
                <div className="space-y-2">
                  <Label>Category Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            ) : (
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
                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50 space-y-2">
                  {categoryMasterList.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      No categories available. Click &quot;Manage Categories&quot; to add.
                    </div>
                  ) : (
                    categoryMasterList.map((category) => {
                      const isSelected = selectedCategories.includes(category.name);
                      return (
                        <label
                          key={category.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCategory(category.name)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{category.name}</p>
                            {category.description && (
                              <p className="text-xs text-gray-500 truncate">{category.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                {selectedCategories.length > 0 && (
                  <p className="text-sm text-indigo-600 font-medium">
                    {selectedCategories.length} category(ies) selected
                  </p>
                )}
              </div>
            )}

            {/* Required Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label>Required Field</Label>
                <p className="text-sm text-gray-600">
                  Make {editingCategory ? 'this category' : 'these categories'} mandatory
                </p>
              </div>
              {editingCategory ? (
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
              ) : (
                <Switch checked={bulkIsRequired} onCheckedChange={setBulkIsRequired} />
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingCategory ? "Update" : `Add ${selectedCategories.length} Categories`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{category.restaurant_name}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(category)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(category.id)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {category.description && (
              <p className="mt-3 text-sm text-gray-600 line-clamp-2">{category.description}</p>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <span className={`px-2 py-1 rounded-full ${category.is_required ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                {category.is_required ? 'Required' : 'Optional'}
              </span>
              <span>Created {formatDateDDMonYYYY(category.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No categories found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? "Try adjusting your search" : "Start by adding your first category"}
          </p>
          {!searchQuery && (
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, categoryId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Revenue Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this revenue category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RevenueCategoriesManager;
