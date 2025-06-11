import { Order, Product, CartItem } from '@shared/schema';

// Airtable API base URL
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

// Default API key from environment or fallback
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || "pat6dBso3pq5xXMHv.dc9f214c727f6ba8c98be036d33cfec611fcfd28d582a9ce4581f9ca7ba05f8d";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appQbeYz1b0YDv6oJ";

// Function to make authenticated Airtable API requests
async function fetchFromAirtable(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  data?: any
): Promise<any> {
  try {
    const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API error: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from Airtable:', error);
    throw error;
  }
}

// Order-related functions

export async function fetchOrders(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
} = {}): Promise<{ records: any[]; total: number }> {
  const { page = 1, limit = 10, status, search } = options;
  
  let filterByFormula = '';
  if (status) {
    filterByFormula = `?filterByFormula={status}="${status}"`;
  }
  
  // Note: Airtable doesn't directly support search across fields, so this would be
  // more complex in a real implementation

  const response = await fetchFromAirtable(`/carts${filterByFormula}`);
  
  // Manual pagination since we're fetching all records
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRecords = response.records.slice(startIndex, endIndex);
  
  return {
    records: paginatedRecords,
    total: response.records.length,
  };
}

export async function fetchOrderById(id: string): Promise<any> {
  return fetchFromAirtable(`/carts/${id}`);
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<any> {
  const fields: Record<string, any> = {};
  
  // Map the schema property names to Airtable field names
  if (updates.status) fields.status = updates.status;
  if (updates.firstname) fields.firstname = updates.firstname;
  if (updates.lastname) fields.lastname = updates.lastname;
  if (updates.email) fields.email = updates.email;
  if (updates.phone) fields.phone = updates.phone;
  if (updates.address) fields.address = updates.address;
  if (updates.city) fields.city = updates.city;
  if (updates.state) fields.state = updates.state;
  if (updates.zip) fields.zip = updates.zip;
  if (updates.shippingMethod) fields.shippingmethod = updates.shippingMethod;
  if (updates.total) fields.total = updates.total;
  
  const data = { fields };
  return fetchFromAirtable(`/carts/${id}`, 'PATCH', data);
}

// Product-related functions - these would be implemented when the API is ready

export async function fetchProducts(options: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
} = {}): Promise<{ records: any[]; total: number }> {
  // In a real implementation, this would fetch from the products table
  // For now, returning mock data
  const mockProducts = [
    {
      id: '1',
      fields: {
        name: "BPC-157",
        description: "BPC-157 is a synthetic peptide fragment derived from a naturally occurring protein found in gastric juice.",
        sku: "BPC-5MG",
        price: "78.99",
        category: "Peptide",
        weight: "5mg",
        stock: 25,
        lowStockThreshold: 5,
        image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        imageAlt: "BPC-157 Peptide 5mg vial",
        status: "active",
        trackInventory: true,
      }
    },
    {
      id: '2',
      fields: {
        name: "NAD+",
        description: "NAD+ is a critical coenzyme found in all living cells, playing a key role in energy metabolism.",
        sku: "NAD-100MG",
        price: "124.99",
        category: "Supplement",
        weight: "100mg",
        stock: 18,
        lowStockThreshold: 5,
        image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        imageAlt: "NAD+ Supplement 100mg vial",
        status: "active",
        trackInventory: true,
      }
    },
    {
      id: '3',
      fields: {
        name: "AOD-9604",
        description: "AOD-9604 is a synthetic peptide fragment derived from human growth hormone.",
        sku: "AOD-10MG",
        price: "89.99",
        category: "Peptide",
        weight: "10mg",
        stock: 3,
        lowStockThreshold: 5,
        image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        imageAlt: "AOD-9604 Peptide 10mg vial",
        status: "active",
        trackInventory: true,
      }
    },
    {
      id: '4',
      fields: {
        name: "BPC-157 / TB-500",
        description: "BPC-157/TB-500 is a synthetic peptide blend combining two potent compounds.",
        sku: "BPC-TB-5MG",
        price: "112.99",
        category: "Peptide Blend",
        weight: "5mg",
        stock: 15,
        lowStockThreshold: 5,
        image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200",
        imageAlt: "BPC-157/TB-500 Blend 5mg vial",
        status: "active",
        trackInventory: true,
      }
    },
  ];
  
  const { page = 1, limit = 10, category, search } = options;
  
  // Filter by category if provided
  let filteredProducts = mockProducts;
  if (category) {
    filteredProducts = mockProducts.filter(p => 
      p.fields.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Filter by search term if provided
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.fields.name.toLowerCase().includes(searchLower) || 
      p.fields.description.toLowerCase().includes(searchLower)
    );
  }
  
  // Manual pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRecords = filteredProducts.slice(startIndex, endIndex);
  
  return {
    records: paginatedRecords,
    total: filteredProducts.length,
  };
}

