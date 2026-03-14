import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreVertical, Copy, Edit, Download, Trash2, TrendingUp, FileText, Building2, Calculator, BarChart3 } from "lucide-react";
import { CurrencyDisplay } from "./CurrencySettings";
import { toast } from "sonner";

const STAT_TYPES = [
  { value: "sum", label: "Sum (Total)", icon: TrendingUp },
  { value: "count", label: "Count", icon: FileText },
  { value: "average", label: "Average", icon: Calculator },
  { value: "percentage", label: "Percentage", icon: BarChart3 },
  { value: "target", label: "Target Meter", icon: TrendingUp },
  { value: "custom", label: "Custom Value", icon: Building2 },
];

const CARD_COLORS = [
  { value: "blue", label: "Blue", from: "from-blue-50", to: "to-blue-100", icon: "bg-blue-600" },
  { value: "green", label: "Green", from: "from-green-50", to: "to-green-100", icon: "bg-green-600" },
  { value: "orange", label: "Orange", from: "from-orange-50", to: "to-orange-100", icon: "bg-orange-600" },
  { value: "purple", label: "Purple", from: "from-purple-50", to: "to-purple-100", icon: "bg-purple-600" },
  { value: "red", label: "Red", from: "from-red-50", to: "to-red-100", icon: "bg-red-600" },
  { value: "indigo", label: "Indigo", from: "from-indigo-50", to: "to-indigo-100", icon: "bg-indigo-600" },
];

