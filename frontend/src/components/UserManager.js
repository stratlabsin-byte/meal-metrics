import { useState, useEffect } from "react";
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
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Users, Plus, Edit, Trash2, Shield, UserCog } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateDDMonYYYY } from "../utils/dateFormat";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const UserManager = ({ currentUser }) => {
  const { labels } = useBusinessConfig();
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState({ isOpen: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, userId: null });
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "manager",
    name: "",
    mobile: "",
    email: "",
    permissions: {},
  });

  const [editFormData, setEditFormData] = useState({
    password: "",
    status: "active",
    assigned_restaurant_ids: [],
    permissions: {},
    name: "",
    mobile: "",
    email: "",
  });

  // Available sections/permissions
  const availableSections = [
    { id: "dashboard", label: "Dashboard" },
    { id: "restaurants", label: `${labels.entity} Management` },
    { id: "revenue", label: `${labels.revenue} Management` },
    { id: "revenue_categories", label: `${labels.revenue} Categories` },
    { id: "employees", label: "Employee Management" },
    { id: "documents", label: "Document Management" },
    { id: "brands", label: "Brand Management" },
    { id: "royalty", label: "Royalty Management" },
    { id: "expenses", label: "Expense Management" },
    { id: "targets", label: "Target Management" },
    { id: "users", label: "User Management" },
  ];

  // Permission levels
  const permissionLevels = [
    { value: "none", label: "No Access", color: "text-gray-500" },
    { value: "readonly", label: "Read Only", color: "text-blue-600" },
    { value: "full", label: "Full Access", color: "text-green-600" },
  ];

  // Get allowed roles based on current user
  const getAllowedRoles = () => {
    if (currentUser.role === 'superuser') {
      return [
        { value: "manager", label: "Manager" },
        { value: "admin", label: "Admin" },
        { value: "superuser", label: "Superuser" },
      ];
    } else if (currentUser.role === 'admin') {
      return [
        { value: "manager", label: "Manager" },
        { value: "admin", label: "Admin" },
      ];
    } else if (currentUser.role === 'manager') {
      // Manager can only create manager if they have full permission
      const hasFullUsersPermission = currentUser.permissions?.users === 'full';
      if (hasFullUsersPermission) {
        return [{ value: "manager", label: "Manager" }];
      }
      return [];
    }
    return [];
  };

  const allowedRoles = getAllowedRoles();

  useEffect(() => {
    fetchUsers();
    fetchRestaurants();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get("/users");
      setUsers(response.data);
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await axiosInstance.get("/restaurants");
      setRestaurants(response.data);
    } catch (error) {
      console.error("Failed to fetch restaurants:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axiosInstance.post("/users", formData);
      toast.success("User created successfully!");
      fetchUsers();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create user");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditDialog({ isOpen: true, user });
    setEditFormData({
      password: "",
      status: user.status || "active",
      assigned_restaurant_ids: user.assigned_restaurant_ids || [],
      permissions: user.permissions || {},
      name: user.name || "",
      mobile: user.mobile || "",
      email: user.email || "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {};
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }
      if (editFormData.status) {
        updateData.status = editFormData.status;
      }
      // Include restaurant assignments for managers
      if (editDialog.user.role === 'manager') {
        updateData.assigned_restaurant_ids = editFormData.assigned_restaurant_ids;
      }
      // Include user details
      if (editFormData.name !== undefined) {
        updateData.name = editFormData.name;
      }
      if (editFormData.mobile !== undefined) {
        updateData.mobile = editFormData.mobile;
      }
      if (editFormData.email !== undefined) {
        updateData.email = editFormData.email;
      }
      // Include permissions
      if (editFormData.permissions !== undefined) {
        updateData.permissions = editFormData.permissions;
      }

      await axiosInstance.put(`/users/${editDialog.user.id}`, updateData);
      toast.success("User updated successfully!");
      fetchUsers();
      setEditDialog({ isOpen: false, user: null });
      setEditFormData({ password: "", status: "active", assigned_restaurant_ids: [], permissions: {}, name: "", mobile: "", email: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantToggle = (restaurantId) => {
    setEditFormData(prev => {
      const newRestaurantIds = prev.assigned_restaurant_ids.includes(restaurantId)
        ? prev.assigned_restaurant_ids.filter(id => id !== restaurantId)
        : [...prev.assigned_restaurant_ids, restaurantId];
      return { ...prev, assigned_restaurant_ids: newRestaurantIds };
    });
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/users/${deleteDialog.userId}`);
      toast.success("User deleted successfully!");
      fetchUsers();
      setDeleteDialog({ isOpen: false, userId: null });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete user");
      console.error(error);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      username: "",
      password: "",
      role: "manager",
      name: "",
      mobile: "",
      email: "",
      permissions: {},
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage system users and access control</p>
        </div>
        {allowedRoles.length > 0 && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        )}
      </div>

      {allowedRoles.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ℹ️ You need &quot;Users&quot; section permission set to &quot;Full Access&quot; to create new users.
          </p>
        </div>
      )}

      {/* User Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {user.role === 'admin' ? (
                    <Shield className="w-8 h-8 text-white" />
                  ) : (
                    <UserCog className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{user.username}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    {user.role === 'admin' ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    ) : user.role === 'superuser' ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full flex items-center gap-1">
                        <UserCog className="w-3 h-3" />
                        Superuser
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Manager
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                {user.name && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Name:</span> {user.name}
                  </div>
                )}
                {user.email && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Email:</span> {user.email}
                  </div>
                )}
                {user.mobile && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Mobile:</span> {user.mobile}
                  </div>
                )}
                <div>Created: {formatDateDDMonYYYY(user.created_at)}</div>
                <div className="flex items-center gap-2 pt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.status === 'suspended' ? 'Suspended' : 'Active'}
                  </span>
                </div>
                {user.role === 'manager' && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-gray-500 mb-1">{`Assigned ${labels.entities}:`}</p>
                    {user.assigned_restaurant_ids && user.assigned_restaurant_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.assigned_restaurant_ids.map((restId) => {
                          const restaurant = restaurants.find(r => r.id === restId);
                          return restaurant ? (
                            <span key={restId} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {restaurant.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-red-500">{`No ${labels.entities.toLowerCase()} assigned`}</span>
                    )}
                  </div>
                )}
                {/* Permissions Display */}
                <div className="pt-2 border-t mt-2">
                  <p className="text-xs text-gray-500 mb-1">Section Permissions:</p>
                  {user.permissions && Object.keys(user.permissions).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(user.permissions).map(([sectionId, level]) => {
                        const section = availableSections.find(s => s.id === sectionId);
                        if (!section || level === 'none') return null;
                        
                        const bgColor = level === 'full' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
                        const icon = level === 'full' ? '✓' : '👁';
                        
                        return (
                          <span key={sectionId} className={`px-2 py-1 text-xs rounded ${bgColor} flex items-center gap-1`}>
                            <span>{icon}</span>
                            {section.label}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-red-500">No permissions assigned</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(user)}
                  disabled={currentUser.role === 'admin' && user.role === 'superuser'}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setDeleteDialog({ isOpen: true, userId: user.id })}
                  disabled={currentUser.role === 'admin' && user.role === 'superuser'}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {currentUser.role === 'admin' && user.role === 'superuser' && (
                <p className="text-xs text-gray-500 italic text-center mt-2">
                  Only Superusers can modify Superuser accounts
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Users className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Users Yet</h3>
            <p className="text-sm text-gray-500 mb-4">Start by adding your first user</p>
            {allowedRoles.length > 0 && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange("role", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.role === 'superuser' && '🔸 Superuser requires explicit permission assignment'}
                {formData.role === 'admin' && '🔸 Admin has full access to all sections by default'}
                {formData.role === 'manager' && `🔸 Manager has limited access to assigned ${labels.entities.toLowerCase()}`}
              </p>
              {currentUser.role === 'admin' && (
                <p className="text-xs text-blue-600 italic">
                  Note: As Admin, you cannot create Superuser accounts
                </p>
              )}
              {currentUser.role === 'manager' && (
                <p className="text-xs text-blue-600 italic">
                  Note: As Manager, you can only create Manager accounts
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={formData.mobile}
                onChange={(e) => handleInputChange("mobile", e.target.value)}
                placeholder="e.g., +91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, user: null })}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User: {editDialog.user?.username}</DialogTitle>
            <DialogDescription>
              Update user password, status, or restaurant assignments
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>New Password (leave empty to keep current)</Label>
              <Input
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label>Account Status *</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Suspended users cannot login to the system
              </p>
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={editFormData.mobile}
                onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                placeholder="e.g., +91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            {editDialog.user?.role === 'manager' && (
              <div className="space-y-2">
                <Label>{`Assign ${labels.entities} *`}</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {restaurants.length > 0 ? (
                    restaurants.map((restaurant) => (
                      <div key={restaurant.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`rest-${restaurant.id}`}
                          checked={editFormData.assigned_restaurant_ids.includes(restaurant.id)}
                          onCheckedChange={() => handleRestaurantToggle(restaurant.id)}
                        />
                        <label htmlFor={`rest-${restaurant.id}`} className="text-sm cursor-pointer">
                          {restaurant.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">{`No ${labels.entities.toLowerCase()} available`}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {`Manager will only see data for selected ${labels.entities.toLowerCase()}`}
                </p>
              </div>
            )}

            {/* Permissions Section */}
            <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <Label className="text-base font-semibold text-blue-900">Section Permissions</Label>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                {editDialog.user?.role === 'superuser' 
                  ? 'Superuser can modify admin permissions and grant access to sections'
                  : editDialog.user?.role === 'admin'
                  ? 'Admin has full access by default. Superusers can restrict access'
                  : 'Control which sections this manager can access and permission level'}
              </p>
              <div className="space-y-2">
                {availableSections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between bg-white p-2 rounded border">
                    <label className="text-sm font-medium">
                      {section.label}
                    </label>
                    <Select
                      value={editFormData.permissions[section.id] || "none"}
                      onValueChange={(value) => {
                        setEditFormData({
                          ...editFormData,
                          permissions: {
                            ...editFormData.permissions,
                            [section.id]: value
                          }
                        });
                      }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-gray-500">No Access</span>
                        </SelectItem>
                        <SelectItem value="readonly">
                          <span className="text-blue-600">Read Only</span>
                        </SelectItem>
                        <SelectItem value="full">
                          <span className="text-green-600">Full Access</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog({ isOpen: false, user: null })}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, userId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
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

export default UserManager;