export async function fetchProductById(id: string): Promise<any> {
  // In a real implementation, this would fetch a single product
  const { records } = await fetchProducts();
  return records.find(record => record.id === id);
}

export async function createProduct(product: Partial<Product>): Promise<any> {
  // In a real implementation, this would create a product in Airtable
  const fields: Record<string, any> = {};
  
  if (product.name) fields.name = product.name;
  if (product.description) fields.description = product.description;
  if (product.sku) fields.sku = product.sku;
  if (product.price) fields.price = product.price;
  if (product.category) fields.category = product.category;
  if (product.weight) fields.weight = product.weight;
  if (product.stock !== undefined) fields.stock = product.stock;
  if (product.lowStockThreshold !== undefined) fields.lowStockThreshold = product.lowStockThreshold;
  if (product.image) fields.image = product.image;
  if (product.imageAlt) fields.imageAlt = product.imageAlt;
  if (product.status) fields.status = product.status;
  if (product.trackInventory !== undefined) fields.trackInventory = product.trackInventory;
  
  const data = { fields };
  // This would be the actual implementation once the products table is set up
  // return fetchFromAirtable('/products', 'POST', data);
  
  // For now, mock a successful response
  return {
    id: Math.floor(Math.random() * 1000).toString(),
    fields: data.fields,
    createdTime: new Date().toISOString()
  };
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<any> {
  // Similar to createProduct, this would update an existing product
  const fields: Record<string, any> = {};
  
  if (updates.name) fields.name = updates.name;
  if (updates.description) fields.description = updates.description;
  if (updates.sku) fields.sku = updates.sku;
  if (updates.price) fields.price = updates.price;
  if (updates.category) fields.category = updates.category;
  if (updates.weight) fields.weight = updates.weight;
  if (updates.stock !== undefined) fields.stock = updates.stock;
  if (updates.lowStockThreshold !== undefined) fields.lowStockThreshold = updates.lowStockThreshold;
  if (updates.image) fields.image = updates.image;
  if (updates.imageAlt) fields.imageAlt = updates.imageAlt;
  if (updates.status) fields.status = updates.status;
  if (updates.trackInventory !== undefined) fields.trackInventory = updates.trackInventory;
  
  const data = { fields };
  // This would be the actual implementation
  // return fetchFromAirtable(`/products/${id}`, 'PATCH', data);
  
  // For now, mock a successful response
  return {
    id,
    fields: data.fields,
    createdTime: new Date().toISOString()
  };
}

export async function deleteProduct(id: string): Promise<any> {
  // This would delete a product
  // return fetchFromAirtable(`/products/${id}`, 'DELETE');
  
  // Mock successful deletion
  return { id, deleted: true };
}

// Dashboard-related functions

export async function fetchDashboardStats(): Promise<any> {
  // This would fetch various stats for the dashboard
  const ordersResponse = await fetchFromAirtable('/carts');
  
  // Calculate stats from the orders
  const orders = ordersResponse.records || [];
  
  // Count total orders
  const totalOrders = orders.length;
  
  // Calculate total revenue
  const totalRevenue = orders.reduce((sum: number, order: any) => {
    const total = parseFloat(order.fields.total || order.fields.totalammount || '0');
    return sum + (isNaN(total) ? 0 : total);
  }, 0);
  
  // Count unique customers
  const uniqueCustomers = new Set();
  orders.forEach((order: any) => {
    if (order.fields.email) {
      uniqueCustomers.add(order.fields.email);
    }
  });
  
  // For products and low stock, using mock data until we have the products table
  const totalProducts = 12;
  const lowStockProducts = 2;
  
  return {
    totalOrders,
    totalRevenue,
    activeCustomers: uniqueCustomers.size,
    totalProducts,
    lowStockProducts
  };
}

export async function fetchSalesData(): Promise<any> {
  // This would fetch sales data for charts
  // For now, using mock data
  
  // Generate daily sales for last 7 days
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailySales = days.map(day => ({
    day,
    amount: Math.floor(Math.random() * 500) + 100
  }));
  
  // Calculate weekly total
  const weeklySales = dailySales.reduce((sum, day) => sum + day.amount, 0);
  
  // Mock average order value
  const avgOrderValue = Math.floor(weeklySales / 7);
  
  return {
    weeklySales,
    avgOrderValue,
    dailySales
  };
}

export async function fetchPopularProducts(): Promise<any> {
  // This would fetch the most popular products
  // For now, return the mock products
  const { records } = await fetchProducts();
  return records;
}

// Helper functions to convert between Airtable format and our schema format

export function mapAirtableOrderToSchema(record: any): Order {
  const fields = record.fields;
  
  // Parse cart items if they exist
  let cartItems: CartItem[] = [];
  try {
    if (fields.cartitems) {
      cartItems = JSON.parse(fields.cartitems);
    }
  } catch (error) {
    console.error('Error parsing cart items:', error);
  }
  
  return {
    id: record.id,
    sessionId: fields.sessionid || '',
    checkoutId: fields.checkoutid || '',
    firstname: fields.firstname || '',
    lastname: fields.lastname || '',
    email: fields.email || '',
    phone: fields.phone || '',
    address: fields.address || '',
    city: fields.city || '',
    state: fields.state || '',
    zip: fields.zip || '',
    shippingMethod: fields.shippingmethod || '',
    status: fields.status || '',
    cartItems,
    total: fields.totalammount || fields.total || '0',
    createdAt: new Date(fields.createdat || fields['created at'] || Date.now()),
    updatedAt: new Date(fields.updatedat || fields['updated at'] || Date.now()),
  };
}

export function mapAirtableProductToSchema(record: any): Product {
  const fields = record.fields;
  
  return {
    id: parseInt(record.id),
    name: fields.name || '',
    description: fields.description || '',
    sku: fields.sku || '',
    price: fields.price || '',
    category: fields.category || '',
    weight: fields.weight || '',
    stock: typeof fields.stock === 'number' ? fields.stock : 0,
    lowStockThreshold: typeof fields.lowStockThreshold === 'number' ? fields.lowStockThreshold : 5,
    image: fields.image || '',
    imageAlt: fields.imageAlt || '',
    status: fields.status || 'active',
    trackInventory: fields.trackInventory !== false,
    createdAt: new Date(fields.createdAt || Date.now()),
    updatedAt: new Date(fields.updatedAt || Date.now()),
  };
}

// Affiliate-related functions

export async function fetchAffiliates(options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
} = {}): Promise<{ records: any[]; total: number }> {
  const { page = 1, limit = 10, search, status } = options;
  
  let filterByFormula = '';
  if (search) {
    // Search across First Name, Last Name, Email, and Code fields + filter for valid emails
    filterByFormula = `?filterByFormula=AND(NOT({Email}=""), OR(FIND(LOWER("${search}"),LOWER({First Name})),FIND(LOWER("${search}"),LOWER({Last Name})),FIND(LOWER("${search}"),LOWER({Email})),FIND(LOWER("${search}"),LOWER({Code}))))`;
  } else {
    // Only show affiliates with emails
    filterByFormula = `?filterByFormula=NOT({Email}="")`;
  }
  
  const response = await fetchFromAirtable(`/tblbQbjX0RQbguX5e${filterByFormula}`);
  
  // Get all orders to check affiliate activity in the last 30 days
  const ordersResponse = await fetchFromAirtable('/tblhjfzTX2zjf22s1?filterByFormula=AND({status}="payment_selection", {affiliatecode}!="")');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Add status to each affiliate record
  const enhancedRecords = response.records.map((affiliate: any) => {
    const affiliateCode = affiliate.fields.Code;
    const hasRecentOrder = ordersResponse.records.some((order: any) => {
      const orderDate = new Date(order.fields.createdat);
      return order.fields.affiliatecode === affiliateCode && orderDate >= thirtyDaysAgo;
    });
    
    return {
      ...affiliate,
      fields: {
        ...affiliate.fields,
        status: hasRecentOrder ? 'Active' : 'Inactive'
      }
    };
  });
  
  // Filter by status if specified
  const filteredRecords = status ? 
    enhancedRecords.filter((affiliate: any) => affiliate.fields.status.toLowerCase() === status.toLowerCase()) :
    enhancedRecords;
  
  // Manual pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
  
  return {
    records: paginatedRecords,
    total: filteredRecords.length,
  };
}

