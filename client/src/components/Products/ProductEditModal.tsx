import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { Product, WeightPrice, InventoryItem, SupplierCostItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash, Upload, Plus } from "lucide-react";

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (product: Product) => Promise<void>;
  isNew?: boolean;
}

export default function ProductEditModal({
  isOpen,
  onClose,
  product,
  onSave,
  isNew = false
}: ProductEditModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    description: "",
    sku: "",
    price: "",
    category: "",
    weight: "",
    stock: 0,
    lowStockThreshold: 5,
    image: "",
    imageAlt: "",
    status: "active",
    trackInventory: true,
    weightOptions: [],
    allWeights: "",
  });
  
  const [weightInputs, setWeightInputs] = useState<WeightPrice[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [supplierCostItems, setSupplierCostItems] = useState<SupplierCostItem[]>([]);

  useEffect(() => {
    if (product && !isNew) {
      setFormData({
        ...product,
      });
      
      // Initialize weight inputs from weightOptions if available
      if (product.weightOptions && product.weightOptions.length > 0) {
        setWeightInputs(product.weightOptions);
      } else if (product.weight && product.price) {
        // If no weight options but we have a single weight/price
        setWeightInputs([{ weight: product.weight, price: product.price }]);
      } else {
        setWeightInputs([{ weight: "", price: "" }]);
      }
      
      // Initialize inventory items from product.inventory or create defaults from weight options
      if (product.inventory && product.inventory.length > 0) {
        setInventoryItems(product.inventory);
      } else if (product.weightOptions && product.weightOptions.length > 0) {
        // Create default inventory based on weight options with 0 quantity
        setInventoryItems(product.weightOptions.map(option => ({
          weight: option.weight,
          quantity: 0
        })));
      } else if (product.weight) {
        // If we only have a single weight
        setInventoryItems([{ weight: product.weight, quantity: 0 }]);
      } else {
        setInventoryItems([]);
      }
      
      // Initialize supplier cost items from product.supplierCost or create defaults from weight options
      if (product.supplierCost && product.supplierCost.length > 0) {
        setSupplierCostItems(product.supplierCost);
      } else if (product.weightOptions && product.weightOptions.length > 0) {
        // Create default supplier cost based on weight options with 0 cost
        setSupplierCostItems(product.weightOptions.map(option => ({
          weight: option.weight,
          cost: 0
        })));
      } else if (product.weight) {
        // If we only have a single weight
        setSupplierCostItems([{ weight: product.weight, cost: 0 }]);
      } else {
        setSupplierCostItems([]);
      }
    } else {
      // Reset form for new product
      setFormData({
        name: "",
        description: "",
        sku: "",
        price: "",
        category: "",
        weight: "",
        stock: 0,
        lowStockThreshold: 5,
        image: "",
        imageAlt: "",
        status: "active",
        trackInventory: true,
        weightOptions: [],
        allWeights: "",
      });
      
      // Initialize with one empty weight input for new products
      setWeightInputs([{ weight: "", price: "" }]);
      
      // Initialize with empty inventory for new products
      setInventoryItems([]);
    }
  }, [product, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Handle changes to weight input fields
  const handleWeightInputChange = (index: number, field: 'weight' | 'price', value: string) => {
    const updatedInputs = [...weightInputs];
    updatedInputs[index] = { 
      ...updatedInputs[index], 
      [field]: value 
    };
    setWeightInputs(updatedInputs);
    
    // If the weight changes, we need to update the corresponding inventory item
    if (field === 'weight') {
      const oldWeight = inventoryItems.find(item => item.weight === weightInputs[index].weight);
      const quantity = oldWeight ? oldWeight.quantity : 0;
      
      // Update the inventory item with the new weight
      updateInventoryItem(index, value, quantity);
    }
  };
  
  // Handle changes to inventory quantities
  const handleInventoryChange = (index: number, quantity: number) => {
    const updatedInventory = [...inventoryItems];
    if (index < updatedInventory.length) {
      updatedInventory[index] = {
        ...updatedInventory[index],
        quantity
      };
    } else {
      // If we're adding a new inventory item for a weight
      const weight = index < weightInputs.length ? weightInputs[index].weight : '';
      updatedInventory.push({ weight, quantity });
    }
    setInventoryItems(updatedInventory);
  };
  
  // Handle changes to supplier costs
  const handleSupplierCostChange = (index: number, value: string) => {
    const updatedCosts = [...supplierCostItems];
    
    // Get the weight for this index
    const weight = index < weightInputs.length ? weightInputs[index].weight : '';
    
    // Convert value to number only for storage, preserve empty string for display
    const cost = value === '' ? 0 : parseFloat(value);
    
    // Find the item by weight
    const existingIndex = updatedCosts.findIndex(item => item.weight === weight);
    
    if (existingIndex >= 0) {
      // Update existing item
      updatedCosts[existingIndex] = {
        ...updatedCosts[existingIndex],
        cost,
        // Store raw input value for display purposes
        _rawInput: value
      };
    } else if (index < updatedCosts.length) {
      // Update by index if weight doesn't match
      updatedCosts[index] = {
        ...updatedCosts[index],
        weight,
        cost,
        _rawInput: value
      };
    } else {
      // Add new item
      updatedCosts.push({ 
        weight, 
        cost,
        _rawInput: value
      });
    }
    
    setSupplierCostItems(updatedCosts);
  };
  
  // Update an inventory item for a weight
  const updateInventoryItem = (index: number, weight: string, quantity: number) => {
    const updatedInventory = [...inventoryItems];
    
    // Find if there's already an item with this weight
    const existingIndex = updatedInventory.findIndex(item => item.weight === weight);
    
    if (existingIndex >= 0) {
      // Update existing item
      updatedInventory[existingIndex].quantity = quantity;
    } else {
      // If not found but index exists, update that index
      if (index < updatedInventory.length) {
        updatedInventory[index] = { weight, quantity };
      } else {
        // Add new item
        updatedInventory.push({ weight, quantity });
      }
    }
    
    setInventoryItems(updatedInventory);
    
    // Also update supplier cost item's weight to match
    updateSupplierCostItem(index, weight);
  };
  
  // Update a supplier cost item for a weight
  const updateSupplierCostItem = (index: number, weight: string) => {
    const updatedCosts = [...supplierCostItems];
    
    // Find if there's already an item with this weight
    const existingIndex = updatedCosts.findIndex(item => item.weight === weight);
    const existingCost = existingIndex >= 0 ? updatedCosts[existingIndex].cost : 0;
    
    if (existingIndex >= 0) {
      // Already exists, don't update the cost value, just ensure weight matches
      // We keep the existing cost value to avoid losing data
    } else {
      // If not found but index exists, update that index
      if (index < updatedCosts.length) {
        // Keep the existing cost value, just update the weight
        updatedCosts[index] = { 
          weight, 
          cost: updatedCosts[index].cost 
        };
      } else {
        // Add new item with default cost of 0
        updatedCosts.push({ weight, cost: 0 });
      }
    }
    
    setSupplierCostItems(updatedCosts);
  };
  
  // Add a new weight option input
  const addWeightOption = () => {
    setWeightInputs([...weightInputs, { weight: "", price: "" }]);
    // We don't need to add a new inventory item yet since we don't know the weight
  };
  
  // Remove a weight option input
  const removeWeightOption = (index: number) => {
    if (weightInputs.length > 1) {
      const weightToRemove = weightInputs[index].weight;
      
      // Remove the weight from weight options
      const updatedInputs = weightInputs.filter((_, i) => i !== index);
      setWeightInputs(updatedInputs);
      
      // Also remove this weight from inventory items
      if (weightToRemove) {
        const updatedInventory = inventoryItems.filter(item => item.weight !== weightToRemove);
        setInventoryItems(updatedInventory);
        
        // Also remove this weight from supplier cost items
        const updatedCosts = supplierCostItems.filter(item => item.weight !== weightToRemove);
        setSupplierCostItems(updatedCosts);
      }
    } else {
      toast({
        title: "Cannot Remove",
        description: "Product must have at least one weight option",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive"
      });
      return;
    }
    
    // Filter out empty weight options
    const validWeightOptions = weightInputs.filter(
      option => option.weight.trim() !== "" && option.price.trim() !== ""
    );
    
    if (validWeightOptions.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one valid weight and price option is required",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Update the primary weight and price to be the first one in the list
      const primaryOption = validWeightOptions[0];
      
      // Create allWeights string from weight options
      const allWeightsArray = validWeightOptions.map(option => option.weight);
      
      // Process inventory items - only include items for valid weights
      const validInventoryItems = inventoryItems
        .filter(item => validWeightOptions.some(option => option.weight === item.weight))
        .map(item => ({
          weight: item.weight,
          quantity: item.quantity
        }));
        
      // Make sure all weights have corresponding inventory items
      validWeightOptions.forEach(option => {
        const hasInventory = validInventoryItems.some(item => item.weight === option.weight);
        if (!hasInventory) {
          // Add default inventory for this weight if missing
          validInventoryItems.push({
            weight: option.weight,
            quantity: 0
          });
        }
      });
      
      // Process supplier cost items - only include items for valid weights
      const validSupplierCostItems = supplierCostItems
        .filter(item => validWeightOptions.some(option => option.weight === item.weight))
        .map(item => ({
          weight: item.weight,
          cost: item.cost
        }));
        
      // Make sure all weights have corresponding supplier cost items
      validWeightOptions.forEach(option => {
        const hasSupplierCost = validSupplierCostItems.some(item => item.weight === option.weight);
        if (!hasSupplierCost) {
          // Add default supplier cost for this weight if missing
          validSupplierCostItems.push({
            weight: option.weight,
            cost: 0
          });
        }
      });
      
      // Calculate total stock from inventory items
      const totalStock = validInventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Prepare the updated form data with weight options, inventory, and supplier costs
      const updatedFormData = {
        ...formData,
        weight: primaryOption.weight, // Primary weight
        price: primaryOption.price,   // Primary price
        weightOptions: validWeightOptions,
        allWeights: allWeightsArray.join(", "),
        inventory: validInventoryItems,
        supplierCost: validSupplierCostItems,
        stock: totalStock // Set stock based on sum of inventory quantities
      };
      
      // Use the existing ID if editing
      const productToSave = isNew 
        ? updatedFormData as Product
        : { ...updatedFormData, id: product?.id } as Product;
        
      await onSave(productToSave);
      
      toast({
        title: "Success",
        description: isNew ? "Product created successfully" : "Product updated successfully",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: `Failed to ${isNew ? 'create' : 'update'} product. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {isNew ? "Add New Product" : "Edit Product"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku || ""}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description || ""}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => handleSelectChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Peptide">Peptide</SelectItem>
                    <SelectItem value="Supplement">Supplement</SelectItem>
                    <SelectItem value="Peptide Blend">Peptide Blend</SelectItem>
                    <SelectItem value="Accessory">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || "active"}
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Pricing and Inventory */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between">
              <h3 className="font-medium text-gray-900">Pricing and Inventory</h3>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={addWeightOption}
                className="flex items-center text-blue-600"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Weight Option
              </Button>
            </div>
            
            {/* Weight and Price Options */}
            <div className="space-y-4 border rounded-md p-4 bg-gray-50">
              <Label className="text-sm font-medium mb-2 block">Weight & Price Options</Label>
              {weightInputs.map((option, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded border">
                  <div className="col-span-2">
                    <Label htmlFor={`weight-${index}`} className="text-xs mb-1 block">Weight</Label>
                    <Input
                      id={`weight-${index}`}
                      value={option.weight}
                      onChange={(e) => handleWeightInputChange(index, 'weight', e.target.value)}
                      placeholder="e.g. 5mg"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor={`price-${index}`} className="text-xs mb-1 block">Price ($)</Label>
                    <Input
                      id={`price-${index}`}
                      value={option.price}
                      onChange={(e) => handleWeightInputChange(index, 'price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor={`supplier-cost-${index}`} className="text-xs mb-1 block">Cost ($)</Label>
                    <Input
                      id={`supplier-cost-${index}`}
                      type="text"
                      value={
                        // Use the raw input value if available, or convert cost to string
                        (supplierCostItems.find(item => item.weight === option.weight) as any)?._rawInput || 
                        // Fallback to empty string for zero values
                        (() => {
                          const cost = supplierCostItems.find(item => item.weight === option.weight)?.cost;
                          return (cost === 0 || cost === undefined) ? "" : cost?.toString() || "";
                        })()
                      }
                      onChange={(e) => {
                        // Allow empty string, decimal numbers, and numbers
                        const value = e.target.value;
                        
                        // Accept empty string, or valid decimal number format
                        if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                          handleSupplierCostChange(index, value);
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor={`profit-margin-${index}`} className="text-xs mb-1 block">Margin (%)</Label>
                    <Input
                      id={`profit-margin-${index}`}
                      readOnly
                      className="bg-gray-50"
                      value={(() => {
                        const price = parseFloat(option.price) || 0;
                        const cost = supplierCostItems.find(item => item.weight === option.weight)?.cost || 0;
                        if (cost === 0 || price === 0) return "N/A";
                        if (cost >= price) return "0.00%";
                        const margin = ((price - cost) / price) * 100;
                        return margin.toFixed(2) + "%";
                      })()}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor={`inventory-${index}`} className="text-xs mb-1 block">Inventory</Label>
                    <Input
                      id={`inventory-${index}`}
                      type="number"
                      min="0"
                      value={
                        inventoryItems.find(item => item.weight === option.weight)?.quantity || 0
                      }
                      onChange={(e) => handleInventoryChange(
                        index, 
                        parseInt(e.target.value) || 0
                      )}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-2 flex items-end justify-end h-full">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWeightOption(index)}
                      className="text-red-500 h-8 px-2"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">
                The first weight option will be used as the default price shown in listings.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold || 5}
                  onChange={handleNumberChange}
                />
                <p className="text-xs text-gray-500">Applied to all weight options</p>
              </div>
              
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trackInventory"
                    checked={formData.trackInventory || false}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange("trackInventory", checked as boolean)
                    }
                  />
                  <Label htmlFor="trackInventory">Track inventory for this product</Label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Product Image */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-900">Product Image</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {formData.image ? (
                  <img 
                    src={formData.image} 
                    alt={formData.imageAlt || formData.name} 
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 rounded-lg mb-4">
                    No image
                  </div>
                )}
                <div className="flex space-x-2 mt-2">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <div className="flex">
                      <Input 
                        id="image"
                        name="image"
                        value={formData.image || ""}
                        onChange={handleChange}
                        placeholder="Enter image URL"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageAlt">Alt Text</Label>
                <Input
                  id="imageAlt"
                  name="imageAlt"
                  value={formData.imageAlt || ""}
                  onChange={handleChange}
                  placeholder="Descriptive text for the image"
                />
                
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Image requirements:</p>
                  <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
                    <li>Minimum dimensions: 800x800 pixels</li>
                    <li>Maximum file size: 5MB</li>
                    <li>Accepted formats: JPG, PNG</li>
                    <li>For best results, use a square image</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <DialogFooter className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner mr-2" />
                  Saving...
                </>
              ) : (
                isNew ? "Create Product" : "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
