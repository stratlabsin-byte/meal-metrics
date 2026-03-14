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
import { axiosInstance } from "../App";
import { toast } from "sonner";
import { Settings, Plus, Trash2, GripVertical, Save, RotateCcw } from "lucide-react";
import { useBusinessConfig } from "../contexts/BusinessConfigContext";

const PRESETS = {
  "Food Court": {
    business_type: "Food Court",
    app_name: "Food Court Manager",
    entity_label_singular: "Restaurant",
    entity_label_plural: "Restaurants",
    revenue_label: "Revenue",
    brand_label: "Brand",
    custom_fields: [
      { field_key: "gst_number", label: "GST Number", field_type: "text", placeholder: "e.g., 22AAAAA0000A1Z5", required: false, options: [], order: 1 },
      { field_key: "phone", label: "Phone Number", field_type: "text", placeholder: "e.g., +91 98765 43210", required: false, options: [], order: 2 },
      { field_key: "address", label: "Address", field_type: "textarea", placeholder: "Enter full address", required: false, options: [], order: 3 },
      { field_key: "msme_number", label: "MSME Number", field_type: "text", placeholder: "Enter MSME registration number", required: false, options: [], order: 4 },
    ],
    document_types: [
      { value: "business_license", label: "Business License" },
      { value: "health_permit", label: "Health Permit" },
      { value: "tax_document", label: "Tax Document" },
      { value: "contract", label: "Contract" },
      { value: "other", label: "Other" },
    ],
  },
  "Retail Chain": {
    business_type: "Retail Chain",
    app_name: "Retail Chain Manager",
    entity_label_singular: "Store",
    entity_label_plural: "Stores",
    revenue_label: "Sales",
    brand_label: "Brand",
    custom_fields: [
      { field_key: "gst_number", label: "GST Number", field_type: "text", placeholder: "e.g., 22AAAAA0000A1Z5", required: false, options: [], order: 1 },
      { field_key: "phone", label: "Phone Number", field_type: "text", placeholder: "e.g., +91 98765 43210", required: false, options: [], order: 2 },
      { field_key: "address", label: "Address", field_type: "textarea", placeholder: "Enter full address", required: false, options: [], order: 3 },
      { field_key: "store_size", label: "Store Size (sq ft)", field_type: "number", placeholder: "e.g., 1500", required: false, options: [], order: 4 },
    ],
    document_types: [
      { value: "business_license", label: "Business License" },
      { value: "lease_agreement", label: "Lease Agreement" },
      { value: "tax_document", label: "Tax Document" },
      { value: "insurance", label: "Insurance" },
      { value: "other", label: "Other" },
    ],
  },
  "Service Business": {
    business_type: "Service Business",
    app_name: "Service Business Manager",
    entity_label_singular: "Branch",
    entity_label_plural: "Branches",
    revenue_label: "Revenue",
    brand_label: "Category",
    custom_fields: [
      { field_key: "phone", label: "Phone Number", field_type: "text", placeholder: "e.g., +91 98765 43210", required: false, options: [], order: 1 },
      { field_key: "address", label: "Address", field_type: "textarea", placeholder: "Enter full address", required: false, options: [], order: 2 },
      { field_key: "manager_name", label: "Branch Manager", field_type: "text", placeholder: "Manager name", required: false, options: [], order: 3 },
    ],
    document_types: [
      { value: "business_license", label: "Business License" },
      { value: "service_agreement", label: "Service Agreement" },
      { value: "tax_document", label: "Tax Document" },
      { value: "contract", label: "Contract" },
      { value: "other", label: "Other" },
    ],
  },
};

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
];