export async function fetchAffiliateById(id: string): Promise<any> {
  return fetchFromAirtable(`/tblbQbjX0RQbguX5e/${id}`);
}

export async function fetchOrdersByAffiliateCode(affiliateCode: string, options: {
  page?: number;
  limit?: number;
} = {}): Promise<{ records: any[]; total: number }> {
  const { page = 1, limit = 10 } = options;
  
  // Filter orders by affiliate code AND payment_selection status
  const filterByFormula = `?filterByFormula=AND({affiliatecode}="${affiliateCode}", {status}="payment_selection")`;
  
  const response = await fetchFromAirtable(`/tblhjfzTX2zjf22s1${filterByFormula}`);
  
  // Fetch all products once to avoid rate limiting
  let allProducts: any[] = [];
  try {
    const allProductsResponse = await fetchFromAirtable('/tbl4pJbIUvWA53Arr');
    allProducts = allProductsResponse.records;
  } catch (error) {
    console.error('Error fetching all products:', error);
  }

  // Enhance cart items with complete product data
  const enhancedRecords = response.records.map((record: any) => {
    if (record.fields.cartitems) {
      try {
        const cartItems = JSON.parse(record.fields.cartitems);
        
        // Enhance cart items with product data from cached products
        const enhancedCartItems = cartItems.map((item: any) => {
          if (item.productId) {
            const productResponse = allProducts.find((p: any) => p.fields.id === item.productId);
            
            if (productResponse && productResponse.fields) {
              // Get price based on selected weight
              let weightPrice = '0';
              if (item.selectedWeight) {
                const weightKey = `price${item.selectedWeight}`;
                weightPrice = productResponse.fields[weightKey] || productResponse.fields.price || '0';
              } else {
                weightPrice = productResponse.fields.price || '0';
              }
              
              return {
                ...item,
                product: {
                  ...item.product,
                  id: item.productId,
                  name: productResponse.fields.name || item.product?.name,
                  price: weightPrice,
                  type: productResponse.fields.type || 'standard'
                }
              };
            } else {
              console.log(`Product not found for ID ${item.productId}, using original data`);
              return item;
            }
          }
          return item;
        });
        
        return {
          ...record,
          fields: {
            ...record.fields,
            cartitems: JSON.stringify(enhancedCartItems)
          }
        };
      } catch (error) {
        console.error('Error parsing/enhancing cart items:', error);
        return record;
      }
    }
    return record;
  });
  
  // Manual pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRecords = enhancedRecords.slice(startIndex, endIndex);
  
  return {
    records: paginatedRecords,
    total: enhancedRecords.length,
  };
}

export async function getAffiliateStats(affiliateCode: string): Promise<{
  totalOrders: number;
  totalCommission: number;
  totalSales: number;
}> {
  try {
    // Get affiliate details to access the share rate
    const affiliatesResponse = await fetchAffiliates({ limit: 1000 });
    const affiliate = affiliatesResponse.records.find((aff: any) => aff.fields.Code === affiliateCode);
    const shareRate = affiliate ? parseFloat(affiliate.fields.share || '0') / 100 : 0.1;
    
    const ordersResponse = await fetchOrdersByAffiliateCode(affiliateCode);
    const orders = ordersResponse.records;
    
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum: number, order: any) => {
      const total = parseFloat(order.fields.total || order.fields.totalammount || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);
    
    // Calculate commission based on 85% profit margin of items total (excluding shipping)
    const totalCommission = orders.reduce((sum: number, order: any) => {
      if (!order.fields.cartitems) return sum;
      
      const cartItems = JSON.parse(order.fields.cartitems);
      let itemsTotal = 0;
      
      // Calculate total items cost
      cartItems.forEach((item: any) => {
        const itemPrice = parseFloat(item.product?.price || '0') * item.quantity;
        itemsTotal += itemPrice;
      });
      
      // Apply affiliate discount first
      const affiliateDiscount = parseFloat(affiliate.fields.discount || '0');
      const discountAmount = (itemsTotal * affiliateDiscount) / 100;
      const subtotalAfterDiscount = itemsTotal - discountAmount;
      
      // Apply 85% profit margin to get commission base (company keeps 15% for costs)
      const profitBase = subtotalAfterDiscount * 0.85;
      
      // Calculate affiliate commission from the profit
      const orderCommission = profitBase * shareRate;
      return sum + (isNaN(orderCommission) ? 0 : orderCommission);
    }, 0);
    
    return {
      totalOrders,
      totalCommission,
      totalSales,
    };
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    return {
      totalOrders: 0,
      totalCommission: 0,
      totalSales: 0,
    };
  }
}

export async function createAffiliate(affiliateData: any): Promise<any> {
  const fields: Record<string, any> = {};
  
  // Map the form data to Airtable field names based on the screenshot
  if (affiliateData['First Name']) fields['First Name'] = affiliateData['First Name'];
  if (affiliateData['Last Name']) fields['Last Name'] = affiliateData['Last Name'];
  if (affiliateData.Email) fields.Email = affiliateData.Email;
  if (affiliateData.Phone) fields.Phone = affiliateData.Phone;
  if (affiliateData.Code) fields.Code = affiliateData.Code;
  if (affiliateData.share !== undefined) fields.share = affiliateData.share;
  if (affiliateData.discount !== undefined) fields.discount = affiliateData.discount;
  if (affiliateData['Payout Method']) fields.type = affiliateData['Payout Method'];
  
  // Set default password field as shown in the Airtable
  fields.Password = 'Password';
  
  const data = { fields };
  return fetchFromAirtable('/tblbQbjX0RQbguX5e', 'POST', data);
}
