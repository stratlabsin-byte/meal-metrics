import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { FileText, Plus, Trash2, Download, Calendar, AlertCircle, Building2, Edit } from "lucide-react";
import { formatDateDDMonYYYY } from "../utils/dateFormat";

const RestaurantDocuments = ({ restaurants }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState({ isOpen: false, document: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, documentId: null });
  const [filterRestaurant, setFilterRestaurant] = useState("all");
  const [imageDialog, setImageDialog] = useState({ isOpen: false, imageUrl: null, documentName: null });
  const [customDocumentType, setCustomDocumentType] = useState("");
  
  const [formData, setFormData] = useState({
    restaurant_id: "",
    document_type: "business_license",
    document_name: "",
    expiry_date: "",
    notes: "",
    file: null,
  });

  const [editFormData, setEditFormData] = useState({
    document_type: "",
    document_name: "",
    expiry_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchDocuments();
  }, [filterRestaurant]);

  const fetchDocuments = async () => {
    try {
      const url = filterRestaurant !== "all" 
        ? `/restaurant-documents?restaurant_id=${filterRestaurant}`
        : "/restaurant-documents";
      const response = await axiosInstance.get(url);
      setDocuments(response.data);
    } catch (error) {
      toast.error("Failed to fetch documents");
      console.error(error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("restaurant_id", formData.restaurant_id);
      submitData.append("document_type", formData.document_type);
      submitData.append("document_name", formData.document_name);
      if (formData.expiry_date) submitData.append("expiry_date", formData.expiry_date);
      submitData.append("notes", formData.notes);
      submitData.append("file", formData.file);
      
      // Add custom document type if "other" is selected
      if (formData.document_type === "other" && customDocumentType) {
        submitData.append("custom_document_type", customDocumentType);
      }

      await axiosInstance.post("/restaurant-documents", submitData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Document uploaded successfully!");
      fetchDocuments();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload document");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axiosInstance.delete(`/restaurant-documents/${deleteDialog.documentId}`);
      toast.success("Document deleted successfully!");
      fetchDocuments();
      setDeleteDialog({ isOpen: false, documentId: null });
    } catch (error) {
      toast.error("Failed to delete document");
      console.error(error);
    }
  };

  const handleEdit = (document) => {
    setEditFormData({
      document_type: document.document_type,
      document_name: document.document_name,
      expiry_date: document.expiry_date || "",
      notes: document.notes || "",
    });
    setCustomDocumentType(document.document_type === "other" ? (document.custom_document_type || "") : "");
    setEditDialog({ isOpen: true, document });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        document_type: editFormData.document_type,
        document_name: editFormData.document_name,
        expiry_date: editFormData.expiry_date || null,
        notes: editFormData.notes,
      };

      // Add custom document type if "other" is selected
      if (editFormData.document_type === "other" && customDocumentType) {
        updateData.custom_document_type = customDocumentType;
      }

      await axiosInstance.put(`/restaurant-documents/${editDialog.document.id}`, updateData);
      
      toast.success("Document updated successfully!");
      fetchDocuments();
      setEditDialog({ isOpen: false, document: null });
      setEditFormData({ document_type: "", document_name: "", expiry_date: "", notes: "" });
      setCustomDocumentType("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update document");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (document) => {
    const url = `${process.env.REACT_APP_BACKEND_URL}${document.file_url}`;
    window.open(url, '_blank');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      restaurant_id: "",
      document_type: "business_license",
      document_name: "",
      expiry_date: "",
      notes: "",
      file: null,
    });
    setCustomDocumentType("");
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const daysDiff = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 && daysDiff <= 30;
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      business_license: "Business License",
      health_permit: "Health Permit",
      tax_document: "Tax Document",
      contract: "Contract",
      other: "Other"
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Restaurant Documents</h2>
          <p className="text-muted-foreground">Manage licenses, permits, and other documents</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filterRestaurant} onValueChange={setFilterRestaurant}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Restaurants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Restaurants</SelectItem>
              {restaurants.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <Card key={document.id} className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div 
                    className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                    onClick={() => {
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(document.file_type?.toLowerCase());
                      if (isImage) {
                        setImageDialog({ 
                          isOpen: true, 
                          imageUrl: `${process.env.REACT_APP_BACKEND_URL}${document.file_url}`,
                          documentName: document.document_name
                        });
                      }
                    }}
                  >
                    {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(document.file_type?.toLowerCase()) ? (
                      <img 
                        src={`${process.env.REACT_APP_BACKEND_URL}${document.file_url}`}
                        alt={document.document_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{document.document_name}</CardTitle>
                    <CardDescription className="text-xs">
                      {getDocumentTypeLabel(document.document_type)}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span className="truncate">{document.restaurant_name}</span>
                </div>
                {document.expiry_date && (
                  <div className={`flex items-center gap-2 ${
                    isExpired(document.expiry_date) ? 'text-red-600' :
                    isExpiringSoon(document.expiry_date) ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    <span>Expires: {formatDateDDMonYYYY(document.expiry_date)}</span>
                  </div>
                )}
                {isExpired(document.expiry_date) && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">EXPIRED</span>
                  </div>
                )}
                {isExpiringSoon(document.expiry_date) && !isExpired(document.expiry_date) && (
                  <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">EXPIRING SOON</span>
                  </div>
                )}
                {document.notes && (
                  <p className="text-xs text-gray-500 line-clamp-2">{document.notes}</p>
                )}
                <div className="text-xs text-gray-400">
                  Uploaded: {formatDateDDMonYYYY(document.uploaded_at)}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload(document)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(document)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setDeleteDialog({ isOpen: true, documentId: document.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
            <p className="text-sm text-gray-500 mb-4">Start by uploading your first document</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document for your restaurant
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Restaurant *</Label>
              <Select
                value={formData.restaurant_id}
                onValueChange={(value) => handleInputChange("restaurant_id", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select
                value={formData.document_type}
                onValueChange={(value) => handleInputChange("document_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_license">Business License</SelectItem>
                  <SelectItem value="health_permit">Health Permit</SelectItem>
                  <SelectItem value="tax_document">Tax Document</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.document_type === "other" && (
              <div className="space-y-2">
                <Label>Specify Document Type *</Label>
                <Input
                  value={customDocumentType}
                  onChange={(e) => setCustomDocumentType(e.target.value)}
                  placeholder="e.g., Insurance Policy, Lease Agreement"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                value={formData.document_name}
                onChange={(e) => handleInputChange("document_name", e.target.value)}
                placeholder="e.g., Business License 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleInputChange("expiry_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
              />
              <p className="text-xs text-gray-500">
                Supported formats: PDF, DOC, DOCX, JPG, PNG
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, document: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document details (file cannot be changed)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select
                value={editFormData.document_type}
                onValueChange={(value) => setEditFormData({ ...editFormData, document_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_license">Business License</SelectItem>
                  <SelectItem value="health_permit">Health Permit</SelectItem>
                  <SelectItem value="tax_document">Tax Document</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editFormData.document_type === "other" && (
              <div className="space-y-2">
                <Label>Specify Document Type *</Label>
                <Input
                  value={customDocumentType}
                  onChange={(e) => setCustomDocumentType(e.target.value)}
                  placeholder="e.g., Insurance Policy, Lease Agreement"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                value={editFormData.document_name}
                onChange={(e) => setEditFormData({ ...editFormData, document_name: e.target.value })}
                placeholder="e.g., Business License 2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={editFormData.expiry_date}
                onChange={(e) => setEditFormData({ ...editFormData, expiry_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialog({ isOpen: false, document: null })}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Popup Dialog */}
      <Dialog open={imageDialog.isOpen} onOpenChange={(open) => setImageDialog({ isOpen: open, imageUrl: open ? imageDialog.imageUrl : null, documentName: open ? imageDialog.documentName : null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{imageDialog.documentName}</DialogTitle>
            <DialogDescription>Document Image</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {imageDialog.imageUrl && (
              <img 
                src={imageDialog.imageUrl} 
                alt={imageDialog.documentName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, documentId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
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

export default RestaurantDocuments;