const BusinessConfigManager = () => {
  const { config, refreshConfig } = useBusinessConfig();
  const [formData, setFormData] = useState({
    business_type: "Food Court",
    app_name: "Food Court Manager",
    entity_label_singular: "Restaurant",
    entity_label_plural: "Restaurants",
    revenue_label: "Revenue",
    brand_label: "Brand",
    custom_fields: [],
    document_types: [],
  });
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");

  useEffect(() => {
    if (config) {
      setFormData({
        business_type: config.business_type || "Food Court",
        app_name: config.app_name || "Food Court Manager",
        entity_label_singular: config.entity_label_singular || "Restaurant",
        entity_label_plural: config.entity_label_plural || "Restaurants",
        revenue_label: config.revenue_label || "Revenue",
        brand_label: config.brand_label || "Brand",
        custom_fields: config.custom_fields || [],
        document_types: config.document_types || [],
      });
    }
  }, [config]);

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    if (preset === "Custom") return;
    const presetData = PRESETS[preset];
    if (presetData) {
      setFormData({ ...presetData });
    }
  };

  const handleSave = async () => {
    if (!formData.app_name.trim() || !formData.entity_label_singular.trim() || !formData.entity_label_plural.trim()) {
      toast.error("App name and entity labels are required");
      return;
    }

    // Validate custom fields have unique keys
    const fieldKeys = formData.custom_fields.map(f => f.field_key).filter(Boolean);
    if (new Set(fieldKeys).size !== fieldKeys.length) {
      toast.error("Custom field keys must be unique");
      return;
    }

    setSaving(true);
    try {
      await axiosInstance.put("/business-config", formData);
      await refreshConfig();
      toast.success("Business configuration saved successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        business_type: config.business_type || "Food Court",
        app_name: config.app_name || "Food Court Manager",
        entity_label_singular: config.entity_label_singular || "Restaurant",
        entity_label_plural: config.entity_label_plural || "Restaurants",
        revenue_label: config.revenue_label || "Revenue",
        brand_label: config.brand_label || "Brand",
        custom_fields: config.custom_fields || [],
        document_types: config.document_types || [],
      });
      setSelectedPreset("");
      toast.info("Reset to saved configuration");
    }
  };

  // Custom fields management
  const addCustomField = () => {
    const newOrder = formData.custom_fields.length + 1;
    setFormData({
      ...formData,
      custom_fields: [
        ...formData.custom_fields,
        { field_key: "", label: "", field_type: "text", placeholder: "", required: false, options: [], order: newOrder },
      ],
    });
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...formData.custom_fields];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-generate field_key from label if key is empty
    if (field === "label" && !updated[index].field_key) {
      updated[index].field_key = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    }
    setFormData({ ...formData, custom_fields: updated });
  };

  const removeCustomField = (index) => {
    const updated = formData.custom_fields.filter((_, i) => i !== index);
    // Re-order
    updated.forEach((f, i) => (f.order = i + 1));
    setFormData({ ...formData, custom_fields: updated });
  };

  const moveField = (index, direction) => {
    const updated = [...formData.custom_fields];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    updated.forEach((f, i) => (f.order = i + 1));
    setFormData({ ...formData, custom_fields: updated });
  };

  // Document types management
  const addDocumentType = () => {
    setFormData({
      ...formData,
      document_types: [...formData.document_types, { value: "", label: "" }],
    });
  };

  const updateDocumentType = (index, field, value) => {
    const updated = [...formData.document_types];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "label" && !updated[index].value) {
      updated[index].value = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    }
    setFormData({ ...formData, document_types: updated });
  };

  const removeDocumentType = (index) => {
    setFormData({
      ...formData,
      document_types: formData.document_types.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Business Configuration
          </CardTitle>
          <CardDescription>
            Configure your business type, labels, custom fields, and document types. Changes will apply across the entire application.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Preset Selector */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup</CardTitle>
          <CardDescription>
            Choose a preset to quickly configure all settings, or customize individually below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {["Food Court", "Retail Chain", "Service Business", "Custom"].map((preset) => (
              <Button
                key={preset}
                variant={selectedPreset === preset ? "default" : "outline"}
                onClick={() => handlePresetChange(preset)}
                className={selectedPreset === preset ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                {preset}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Labels Configuration */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg">Application Labels</CardTitle>
          <CardDescription>
            Customize how your business entities and metrics are labeled throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Input
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                placeholder="e.g., Food Court, Retail Chain"
              />
            </div>
            <div className="space-y-2">
              <Label>Application Name</Label>
              <Input
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                placeholder="e.g., Food Court Manager"
              />
            </div>
            <div className="space-y-2">
              <Label>Entity Label (Singular)</Label>
              <Input
                value={formData.entity_label_singular}
                onChange={(e) => setFormData({ ...formData, entity_label_singular: e.target.value })}
                placeholder="e.g., Restaurant, Store, Branch"
              />
              <p className="text-xs text-gray-500">Used when referring to a single outlet</p>
            </div>
            <div className="space-y-2">
              <Label>Entity Label (Plural)</Label>
              <Input
                value={formData.entity_label_plural}
                onChange={(e) => setFormData({ ...formData, entity_label_plural: e.target.value })}
                placeholder="e.g., Restaurants, Stores, Branches"
              />
              <p className="text-xs text-gray-500">Used when referring to multiple outlets</p>
            </div>
            <div className="space-y-2">
              <Label>Revenue Label</Label>
              <Input
                value={formData.revenue_label}
                onChange={(e) => setFormData({ ...formData, revenue_label: e.target.value })}
                placeholder="e.g., Revenue, Sales, Income"
              />
              <p className="text-xs text-gray-500">How financial inflow is labeled</p>
            </div>
            <div className="space-y-2">
              <Label>Brand/Group Label</Label>
              <Input
                value={formData.brand_label}
                onChange={(e) => setFormData({ ...formData, brand_label: e.target.value })}
                placeholder="e.g., Brand, Category, Group"
              />
              <p className="text-xs text-gray-500">How outlet grouping is labeled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Custom Fields</CardTitle>
              <CardDescription>
                Define custom data fields that appear on each {formData.entity_label_singular.toLowerCase() || "entity"} profile.
              </CardDescription>
            </div>
            <Button onClick={addCustomField} variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.custom_fields.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No custom fields defined. Click "Add Field" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {formData.custom_fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => moveField(index, -1)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move up"
                    >
                      <GripVertical className="w-4 h-4 rotate-90 scale-x-[-1]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, 1)}
                      disabled={index === formData.custom_fields.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move down"
                    >
                      <GripVertical className="w-4 h-4 rotate-90" />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateCustomField(index, "label", e.target.value)}
                        placeholder="Field name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Key</Label>
                      <Input
                        value={field.field_key}
                        onChange={(e) => updateCustomField(index, "field_key", e.target.value)}
                        placeholder="field_key"
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={field.field_type}
                        onValueChange={(v) => updateCustomField(index, "field_type", v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((ft) => (
                            <SelectItem key={ft.value} value={ft.value}>
                              {ft.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder</Label>
                      <Input
                        value={field.placeholder}
                        onChange={(e) => updateCustomField(index, "placeholder", e.target.value)}
                        placeholder="Placeholder text"
                        className="h-8 text-sm"
                      />
                    </div>
                    {field.field_type === "select" && (
                      <div className="sm:col-span-2 lg:col-span-4 space-y-1">
                        <Label className="text-xs">Options (comma-separated)</Label>
                        <Input
                          value={(field.options || []).join(", ")}
                          onChange={(e) =>
                            updateCustomField(
                              index,
                              "options",
                              e.target.value.split(",").map((o) => o.trim()).filter(Boolean)
                            )
                          }
                          placeholder="Option 1, Option 2, Option 3"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={field.required || false}
                        onChange={(e) => updateCustomField(index, "required", e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={`required-${index}`} className="text-xs cursor-pointer">
                        Required
                      </Label>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomField(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Types */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Document Types</CardTitle>
              <CardDescription>
                Define the types of documents that can be uploaded for each {formData.entity_label_singular.toLowerCase() || "entity"}.
              </CardDescription>
            </div>
            <Button onClick={addDocumentType} variant="outline" size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.document_types.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No document types defined. Click "Add Type" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {formData.document_types.map((docType, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={docType.label}
                        onChange={(e) => updateDocumentType(index, "label", e.target.value)}
                        placeholder="e.g., Business License"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Key</Label>
                      <Input
                        value={docType.value}
                        onChange={(e) => updateDocumentType(index, "value", e.target.value)}
                        placeholder="e.g., business_license"
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocumentType(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save / Reset buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
};

export default BusinessConfigManager;
