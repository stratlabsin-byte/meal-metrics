import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, Plus, Edit, Trash2, Eye, Search } from "lucide-react";
import { formatDateDDMonYYYY } from "../utils/dateFormat";

const RoyaltyPayeeManager = () => {
  const [payees, setPayees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ isOpen: false, payee: null });
  const [viewDialog, setViewDialog] = useState({ isOpen: false, payee: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, payeeId: null });
  const [newPayeeName, setNewPayeeName] = useState("");
  const [editPayeeName, setEditPayeeName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayees();
  }, []);

  const fetchPayees = async () => {
    try {
      const response = await axiosInstance.get("/royalty-payees");
      setPayees(response.data);
    } catch (error) {
      toast.error("Failed to fetch payees");
      console.error(error);
    }
  };

  const handleAdd = async () => {
    if (!newPayeeName.trim()) {
      toast.error("Please enter payee name");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/royalty-payees", { name: newPayeeName.trim() });
      toast.success("Payee added successfully!");
      setNewPayeeName("");
      setAddDialog(false);
      fetchPayees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add payee");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (payee) => {
    setEditPayeeName(payee.name);
    setEditDialog({ isOpen: true, payee });
  };

  const handleUpdate = async () => {
    if (!editPayeeName.trim()) {
      toast.error("Please enter payee name");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.put(`/royalty-payees/${editDialog.payee.id}`, { 
        name: editPayeeName.trim() 
      });
      toast.success("Payee updated successfully!");
      setEditDialog({ isOpen: false, payee: null });
      setEditPayeeName("");
      fetchPayees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update payee");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/royalty-payees/${deleteDialog.payeeId}`);
      toast.success("Payee deleted successfully!");
      setDeleteDialog({ isOpen: false, payeeId: null });
      fetchPayees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete payee");
    }
  };

  const filteredPayees = payees.filter(payee =>
    payee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Royalty Payee Management</h2>
          <p className="text-muted-foreground">Manage royalty payees and their information</p>
        </div>
        <Button onClick={() => setAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add New Payee
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search payees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Payees List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPayees.map((payee) => (
          <Card key={payee.id} className="shadow-lg border-0 bg-white/90 backdrop-blur-xl hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{payee.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Added: {formatDateDDMonYYYY(payee.created_at)}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewDialog({ isOpen: true, payee })}
                  className="flex-1 gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(payee)}
                  className="flex-1 gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialog({ isOpen: true, payeeId: payee.id })}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayees.length === 0 && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Users className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payees Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm ? "Try a different search term" : "Start by adding your first payee"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setAddDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Payee
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Payee Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
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
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={loading}>
              {loading ? "Adding..." : "Add Payee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payee Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, payee: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payee</DialogTitle>
            <DialogDescription>
              Update the payee information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payee Name *</Label>
              <Input
                placeholder="e.g., Zomato, Swiggy, Magic Pin"
                value={editPayeeName}
                onChange={(e) => setEditPayeeName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ isOpen: false, payee: null })}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update Payee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payee Dialog */}
      <Dialog open={viewDialog.isOpen} onOpenChange={(open) => !open && setViewDialog({ isOpen: false, payee: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payee Details</DialogTitle>
          </DialogHeader>
          {viewDialog.payee && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-600">Payee Name</Label>
                <p className="text-lg font-semibold">{viewDialog.payee.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">Created Date</Label>
                <p className="text-sm">{formatDateDDMonYYYY(viewDialog.payee.created_at)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">Payee ID</Label>
                <p className="text-xs text-gray-500 font-mono">{viewDialog.payee.id}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog({ isOpen: false, payee: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, payeeId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payee? This action cannot be undone.
              Any royalty entries using this payee will need to be updated.
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

export default RoyaltyPayeeManager;
