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
import { Users, Plus, Edit, Trash2, Mail, Phone, Briefcase, DollarSign, Calendar, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const EmployeeManager = ({ restaurants }) => {
  const { labels } = useBusinessConfig();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, employeeId: null });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [filterRestaurant, setFilterRestaurant] = useState("all");
  const [imageDialog, setImageDialog] = useState({ isOpen: false, imageUrl: null, employeeName: null });
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    salary: "",
    join_date: "",
    employment_status: "active",
    id_document_number: "",
    restaurant_ids: [],
    photo: null,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get("/employees");
      setEmployees(response.data);
    } catch (error) {
      toast.error("Failed to fetch employees");
      console.error(error);
    }
  };

  const filteredEmployees = filterRestaurant === "all" 
    ? employees 
    : employees.filter(emp => emp.restaurant_ids?.includes(filterRestaurant));

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRestaurantToggle = (restaurantId) => {
    setFormData(prev => {
      const newRestaurantIds = prev.restaurant_ids.includes(restaurantId)
        ? prev.restaurant_ids.filter(id => id !== restaurantId)
        : [...prev.restaurant_ids, restaurantId];
      return { ...prev, restaurant_ids: newRestaurantIds };
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("email", formData.email);
      submitData.append("phone", formData.phone);
      submitData.append("position", formData.position);
      if (formData.salary) submitData.append("salary", formData.salary);
      submitData.append("join_date", formData.join_date);
      submitData.append("employment_status", formData.employment_status);
      if (formData.id_document_number) submitData.append("id_document_number", formData.id_document_number);
      submitData.append("restaurant_ids", JSON.stringify(formData.restaurant_ids));
      if (formData.photo) submitData.append("photo", formData.photo);

      if (editingEmployee) {
        await axiosInstance.put(`/employees/${editingEmployee.id}`, submitData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Employee updated successfully!");
      } else {
        await axiosInstance.post("/employees", submitData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Employee added successfully!");
      }

      fetchEmployees();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save employee");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      salary: employee.salary || "",
      join_date: employee.join_date,
      employment_status: employee.employment_status,
      id_document_number: employee.id_document_number || "",
      restaurant_ids: employee.restaurant_ids || [],
      photo: null,
    });
    if (employee.photo_url) {
      setPhotoPreview(`${process.env.REACT_APP_BACKEND_URL}${employee.photo_url}`);
    }
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/employees/${deleteDialog.employeeId}`);
      toast.success("Employee deleted successfully!");
      fetchEmployees();
      setDeleteDialog({ isOpen: false, employeeId: null });
    } catch (error) {
      toast.error("Failed to delete employee");
      console.error(error);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
    setPhotoPreview(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      position: "",
      salary: "",
      join_date: "",
      employment_status: "active",
      id_document_number: "",
      restaurant_ids: [],
      photo: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employee Management</h2>
          <p className="text-muted-foreground">{`Manage your ${labels.entity.toLowerCase()} employees`}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={`All ${labels.entities}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`All ${labels.entities}`}</SelectItem>
              {restaurants.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div 
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => employee.photo_url && setImageDialog({ 
                    isOpen: true, 
                    imageUrl: `${process.env.REACT_APP_BACKEND_URL}${employee.photo_url}`,
                    employeeName: employee.name
                  })}
                >
                  {employee.photo_url ? (
                    <img 
                      src={`${process.env.REACT_APP_BACKEND_URL}${employee.photo_url}`} 
                      alt={employee.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{employee.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {employee.position}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Joined: {employee.join_date}</span>
                </div>
                {employee.salary && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>Salary: ₹{employee.salary.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    employee.employment_status === 'active' ? 'bg-green-100 text-green-800' :
                    employee.employment_status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {employee.employment_status}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-1">Assigned to:</p>
                  <div className="flex flex-wrap gap-1">
                    {employee.restaurant_names?.map((name, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(employee)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setDeleteDialog({ isOpen: true, employeeId: employee.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Users className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filterRestaurant === "all" ? "No Employees Yet" : `No Employees for This ${labels.entity}`}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {filterRestaurant === "all" ? "Start by adding your first employee" : `Select another ${labels.entity.toLowerCase()} or add an employee`}
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? "Update employee information" : "Enter employee details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Position *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Salary</Label>
                <Input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => handleInputChange("salary", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Join Date *</Label>
                <Input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => handleInputChange("join_date", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Employment Status *</Label>
                <Select
                  value={formData.employment_status}
                  onValueChange={(value) => handleInputChange("employment_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID Document Number</Label>
                <Input
                  value={formData.id_document_number}
                  onChange={(e) => handleInputChange("id_document_number", e.target.value)}
                />
              </div>
            </div>

            {/* Restaurant Assignment */}
            <div className="space-y-2">
              <Label>{`Assign to ${labels.entities} *`}</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {restaurants.map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={restaurant.id}
                      checked={formData.restaurant_ids.includes(restaurant.id)}
                      onCheckedChange={() => handleRestaurantToggle(restaurant.id)}
                    />
                    <label htmlFor={restaurant.id} className="text-sm cursor-pointer">
                      {restaurant.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingEmployee ? "Update" : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Popup Dialog */}
      <Dialog open={imageDialog.isOpen} onOpenChange={(open) => setImageDialog({ isOpen: open, imageUrl: open ? imageDialog.imageUrl : null, employeeName: open ? imageDialog.employeeName : null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{imageDialog.employeeName}</DialogTitle>
            <DialogDescription>Employee Photo</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {imageDialog.imageUrl && (
              <img 
                src={imageDialog.imageUrl} 
                alt={imageDialog.employeeName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, employeeId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
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

export default EmployeeManager;
