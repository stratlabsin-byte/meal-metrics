import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const BusinessConfigContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_CONFIG = {
  business_type: "Food Court",
  app_name: "Food Court Manager",
  entity_label_singular: "Restaurant",
  entity_label_plural: "Restaurants",
  revenue_label: "Revenue",
  brand_label: "Brand",
  document_types: [
    { value: "business_license", label: "Business License" },
    { value: "health_permit", label: "Health Permit" },
    { value: "tax_document", label: "Tax Document" },
    { value: "contract", label: "Contract" },
    { value: "other", label: "Other" },
  ],
  custom_fields: [
    { field_key: "gst_number", label: "GST Number", field_type: "text", placeholder: "e.g., 22AAAAA0000A1Z5", required: false, options: [], order: 1 },
    { field_key: "phone", label: "Phone Number", field_type: "text", placeholder: "e.g., +91 98765 43210", required: false, options: [], order: 2 },
    { field_key: "address", label: "Address", field_type: "textarea", placeholder: "Enter full address", required: false, options: [], order: 3 },
    { field_key: "msme_number", label: "MSME Number", field_type: "text", placeholder: "Enter MSME registration number", required: false, options: [], order: 4 },
  ],
};

export const BusinessConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      // Use raw axios (no auth token needed - public endpoint)
      const response = await axios.get(`${BACKEND_URL}/api/business-config`);
      setConfig({ ...DEFAULT_CONFIG, ...response.data });
    } catch (error) {
      console.error("Failed to load business config, using defaults");
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const refreshConfig = () => fetchConfig();

  const labels = {
    entity: config.entity_label_singular,
    entities: config.entity_label_plural,
    revenue: config.revenue_label,
    brand: config.brand_label,
    appName: config.app_name,
  };

  return (
    <BusinessConfigContext.Provider value={{ config, labels, loading, refreshConfig }}>
      {children}
    </BusinessConfigContext.Provider>
  );
};

export const useBusinessConfig = () => {
  const context = useContext(BusinessConfigContext);
  if (!context) {
    throw new Error("useBusinessConfig must be used within BusinessConfigProvider");
  }
  return context;
};

export default BusinessConfigContext;