const StatCardManager = ({ stats, employeeStats, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [statConfig, setStatConfig] = useState({
    title: "",
    statType: "sum",
    dataSource: "revenue",
    color: "blue",
    customValue: "",
    targetValue: "",
    icon: "TrendingUp",
    textSize: "text-3xl",
    // New fields for restaurant-specific targets
    useRestaurantTarget: false,
    restaurant_id: "",
    fiscal_year: new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1,
    period_type: "yearly",
    period_value: null,
  });
  const [customStatCards, setCustomStatCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, cardId: null });

  const calculateStatValue = (config) => {
    if (!stats) return 0;
    
    switch (config.statType) {
      case "sum":
        if (config.dataSource === "revenue") return stats.total_revenue;
        if (config.dataSource === "entries") return stats.total_entries;
        if (config.dataSource === "employees" && employeeStats) return employeeStats.total_employees;
        return stats.total_entries;
      case "count":
        if (config.dataSource === "revenue") return stats.total_entries;
        if (config.dataSource === "restaurants") return stats.restaurant_breakdown.length;
        if (config.dataSource === "employees" && employeeStats) return employeeStats.active_employees;
        return stats.restaurant_breakdown.length;
      case "average":
        if (config.dataSource === "employees" && employeeStats) {
          return stats.restaurant_breakdown.length > 0 ? 
            employeeStats.total_employees / stats.restaurant_breakdown.length : 0;
        }
        return stats.total_entries > 0 ? stats.total_revenue / stats.total_entries : 0;
      case "percentage":
        if (config.dataSource === "employees" && employeeStats) {
          return employeeStats.total_employees > 0 ?
            (employeeStats.active_employees / employeeStats.total_employees) * 100 : 0;
        }
        return stats.restaurant_breakdown.length > 0 ? 
          (stats.total_revenue / (stats.restaurant_breakdown.length * 1000)) * 100 : 0;
      case "target":
        // For target, we return the current value based on data source
        if (config.dataSource === "revenue") return stats.total_revenue;
        if (config.dataSource === "entries") return stats.total_entries;
        if (config.dataSource === "restaurants") return stats.restaurant_breakdown.length;
        if (config.dataSource === "employees" && employeeStats) return employeeStats.total_employees;
        return stats.total_revenue;
      case "custom":
        return parseFloat(config.customValue) || 0;
      default:
        return 0;
    }
  };

  const calculateTargetProgress = (config) => {
    const currentValue = calculateStatValue(config);
    const targetValue = parseFloat(config.targetValue) || 1;
    return (currentValue / targetValue) * 100;
  };

  const getIconComponent = (iconName) => {
    const icons = {
      TrendingUp,
      FileText,
      Building2,
      Calculator,
      BarChart3,
    };
    return icons[iconName] || TrendingUp;
  };

  const handleCreate = () => {
    if (editingCard) {
      // Update existing card
      const updatedCards = customStatCards.map(card =>
        card.id === editingCard.id ? { ...statConfig, id: editingCard.id } : card
      );
      setCustomStatCards(updatedCards);
      toast.success("Stat card updated successfully!");
    } else {
      // Create new card
      const newCard = {
        ...statConfig,
        id: Date.now(),
      };
      setCustomStatCards([...customStatCards, newCard]);
      toast.success("Stat card created successfully!");
    }
    
    setOpen(false);
    setEditingCard(null);
    resetConfig();
  };

  const resetConfig = () => {
    setStatConfig({
      title: "",
      statType: "sum",
      dataSource: "revenue",
      color: "blue",
      customValue: "",
      targetValue: "",
      icon: "TrendingUp",
      textSize: "text-3xl",
    });
  };

  const handleClone = (card) => {
    const clonedCard = {
      ...card,
      id: Date.now(),
      title: `${card.title} (Copy)`,
    };
    setCustomStatCards([...customStatCards, clonedCard]);
    toast.success("Stat card cloned successfully!");
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setStatConfig({ ...card });
    setOpen(true);
  };

  const handleDownload = (card) => {
    const exportData = {
      cardInfo: {
        title: card.title,
        statType: card.statType,
        dataSource: card.dataSource,
        color: card.color,
        icon: card.icon,
        textSize: card.textSize,
        customValue: card.customValue,
        createdAt: new Date().toISOString(),
      },
      currentValue: calculateStatValue(card),
      metadata: {
        calculationDate: new Date().toISOString(),
        baseStats: stats,
      }
    };

    // Download JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.title.replace(/\s+/g, '_')}_stat_card.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Stat card data downloaded!");
  };

  const handleDelete = (cardId) => {
    setCustomStatCards(customStatCards.filter(card => card.id !== cardId));
    setDeleteDialog({ isOpen: false, cardId: null });
    toast.success("Stat card deleted successfully!");
  };

  const openDeleteDialog = (cardId) => {
    setDeleteDialog({ isOpen: true, cardId });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCard(null);
    resetConfig();
  };

  const handleDialogChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingCard(null);
      resetConfig();
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button
            className="gap-2 bg-gradient-to-r from-blue-600 to-green-600"
            data-testid="add-stat-card-button"
          >
            <Plus className="w-4 h-4" />
            Add New Stat Card
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="stat-card-builder-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Edit Stat Card" : "Create New Stat Card"}
            </DialogTitle>
            <DialogDescription>
              {editingCard 
                ? "Modify the stat card configuration below"
                : "Configure your custom dashboard stat card"
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="calculation">Calculation</TabsTrigger>
              <TabsTrigger value="styling">Styling</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-title">Card Title *</Label>
                <Input
                  id="card-title"
                  placeholder="e.g., Monthly Growth"
                  value={statConfig.title}
                  onChange={(e) => setStatConfig({ ...statConfig, title: e.target.value })}
                  data-testid="card-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-icon">Icon</Label>
                <Select
                  value={statConfig.icon}
                  onValueChange={(value) => setStatConfig({ ...statConfig, icon: value })}
                >
                  <SelectTrigger data-testid="card-icon-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TrendingUp">Trending Up</SelectItem>
                    <SelectItem value="FileText">File Text</SelectItem>
                    <SelectItem value="Building2">Building</SelectItem>
                    <SelectItem value="Calculator">Calculator</SelectItem>
                    <SelectItem value="BarChart3">Bar Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="calculation" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stat-type">Calculation Type</Label>
                <Select
                  value={statConfig.statType}
                  onValueChange={(value) => setStatConfig({ ...statConfig, statType: value })}
                >
                  <SelectTrigger data-testid="stat-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {statConfig.statType !== "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="data-source">Data Source</Label>
                  <Select
                    value={statConfig.dataSource}
                    onValueChange={(value) => setStatConfig({ ...statConfig, dataSource: value })}
                  >
                    <SelectTrigger data-testid="data-source-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue Data</SelectItem>
                      <SelectItem value="entries">Entry Count</SelectItem>
                      <SelectItem value="restaurants">Restaurant Count</SelectItem>
                      <SelectItem value="employees">Employee Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {statConfig.statType === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-value">Custom Value</Label>
                  <Input
                    id="custom-value"
                    type="number"
                    placeholder="Enter custom value"
                    value={statConfig.customValue}
                    onChange={(e) => setStatConfig({ ...statConfig, customValue: e.target.value })}
                    data-testid="custom-value-input"
                  />
                </div>
              )}

              {statConfig.statType === "target" && (
                <div className="space-y-2">
                  <Label htmlFor="target-value">Target Value (Financial Year Goal)</Label>
                  <Input
                    id="target-value"
                    type="number"
                    placeholder="Enter target value"
                    value={statConfig.targetValue}
                    onChange={(e) => setStatConfig({ ...statConfig, targetValue: e.target.value })}
                    data-testid="target-value-input"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Set your goal for the financial year. Progress will be calculated automatically.
                  </p>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Preview Value</h4>
                <div className="text-2xl font-bold text-blue-800">
                  {statConfig.statType === "percentage" ? (
                    `${calculateStatValue(statConfig).toFixed(1)}%`
                  ) : (statConfig.dataSource === "revenue" || statConfig.statType === "custom") && statConfig.dataSource !== "employees" ? (
                    <CurrencyDisplay amount={calculateStatValue(statConfig)} />
                  ) : (
                    calculateStatValue(statConfig).toLocaleString()
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="styling" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-color">Card Color</Label>
                <Select
                  value={statConfig.color}
                  onValueChange={(value) => setStatConfig({ ...statConfig, color: value })}
                >
                  <SelectTrigger data-testid="card-color-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-size">Value Text Size</Label>
                <Select
                  value={statConfig.textSize}
                  onValueChange={(value) => setStatConfig({ ...statConfig, textSize: value })}
                >
                  <SelectTrigger data-testid="text-size-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text-xl">Small</SelectItem>
                    <SelectItem value="text-2xl">Medium</SelectItem>
                    <SelectItem value="text-3xl">Large</SelectItem>
                    <SelectItem value="text-4xl">Extra Large</SelectItem>
                    <SelectItem value="text-5xl">XXL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Preview</h4>
                {/* Render preview card */}
                <div className={`p-4 rounded-lg shadow-lg bg-gradient-to-br ${CARD_COLORS.find(c => c.value === statConfig.color)?.from} ${CARD_COLORS.find(c => c.value === statConfig.color)?.to}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">{statConfig.title || "Card Title"}</h3>
                    <div className={`w-8 h-8 rounded-lg ${CARD_COLORS.find(c => c.value === statConfig.color)?.icon} flex items-center justify-center`}>
                      {(() => {
                        const IconComponent = getIconComponent(statConfig.icon);
                        return <IconComponent className="w-4 h-4 text-white" />;
                      })()}
                    </div>
                  </div>
                  {statConfig.statType === "target" && statConfig.targetValue ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Achieved: {calculateStatValue(statConfig).toLocaleString()}</span>
                        <span>Target: {parseFloat(statConfig.targetValue).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(calculateTargetProgress(statConfig), 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-center text-sm font-semibold">
                        {calculateTargetProgress(statConfig).toFixed(1)}% Complete
                      </div>
                    </div>
                  ) : (
                    <div className={`${statConfig.textSize} font-bold text-gray-900`}>
                      {statConfig.statType === "percentage" ? (
                        `${calculateStatValue(statConfig).toFixed(1)}%`
                      ) : (statConfig.dataSource === "revenue" || statConfig.statType === "custom") && statConfig.dataSource !== "employees" ? (
                        <CurrencyDisplay amount={calculateStatValue(statConfig)} />
                      ) : (
                        calculateStatValue(statConfig).toLocaleString()
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!statConfig.title}
              className="bg-gradient-to-r from-blue-600 to-green-600"
              data-testid="create-stat-card-button"
            >
              {editingCard ? "Update Card" : "Create Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Display Custom Stat Cards */}
      {customStatCards.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {customStatCards.map((card) => {
            const colorConfig = CARD_COLORS.find(c => c.value === card.color);
            const IconComponent = getIconComponent(card.icon);
            
            return (
              <Card key={card.id} className={`shadow-lg border-0 bg-gradient-to-br ${colorConfig.from} ${colorConfig.to}`} data-testid={`custom-stat-card-${card.id}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {card.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl ${colorConfig.icon} flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`stat-card-menu-${card.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleClone(card)} className="gap-2">
                          <Copy className="w-4 h-4" />
                          Clone Card
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(card)} className="gap-2">
                          <Edit className="w-4 h-4" />
                          Edit Card
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(card)} className="gap-2">
                          <Download className="w-4 h-4" />
                          Download Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDeleteDialog(card.id)} className="gap-2 text-red-600">
                          <Trash2 className="w-4 h-4" />
                          Delete Card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {card.statType === "target" ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Achieved:</span>
                        <div className="text-xl font-bold text-gray-900">
                          {card.dataSource === "revenue" ? (
                            <CurrencyDisplay amount={calculateStatValue(card)} />
                          ) : (
                            calculateStatValue(card).toLocaleString()
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">Target:</span>
                        <div className="text-xl font-bold text-gray-700">
                          {card.dataSource === "revenue" ? (
                            <CurrencyDisplay amount={parseFloat(card.targetValue)} />
                          ) : (
                            parseFloat(card.targetValue).toLocaleString()
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>Progress</span>
                          <span className="font-semibold">{calculateTargetProgress(card).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              calculateTargetProgress(card) >= 100 ? 'bg-green-600' :
                              calculateTargetProgress(card) >= 75 ? 'bg-blue-600' :
                              calculateTargetProgress(card) >= 50 ? 'bg-yellow-600' :
                              'bg-orange-600'
                            }`}
                            style={{ width: `${Math.min(calculateTargetProgress(card), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`${card.textSize} font-bold text-gray-900`} data-testid={`stat-card-value-${card.id}`}>
                      {card.statType === "percentage" ? (
                        `${calculateStatValue(card).toFixed(1)}%`
                      ) : (card.dataSource === "revenue" || card.statType === "custom") && card.dataSource !== "employees" ? (
                        <CurrencyDisplay amount={calculateStatValue(card)} />
                      ) : (
                        calculateStatValue(card).toLocaleString()
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open, cardId: null })}>
        <AlertDialogContent data-testid="delete-stat-card-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stat Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stat card? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-stat-card">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialog.cardId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-stat-card"
            >
              Delete Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StatCardManager;