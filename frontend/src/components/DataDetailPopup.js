import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "./CurrencySettings";
import { Calendar, TrendingUp, Building2, Users, Target } from "lucide-react";
import { formatDateDDMonYYYY } from "../utils/dateFormat";

const DataDetailPopup = ({ isOpen, onClose, data, type = "general" }) => {
  if (!data) return null;

  const renderGeneralDetails = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Restaurant</span>
          </div>
          <p className="text-blue-800">{data.restaurant_name || data.name}</p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-green-800">
            <CurrencyDisplay amount={data.total || data.amount || data.value} />
          </p>
        </div>

        {data.count && (
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-900">Entry Count</span>
            </div>
            <p className="text-xl font-bold text-orange-800">{data.count}</p>
          </div>
        )}

        {(data.date || data.submitted_at) && (
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-900">Date</span>
            </div>
            <p className="text-purple-800">{formatDateDDMonYYYY(data.date || data.submitted_at)}</p>
          </div>
        )}
      </div>

      {data.notes && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
          <p className="text-gray-700">{data.notes}</p>
        </div>
      )}

      {data.submitted_by_username && (
        <div className="p-4 bg-indigo-50 rounded-lg">
          <h4 className="font-medium text-indigo-900 mb-2">Submitted By</h4>
          <p className="text-indigo-800">{data.submitted_by_username}</p>
        </div>
      )}
    </div>
  );

  const renderChartDetails = () => (
    <div className="space-y-4">
      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{data.name}</h3>
        <div className="text-4xl font-bold text-green-600 mb-2">
          <CurrencyDisplay amount={data.value || data.total} />
        </div>
        {data.count && (
          <Badge variant="secondary" className="text-sm">
            {data.count} entries
          </Badge>
        )}
      </div>

      <div className="grid gap-4">
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Performance Metrics
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Average per Entry:</span>
              <span className="font-semibold">
                <CurrencyDisplay 
                  amount={data.count ? (data.value || data.total) / data.count : 0} 
                />
              </span>
            </div>
            {data.percentage && (
              <div className="flex justify-between">
                <span className="text-gray-600">Share of Total:</span>
                <span className="font-semibold text-blue-600">{data.percentage}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTableDetails = () => (
    <div className="space-y-4">
      <div className="text-center p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
        <h3 className="text-xl font-bold text-gray-900">{data.name}</h3>
      </div>

      <div className="grid gap-3">
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <span className="font-medium text-green-900">Total Revenue:</span>
          <span className="text-xl font-bold text-green-700">
            <CurrencyDisplay amount={data.value || data.total} />
          </span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <span className="font-medium text-blue-900">Number of Entries:</span>
          <span className="text-xl font-bold text-blue-700">{data.count || 0}</span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
          <span className="font-medium text-purple-900">Average per Entry:</span>
          <span className="text-xl font-bold text-purple-700">
            <CurrencyDisplay 
              amount={data.count ? (data.value || data.total) / data.count : 0} 
            />
          </span>
        </div>
      </div>

      {data.description && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Description</h4>
          <p className="text-gray-700">{data.description}</p>
        </div>
      )}
    </div>
  );

  const getTitle = () => {
    switch (type) {
      case "chart":
        return "Chart Data Details";
      case "table":
        return "Table Row Details";
      case "kpi":
        return "KPI Details";
      default:
        return "Data Details";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "chart":
        return "Detailed breakdown of the selected chart element";
      case "table":
        return "Complete information for this table row";
      case "kpi":
        return "Comprehensive KPI metrics and performance data";
      default:
        return "Detailed information about this data point";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="data-detail-popup">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {type === "chart" && renderChartDetails()}
          {type === "table" && renderTableDetails()}
          {type === "kpi" && renderChartDetails()}
          {type === "general" && renderGeneralDetails()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataDetailPopup;