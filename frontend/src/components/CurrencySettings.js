import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings } from "lucide-react";

const CURRENCY_ICONS = [
  { value: "₹", label: "Indian Rupee (₹)", symbol: "₹" },
  { value: "$", label: "US Dollar ($)", symbol: "$" },
  { value: "€", label: "Euro (€)", symbol: "€" },
  { value: "£", label: "British Pound (£)", symbol: "£" },
  { value: "¥", label: "Japanese Yen (¥)", symbol: "¥" },
  { value: "custom", label: "Custom Text", symbol: "" },
];

const ICON_SIZES = [
  { value: "text-sm", label: "Small", size: "14px" },
  { value: "text-base", label: "Medium", size: "16px" },
  { value: "text-lg", label: "Large", size: "18px" },
  { value: "text-xl", label: "Extra Large", size: "20px" },
];

const CurrencySettings = ({ onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("currencySettings");
    return saved ? JSON.parse(saved) : {
      icon: "₹",
      customText: "",
      size: "text-base",
      position: "before"
    };
  });

  const handleSave = () => {
    localStorage.setItem("currencySettings", JSON.stringify(settings));
    onUpdate(settings);
    setOpen(false);
  };

  const getDisplayIcon = () => {
    if (settings.icon === "custom") {
      return settings.customText || "₹";
    }
    return settings.icon;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="currency-settings-button"
        >
          <Settings className="w-4 h-4" />
          Currency: {getDisplayIcon()}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="currency-settings-dialog">
        <DialogHeader>
          <DialogTitle>Currency Display Settings</DialogTitle>
          <DialogDescription>
            Customize how currency is displayed throughout the application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currency-icon">Currency Symbol</Label>
            <Select
              value={settings.icon}
              onValueChange={(value) => setSettings({ ...settings, icon: value })}
            >
              <SelectTrigger data-testid="currency-icon-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_ICONS.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {settings.icon === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-text">Custom Currency Text</Label>
              <Input
                id="custom-text"
                placeholder="e.g., INR, Rs."
                value={settings.customText}
                onChange={(e) => setSettings({ ...settings, customText: e.target.value })}
                data-testid="custom-currency-input"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="icon-size">Icon Size</Label>
            <Select
              value={settings.size}
              onValueChange={(value) => setSettings({ ...settings, size: value })}
            >
              <SelectTrigger data-testid="currency-size-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label} ({size.size})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon-position">Position</Label>
            <Select
              value={settings.position}
              onValueChange={(value) => setSettings({ ...settings, position: value })}
            >
              <SelectTrigger data-testid="currency-position-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before Amount</SelectItem>
                <SelectItem value="after">After Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <Label className="text-sm font-medium text-gray-700">Preview</Label>
            <div className="mt-2 text-2xl font-bold">
              <span className={`${settings.size} ${settings.position === 'before' ? 'mr-1' : 'order-2 ml-1'}`}>
                {getDisplayIcon()}
              </span>
              <span className={settings.position === 'after' ? 'order-1' : ''}>
                1,23,456.00
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} data-testid="save-currency-settings">
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Currency formatter component
export const CurrencyDisplay = ({ amount, className = "", settings = null, compact = false }) => {
  const currencySettings = settings || JSON.parse(localStorage.getItem("currencySettings") || '{"icon": "₹", "size": "text-base", "position": "before", "customText": ""}');

  const getIcon = () => {
    if (currencySettings.icon === "custom") {
      return currencySettings.customText || "₹";
    }
    return currencySettings.icon;
  };

  const formatCompact = (num) => {
    if (typeof num !== 'number') return num;
    const abs = Math.abs(num);
    if (abs >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formattedAmount = compact
    ? formatCompact(typeof amount === 'number' ? amount : parseFloat(amount) || 0)
    : typeof amount === 'number'
      ? amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : amount;

  if (currencySettings.position === "after") {
    return (
      <span className={className}>
        {formattedAmount}
        <span className={`${currencySettings.size} ml-1`}>
          {getIcon()}
        </span>
      </span>
    );
  }

  return (
    <span className={className}>
      <span className={`${currencySettings.size} mr-1`}>
        {getIcon()}
      </span>
      {formattedAmount}
    </span>
  );
};

export default CurrencySettings;