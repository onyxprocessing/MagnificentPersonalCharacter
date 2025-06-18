import { users, type User, type InsertUser, Order, Product, InsertProduct, WeightPrice, InventoryItem, SupplierCostItem } from "@shared/schema";
import Airtable from "airtable";

// Interface for query options
interface QueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
}

// Dashboard statistics interface
interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
}

// Sales data interface
interface SalesData {
  weeklySales: number;
  avgOrderValue: number;
  dailySales: { day: string; amount: number }[];
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Order methods
  getOrders(options: QueryOptions): Promise<Order[]>;
  getOrdersCount(status?: string, search?: string): Promise<number>;
  getOrderById(id: string): Promise<Order | null>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | null>;

  // Product methods
  getProducts(options: QueryOptions): Promise<Product[]>;
  getProductsCount(category?: string): Promise<number>;
  getProductById(id: number): Promise<Product | null>;
  getProductSalesData(id: number): Promise<{ totalSales: number, salesByWeight: Record<string, number> }>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | null>;
  deleteProduct(id: number): Promise<void>;

  // Dashboard methods
  getDashboardStats(): Promise<DashboardStats>;
  getSalesData(): Promise<SalesData>;
  getPopularProducts(): Promise<Product[]>;

  // Customer methods
  getCustomersWithOrderInfo(options: QueryOptions): Promise<{ data: any[], total: number }>;
}

// Airtable implementation of storage
export class AirtableStorage implements IStorage {
  private airtable: Airtable.Base;
  private users: Map<number, User>;
  private currentId: number;

  // Helper to parse inventory from Airtable field
  private parseInventoryFromAirtable(inventoryField: any, allWeights: string[]): InventoryItem[] {
    const inventory: InventoryItem[] = [];

    // If there's no inventory field or it's not a string, create default inventory based on weights
    if (!inventoryField || typeof inventoryField !== 'string') {
      return allWeights.map(weight => ({
        weight: weight.trim(),
        quantity: 0
      }));
    }

    try {
      // Try to parse the JSON string
      const parsedInventory = JSON.parse(inventoryField);

      // If we got an array, use it
      if (Array.isArray(parsedInventory)) {
        return parsedInventory.map(item => ({
          weight: item.weight,
          quantity: typeof item.quantity === 'number' ? item.quantity : 0
        }));
      }
    } catch (e) {
      console.error('Error parsing inventory JSON:', e);
    }

    // Fallback: create inventory items for each weight
    return allWeights.map(weight => ({
      weight: weight.trim(),
      quantity: 0
    }));
  }

  // Helper to parse supplier cost from Airtable field
  private parseSupplierCostFromAirtable(supplierCostField: any, allWeights: string[]): SupplierCostItem[] {
    // If there's no supplier cost field or it's not a string, create default costs based on weights
    if (!supplierCostField || typeof supplierCostField !== 'string') {
      return allWeights.map(weight => ({
        weight: weight.trim(),
        cost: 0
      }));
    }

    try {
      // Try to parse the JSON string
      const parsedSupplierCost = JSON.parse(supplierCostField);

      // If we got an array, use it
      if (Array.isArray(parsedSupplierCost)) {
        return parsedSupplierCost.map(item => ({
          weight: item.weight,
          cost: typeof item.cost === 'number' ? item.cost : 0
        }));
      }
    } catch (e) {
      console.error('Error parsing supplier cost JSON:', e);
    }

    // Fallback: create supplier cost items for each weight
    return allWeights.map(weight => ({
      weight: weight.trim(),
      cost: 0
    }));
  }

  private parsePartialDetails(partialDetailsField: any): {[key: string]: { fulfilled: number; total: number }} | null {
    if (!partialDetailsField) return null;

    try {
      if (typeof partialDetailsField === 'string') {
        return JSON.parse(partialDetailsField);
      }

      if (typeof partialDetailsField === 'object') {
        return partialDetailsField;
      }

      return null;
    } catch (error) {
      console.error('Error parsing partial details:', error);
      return null;
    }
  }

  constructor() {
    // Initialize Airtable with API key
    const apiKey = process.env.AIRTABLE_API_KEY || "pat6dBso3pq5xXMHv.dc9f214c727f6ba8c98be036d33cfec611fcfd28d582a9ce4581f9ca7ba05f8d";
    const baseId = process.env.AIRTABLE_BASE_ID || "appQbeYz1b0YDv6oJ";

    Airtable.configure({ apiKey });
    this.airtable = Airtable.base(baseId);

    // For user authentication (using in-memory for simplicity as per requirements)
    this.users = new Map();
    this.currentId = 1;
  }

  // User methods - using in-memory storage as requested
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Order methods using Airtable
  async getOrders({ page = 1, limit = 10, status, search }: QueryOptions = {}): Promise<Order[]> {
    try {
      // Create query options
      const queryOptions: Airtable.SelectOptions = {};

      // Filter options
      let formulas = ['{status} = "payment_selection"'];

      // Add search filter if provided
      if (search) {
        // Search by firstname, lastname, email, or phone
        formulas.push(`OR(SEARCH("${search.toLowerCase()}", LOWER({firstname})), SEARCH("${search.toLowerCase()}", LOWER({lastname})), SEARCH("${search.toLowerCase()}", LOWER({email})), SEARCH("${search}", {phone}))`);
      }

      // Combine all filters with AND
      if (formulas.length > 1) {
        queryOptions.filterByFormula = `AND(${formulas.join(',')})`;
      } else {
        queryOptions.filterByFormula = formulas[0];
      }

      // Get all records first, then sort and paginate properly
      const allRecords = await this.airtable('carts').select(queryOptions).all();

      // Sort orders by priority: active orders first, then completed/unpaid orders last
      const sortedRecords = allRecords.sort((a: any, b: any) => {
        // Check payment and fulfillment status
        const paymentCache = (global as any).paymentStatusCache || new Map();
        const aHasPayment = Boolean(a.fields.stripepaymentid) || paymentCache.get(a.id) === true;
        const bHasPayment = Boolean(b.fields.stripepaymentid) || paymentCache.get(b.id) === true;
        const aCompleted = Boolean(a.fields.completed);
        const bCompleted = Boolean(b.fields.completed);
        const aPartial = Boolean(a.fields.partial);
        const bPartial = Boolean(b.fields.partial);

        // Priority 1: Move completed orders to bottom (they need no attention)
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;

        // For non-completed orders, apply priority sorting
        if (!aCompleted && !bCompleted) {
          // Priority 2: Partially fulfilled orders at the very top (highest priority)
          if (aPartial && !bPartial) return -1;
          if (!aPartial && bPartial) return 1;

          // Priority 3: Among non-partial orders, paid orders come before unpaid
          if (!aPartial && !bPartial) {
            if (aHasPayment && !bHasPayment) return -1;
            if (!aHasPayment && bHasPayment) return 1;
          }

          // Priority 4: Among orders with same partial/payment status, paid+partial still wins
          if (aPartial && bPartial) {
            // Both are partial, prefer the paid one
            if (aHasPayment && !bHasPayment) return -1;
            if (!aHasPayment && bHasPayment) return 1;
          }
        }

        // Priority 4: Sort by creation date (newest first)
        const aDate = new Date(a.fields.createdat as string || a.fields['created at'] as string || 0);
        const bDate = new Date(b.fields.createdat as string || b.fields['created at'] as string || 0);
        return bDate.getTime() - aDate.getTime();
      });

      // Calculate pagination
      const start = (page - 1) * limit;
      const paginatedRecords = sortedRecords.slice(start, start + limit);

      // Map Airtable records to our schema
      return paginatedRecords.map(record => {
        const fields = record.fields;

        // Parse cart items if they exist
        let cartItems = [];
        try {
          if (fields.cartitems) {
            cartItems = JSON.parse(fields.cartitems as string);
          }
        } catch (error) {
          console.error('Error parsing cart items:', error);
        }

        return {
          id: record.id,
          sessionId: fields.sessionid as string || '',
          checkoutId: fields.checkoutid as string || '',
          firstname: fields.firstname as string || '',
          lastname: fields.lastname as string || '',
          email: fields.email as string || '',
          phone: fields.phone as string || '',
          address: fields.address as string || '',
          city: fields.city as string || '',
          state: fields.state as string || '',
          zip: fields.zip as string || '',
          shippingMethod: fields.shippingmethod as string || '',
          status: fields.status as string || '',
          cartItems,
          total: fields.totalammount as string || fields.total as string || '0',
          createdAt: new Date(fields.createdat as string || fields['created at'] as string || Date.now()),
          updatedAt: new Date(fields.updatedat as string || fields['updated at'] as string || Date.now()),
          // Store Stripe payment ID if available
          stripePaymentId: fields.stripepaymentid as string || null,
          // Add fulfillment fields
          completed: Boolean(fields.completed) || false,
          partial: Boolean(fields.partial) || false,
          notes: fields.notes as string || null,
          affiliateCode: fields.affiliatecode as string || fields.affiliate_code as string || null,
          tracking: fields.tracking as string || null,
          partialDetails: this.parsePartialDetails(fields.partialdetails as any),
          confirmationEmailSent: Boolean(fields.orderconfirmsent || fields.confirmationEmailSent) || false,
          shippingEmailSent: Boolean(fields.ordershippedsent || fields.shippingEmailSent) || false,
          shipped: Boolean(fields.shipped) || false,
        };
      });
    } catch (error) {
      console.error('Error fetching orders from Airtable:', error);
      return [];
    }
  }

  async getOrdersCount(status?: string, search?: string): Promise<number> {
    try {
      // Create query options
      const queryOptions: Airtable.SelectOptions = {};

      // Filter options
      let formulas = ['{status} = "payment_selection"'];

      // Add search filter if provided
      if (search) {
        // Search by firstname, lastname, email, or phone
        formulas.push(`OR(SEARCH("${search.toLowerCase()}", LOWER({firstname})), SEARCH("${search.toLowerCase()}", LOWER({lastname})), SEARCH("${search.toLowerCase()}", LOWER({email})), SEARCH("${search}", {phone}))`);
      }

      // Combine all filters with AND
      if (formulas.length > 1) {
        queryOptions.filterByFormula = `AND(${formulas.join(',')})`;
      } else {
        queryOptions.filterByFormula = formulas[0];
      }

      const records = await this.airtable('carts').select(queryOptions).all();
      return records.length;
    } catch (error) {
      console.error('Error counting orders from Airtable:', error);
      return 0;
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const record = await this.airtable('carts').find(id);

      if (!record) {
        return null;
      }

      const fields = record.fields;

      // Parse cart items if they exist
      let cartItems = [];
      try {
        if (fields.cartitems) {
          cartItems = JSON.parse(fields.cartitems as string);

          // Enhance cart items with product details if they're not already loaded
          if (cartItems && Array.isArray(cartItems)) {
            for (const item of cartItems) {
              if (item.productId && (!item.product || !item.product.name)) {
                try {
                  // Fetch the product details from Airtable
                  const productRecord = await this.airtable('products').find(String(item.productId));

                  if (productRecord) {
                    // Enhance the cart item with product details
                    item.product = {
                      id: parseInt(productRecord.id),
                      name: productRecord.fields.name as string || 'Unknown Product',
                      description: productRecord.fields.description as string || '',
                      price: productRecord.fields.price as string || '0',
                      image: productRecord.fields.image as string || '',
                      status: productRecord.fields.status as string || '',
                      category: productRecord.fields.category as string || '',
                    };
                  }
                } catch (productError) {
                  console.error(`Error fetching product ${item.productId} for order:`, productError);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error parsing cart items:', error);
      }

      // Check if the order is completed
      const completed = fields.completed === true || fields.completed === 'true';

      return {
        id: record.id,
        sessionId: fields.sessionid as string || '',
        checkoutId: fields.checkoutid as string || '',
        firstname: fields.firstname as string || '',
        lastname: fields.lastname as string || '',
        email: fields.email as string || '',
        phone: fields.phone as string || '',
        address: fields.address as string || '',
        city: fields.city as string || '',
        state: fields.state as string || '',
        zip: fields.zip as string || '',
        shippingMethod: fields.shippingmethod as string || '',
        status: fields.status as string || '',
        cartItems,
        total: fields.totalammount as string || fields.total as string || '0',
        createdAt: new Date(fields.createdat as string || fields['created at'] as string || Date.now()),
        updatedAt: new Date(fields.updatedat as string || fields['updated at'] as string || Date.now()),
        stripePaymentId: fields.stripepaymentid as string || null,
        completed,
        partial: fields.partial === true || fields.partial === 'true',
        notes: fields.notes as string || null,
        affiliateCode: fields.affiliatecode as string || fields.affiliate_code as string || null,
        tracking: fields.tracking as string || null,
        partialDetails: this.parsePartialDetails(fields.partialdetails as any),
        confirmationEmailSent: Boolean(fields.orderconfirmsent || fields.confirmationEmailSent) || false,
        shippingEmailSent: Boolean(fields.ordershippedsent || fields.shippingEmailSent) || false,
      };
    } catch (error) {
      console.error('Error fetching order from Airtable:', error);
      return null;
    }
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    try {
      console.log('updateOrder called with:', { id, updates });
      // Format the updates for Airtable
      const airtableUpdates: Record<string, any> = {};

      if (updates.status) airtableUpdates.status = updates.status;
      if (updates.firstname) airtableUpdates.firstname = updates.firstname;
      if (updates.lastname) airtableUpdates.lastname = updates.lastname;
      if (updates.email) airtableUpdates.email = updates.email;
      if (updates.phone) airtableUpdates.phone = updates.phone;
      if (updates.address) airtableUpdates.address = updates.address;
      if (updates.city) airtableUpdates.city = updates.city;
      if (updates.state) airtableUpdates.state = updates.state;
      if (updates.zip) airtableUpdates.zip = updates.zip;
      if (updates.shippingMethod) airtableUpdates.shippingmethod = updates.shippingMethod;
      if (updates.total) airtableUpdates.total = updates.total;
      // Add support for updating the 'completed' field
      if (updates.completed !== undefined) airtableUpdates.completed = updates.completed;
      if (updates.partial !== undefined) airtableUpdates.partial = updates.partial;
      if (updates.notes !== undefined) airtableUpdates.notes = updates.notes;
      if (updates.affiliateCode !== undefined) airtableUpdates.affiliatecode = updates.affiliateCode;
      if (updates.tracking !== undefined) airtableUpdates.tracking = updates.tracking;
      if (updates.partialDetails !== undefined) {
        console.log('Saving partialDetails to Airtable:', updates.partialDetails);
        airtableUpdates.partialdetails = JSON.stringify(updates.partialDetails);
      }
      if (updates.confirmationEmailSent !== undefined) airtableUpdates.orderconfirmsent = updates.confirmationEmailSent;
      if (updates.shippingEmailSent !== undefined) airtableUpdates.ordershippedsent = updates.shippingEmailSent;
      // Skip updating stripePaymentId in Airtable to avoid field name conflicts
      // Payment status is now tracked in memory cache

      // Update the record in Airtable
      const record = await this.airtable('carts').update(id, airtableUpdates);

      // Get the updated order
      return this.getOrderById(id);
    } catch (error) {
      console.error('Error updating order in Airtable:', error);
      return null;
    }
  }

  // Product methods - integrated with Airtable
  async getProducts({ page = 1, limit = 10, category }: QueryOptions = {}): Promise<Product[]> {
    try {
      // Create query filters
      const query: any = {
        pageSize: 100,
        view: 'Grid view',
      };

      // Add category filter if specified
      if (category) {
        query.filterByFormula = `FIND("${category}", {categoryId}) > 0`;
      }

      // Fetch records from Airtable
      const records = await this.airtable('products').select(query).all();
      console.log(`Fetched ${records.length} products from Airtable`);

      // Map Airtable records to our schema
      const products = records.map(record => {
        const fields = record.fields;

        // Extract all weights and corresponding prices
        const weightOptions: WeightPrice[] = [];

        // Safely handle weights field - ensure it's a string before using split
        const rawWeights = fields.weights ? String(fields.weights) : '5mg';
        const allWeights = rawWeights.includes(',') 
          ? rawWeights.split(',').map(w => w.trim()) 
          : [rawWeights.trim()];

        // Get the first weight as default
        const weights = allWeights[0];

        // Check each weight and match with its price
        allWeights.forEach(weight => {
          let price = '0';
          if (weight === '5mg' && fields.price5mg) price = String(fields.price5mg);
          else if (weight === '10mg' && fields.price10mg) price = String(fields.price10mg);
          else if (weight === '2mg' && fields.price2mg) price = String(fields.price2mg);
          else if (weight === '20mg' && fields.price20mg) price = String(fields.price20mg);
          else if (weight === '750mg' && fields.price750mg) price = String(fields.price750mg);
          else if (weight === '100mg' && fields.price100mg) price = String(fields.price100mg);

          weightOptions.push({ weight, price });
        });

        // Sort weight options by price (lowest first)
        weightOptions.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        // Get the lowest price as the default price
        const priceField = weightOptions.length > 0 ? weightOptions[0].price : '0';

        // Safely handle name field
        const name = String(fields.name || '');

        return {
          id: parseInt(String(fields.id || '0')),
          name: name,
          description: String(fields.description || ''),
          sku: name ? `${name.substring(0, 6)}-${weights}` : '',
          price: priceField,
          category: String(fields.categoryId || ''),
          weight: weights,
          stock: fields.inStock ? 25 : 0,
          lowStockThreshold: 5,
          image: fields.image && fields.image[0] && fields.image[0].url ? fields.image[0].url : '',
          imageAlt: `${name} product image`,
          status: fields.outofstock ? 'archived' : 'active',
          trackInventory: Boolean(fields.inStock),
          weightOptions: weightOptions,
          allWeights: allWeights.join(', '),
          // Parse inventory from JSON string if available
          inventory: this.parseInventoryFromAirtable(fields.inventory, allWeights),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      // Handle pagination manually
      const start = (page - 1) * limit;
      const end = Math.min(start + limit, products.length);

      return products.slice(start, end);
    } catch (error) {
      console.error('Error fetching products from Airtable:', error);
      return [];
    }
  }

  async getProductsCount(category?: string): Promise<number> {
    try {
      // Create query filters
      const query: any = {
        view: 'Grid view',
      };

      // Add category filter if specified
      if (category) {
        query.filterByFormula = `FIND("${category}", {categoryId}) > 0`;
      }

      // Fetch records from Airtable
      const records = await this.airtable('products').select(query).all();
      return records.length;
    } catch (error) {
      console.error('Error counting products from Airtable:', error);
      return 0;
    }
  }

  async getProductSalesData(id: number): Promise<{ totalSales: number, salesByWeight: Record<string, number> }> {
    try {
      console.log(`Attempting to fetch sales data for product ID: ${id}`);

      // Try a simpler approach: Fetch all carts and filter in code
      const allCarts = await this.airtable('carts').select({}).all();
      console.log(`Total carts found: ${allCarts.length}`);

      // Filter carts manually
      const carts = allCarts.filter(cart => {
        try {
          // Check for cartitems field
          if (!cart.fields.cartitems) {
            return false;
          }

          // Try to parse the cartitems JSON
          const cartItemsStr = String(cart.fields.cartitems);
          console.log(`Checking cart ${cart.id}, status: ${cart.fields.status}, cartitems: ${cartItemsStr.substring(0, 150)}...`);

          // Check if this product ID is in the cartitems string
          return cartItemsStr.includes(`"productId":${id}`) || 
                 cartItemsStr.includes(`"productId":"${id}"`) ||
                 cartItemsStr.includes(`"productId": ${id}`) || 
                 cartItemsStr.includes(`"productId": "${id}"`);
        } catch (e) {
          console.error(`Error filtering cart ${cart.id}:`, e);
          return false;
        }
      });

      console.log(`Found ${carts.length} carts with product ID ${id}`);

      let totalSales = 0;
      const salesByWeight: Record<string, number> = {};

      // Process each cart to extract product sales data
      for (const cart of carts) {
        try {
          // Check if the cart has a status that indicates a completed or paid order
          const status = cart.fields.status || '';
          const isPaid = status.includes('complete') || 
                         status.includes('payment') || 
                         status === 'paid' || 
                         status === 'shipped';

          console.log(`Cart ${cart.id} has status: ${status}, isPaid: ${isPaid}`);

          // Skip carts that aren't paid or completed
          if (!isPaid) {
            console.log(`Skipping cart ${cart.id} as it's not paid (status: ${status})`);
            continue;
          }

          // Parse the cartitems JSON to get quantities by weight
          const cartItemsStr = cart.fields.cartitems;
          if (!cartItemsStr) continue;

          // Log the raw cartitems string for debugging
          console.log(`Processing cart ${cart.id} with status ${status}`);

          const items = JSON.parse(String(cartItemsStr));

          for (const item of items) {
            // Convert productId to string for consistent comparison
            const itemProductId = String(item.productId);
            const targetProductId = String(id);

            console.log(`Comparing item productId ${itemProductId} with target ${targetProductId}`);

            // If this item is for our product
            if (itemProductId === targetProductId) {
              console.log(`Found matching product in cart ${cart.id}`);

              // Add to total sales - use quantity if available, otherwise assume 1
              const quantity = item.quantity || 1;
              totalSales += quantity;

              // Track sales by weight - use selectedWeight if available
              const weight = item.selectedWeight || 'default';
              if (!salesByWeight[weight]) {
                salesByWeight[weight] = 0;
              }
              salesByWeight[weight] += quantity;

              console.log(`Added ${quantity} sales for weight ${weight}`);
            }
          }
        } catch (e) {
          console.error(`Error processing cart ${cart.id}:`, e);
        }
      }

      console.log(`Total sales for product ${id}: ${totalSales}`);
      console.log(`Sales by weight for product ${id}:`, salesByWeight);

      return {
        totalSales,
        salesByWeight
      };
    } catch (error) {
      console.error('Error fetching product sales data:', error);
      return {
        totalSales: 0,
        salesByWeight: {}
      };
    }
  }

  async getProductById(id: number): Promise<Product | null> {
    try {
      // Fetch from Airtable using a filter
      const records = await this.airtable('products')
        .select({
          filterByFormula: `{id} = '${id}'`,
          maxRecords: 1
        })
        .all();

      if (records.length === 0) {
        return null;
      }

      // Map the first matching record to our schema
      const record = records[0];
      const fields = record.fields;

      // Extract all weights and corresponding prices
      const weightOptions: WeightPrice[] = [];

      // Safely handle weights field
      const rawWeights = fields.weights ? String(fields.weights) : '5mg';
      const allWeights = rawWeights.includes(',') 
        ? rawWeights.split(',').map(w => w.trim()) 
        : [rawWeights.trim()];

      // Get the first weight as default
      const weights = allWeights[0];

      // Check each weight and match with its price
      allWeights.forEach(weight => {
        let price = '0';
        if (weight === '5mg' && fields.price5mg) price = String(fields.price5mg);
        else if (weight === '10mg' && fields.price10mg) price = String(fields.price10mg);
        else if (weight === '2mg' && fields.price2mg) price = String(fields.price2mg);
        else if (weight === '20mg' && fields.price20mg) price = String(fields.price20mg);
        else if (weight === '750mg' && fields.price750mg) price = String(fields.price750mg);
        else if (weight === '100mg' && fields.price100mg) price = String(fields.price100mg);

        weightOptions.push({ weight, price });
      });

      // Sort weight options by price (lowest first)
      weightOptions.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

      // Get the lowest price as the default price
      const priceField = weightOptions.length > 0 ? weightOptions[0].price : '0';

      // Parse inventory field from Airtable using our helper method
      const inventoryItems = this.parseInventoryFromAirtable(fields.inventory, allWeights);

      // Parse supplier cost field from Airtable using our helper method
      const supplierCostItems = this.parseSupplierCostFromAirtable(fields.supplierCost, allWeights);

      // Safely handle name field
      const name = String(fields.name || '');

      return {
        id: parseInt(String(fields.id || '0')),
        name: name,
        description: String(fields.description || ''),
        sku: name ? `${name.substring(0, 6)}-${weights}` : '',
        price: priceField,
        // Use a number or string as category, but don't use the Airtable field name 'categoryId'
        // since it causes validation issues when sent back to Airtable
        category: fields.categoryId ? String(fields.categoryId) : '1',
        weight: weights,
        stock: fields.inStock ? 25 : 0,
        lowStockThreshold: 5,
        image: fields.image && fields.image[0] && fields.image[0].url ? fields.image[0].url : '',
        imageAlt: `${name} product image`,
        status: fields.outofstock ? 'archived' : 'active',
        trackInventory: Boolean(fields.inStock),
        weightOptions: weightOptions,
        allWeights: allWeights.join(', '),
        inventory: inventoryItems,
        supplierCost: supplierCostItems,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error fetching product from Airtable:', error);
      return null;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    // DISABLED: Prevent creating new records in Airtable
    throw new Error('Product creation is disabled to prevent adding unwanted records to Airtable');
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    try {
      console.log("updateProduct called with updates:", JSON.stringify(updates));

      const product = await this.getProductById(id);

      if (!product) {
        return null;
      }

      // Create a record in Airtable format - ONLY include specific fields
      // to avoid validation errors
      const record: Record<string, any> = {};

      // Safe fields that rarely cause validation issues
      if (updates.name !== undefined) record.name = updates.name;
      if (updates.description !== undefined) record.description = updates.description || '';
      if (updates.stock !== undefined) record.inStock = updates.stock > 0;

      // NEVER include image in regular updates - Airtable's attachment field requires a specific format
      // According to Airtable API docs, attachments must be in the format:
      // [{ url: "https://example.com/image.jpg" }] OR via special upload endpoint
      // We'll skip the image field entirely to avoid validation errors

      // SPECIAL HANDLING FOR PRICE - This is critical
      if (updates.price !== undefined) {
        try {
          // 1. Get a clean price string, remove any non-numeric chars except decimal point
          const priceStr = typeof updates.price === 'string' ? updates.price : String(updates.price);
          const cleanPriceStr = priceStr.replace(/[^0-9.]/g, '');

          // 2. Convert to a JavaScript Number (very important for Airtable)
          const numericPrice = parseFloat(cleanPriceStr);

          // 3.Only set the price if it's a valid number
          if (!isNaN(numericPrice)) {
            // For Airtable, we must send a pure JavaScript number, not a string
            record.price5mg = numericPrice;
            console.log("Setting price5mg to numeric value:", numericPrice, "(type:", typeof numericPrice, ")");
          }
        } catch (e) {
          console.error("Error processing price:", e);
        }
      }

      // NEVER update weights or category fields - they cause validation errors

      // SPECIAL HANDLING FOR INVENTORY - Convert to JSON string for Airtable
      if (updates.inventory !== undefined && Array.isArray(updates.inventory)) {
        try {
          // Convert inventory array to JSON string
          const inventoryJson = JSON.stringify(updates.inventory);
          record.inventory = inventoryJson;
          console.log("Setting inventory JSON:", inventoryJson);
        } catch (e) {
          console.error("Error processing inventory:", e);
        }
      }

      // SPECIAL HANDLING FOR SUPPLIER COST - Convert to JSON string for Airtable
      if (updates.supplierCost !== undefined && Array.isArray(updates.supplierCost)) {
        try {
          // Convert supplier cost array to JSON string
          const supplierCostJson = JSON.stringify(updates.supplierCost);
          record.supplierCost = supplierCostJson;
          console.log("Setting supplierCost JSON:", supplierCostJson);
        } catch (e) {
          console.error("Error processing supplierCost:", e);
        }
      }

      // Debugging: print product object
      console.log("Original product from getProductById:", JSON.stringify(product, null, 2));

      // Update the record in Airtable
      console.log(`Updating product ${id} in Airtable:`, record);

      // Find the Airtable record ID for this product
      const query: any = {
        view: 'Grid view',
        filterByFormula: `AND({id} = "${id}")`,
        maxRecords: 1
      };

      const records = await this.airtable('products').select(query).all();

      if (records.length === 0) {
        console.error(`Product with ID ${id} not found in Airtable`);
        return null;
      }

      // Get the Airtable record ID
      const airtableRecordId = records[0].id;

      // Log the prepared record for Airtable update
      console.log("About to send this record to Airtable:", record);

      try {
        // Update the Airtable record
        await this.airtable('products').update(airtableRecordId, record);
        console.log("Airtable update successful!");
      } catch (updateError) {
        console.error("Airtable update failed:", updateError);

        // Special handling for various field errors
        if (updateError.message) {
          const cleanRecord = { ...record };
          let shouldRetry = false;

          // Handle categoryId errors
          if (updateError.message.includes('categoryId')) {
            // Make absolutely sure no category-related fields are included
            delete cleanRecord.categoryId;
            delete cleanRecord.category;
            shouldRetry = true;
          }

          // Handle price5mg errors
          if (updateError.message.includes('price5mg')) {
            // Ensure price is a proper numeric value
            if (updates.price) {
              try {
                // Be extra careful about formatting the price
                const priceStr = typeof updates.price === 'string' ? updates.price : String(updates.price);
                const cleanPriceStr = priceStr.replace(/[^0-9.]/g, '');
                const numericPrice = parseFloat(cleanPriceStr);

                if (!isNaN(numericPrice)) {
                  cleanRecord.price5mg = numericPrice; // Must be a JavaScript number, not a string
                  console.log("Fixed price5mg to numeric value:", numericPrice, "(type:", typeof numericPrice, ")");
                  shouldRetry = true;
                } else {
                  // If we can't parse it, don't send the field at all
                  delete cleanRecord.price5mg;
                  shouldRetry = true;
                }
              } catch (e) {
                console.error("Failed to convert price to number:", e);
                delete cleanRecord.price5mg; // Remove field that's causing problems
                shouldRetry = true;
              }
            }
          }

          // Handle weights field errors - NEVER include this field in update
          if (updateError.message.includes('weights')) {
            delete cleanRecord.weights;
            shouldRetry = true;
          }

          // Handle image attachment errors
          if (updateError.message.includes('attachment') || updateError.message.includes('image')) {
            // Airtable expects attachments in a specific format - not as string URLs
            delete cleanRecord.image;
            shouldRetry = true;
          }

          if (shouldRetry) {
            console.log("Retrying update with cleaned record:", cleanRecord);

            // Try update again
            await this.airtable('products').update(airtableRecordId, cleanRecord);
            console.log("Retry successful!");
          }
        } else {
          // Re-throw other errors
          throw updateError;
        }
      }

      // Return the updated product, but make sure to remove category
      // to prevent it from being used in future updates
      const cleanUpdates = { ...updates };
      delete cleanUpdates.category;
      delete cleanUpdates.categoryId;

      return {
        ...product,
        ...cleanUpdates,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error updating product in Airtable:', error);
      return null;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      // Find the Airtable record ID for this product
      const query: any = {
        view: 'Grid view',
        filterByFormula: `AND({id} = "${id}")`,
        maxRecords: 1
      };

      const records = await this.airtable('products').select(query).all();

      if (records.length === 0) {
        console.error(`Product with ID ${id} not found in Airtable`);
        return;
      }

      // Get the Airtable record ID
      const airtableRecordId = records[0].id;

      // Delete the record from Airtable
      console.log(`Deleting product ${id} from Airtable, record ID: ${airtableRecordId}`);
      await this.airtable('products').destroy(airtableRecordId);
    } catch (error) {
      console.error('Error deleting product from Airtable:', error);
      throw error;
    }
  }

  // Dashboard methods
  async getDashboardStats(): Promise<DashboardStats> {
    const orders = await this.getOrders({ limit: 1000 });
    const products = await this.getProducts({ limit: 1000 });

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.total || '0');
      return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);

    // Count unique customers
    const uniqueCustomers = new Set();
    orders.forEach(order => {
      if (order.email) {
        uniqueCustomers.add(order.email);
      }
    });

    // Count low stock products
    const lowStockProducts = products.filter(product => 
      product.stock !== undefined && 
      product.lowStockThreshold !== undefined && 
      product.stock <= product.lowStockThreshold
    ).length;

    return {
      totalOrders: orders.length,
      totalRevenue,
      activeCustomers: uniqueCustomers.size,
      totalProducts: products.length,
      lowStockProducts
    };
  }

  async getSalesData(): Promise<SalesData> {
    const orders = await this.getOrders({ limit: 1000 });

    // Calculate weekly sales
    const weeklySales = orders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.total || '0');
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (orderDate >= weekAgo && orderDate <= now) {
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
      }

      return sum;
    }, 0);

    // Calculate average order value
    const totalRevenue = orders.reduce((sum, order) => {
      const orderTotal = parseFloat(order.total || '0');
      return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);

    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Daily sales for the last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize sales for each day with 0
    const salesByDay: Record<string, number> = {};
    days.forEach(day => {
      salesByDay[day] = 0;
    });

    // Get current day of week (0-6, where 0 is Sunday)
    const now = new Date();
    const todayIndex = now.getDay();

    // Calculate actual sales for each day of the week
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const orderTotal = parseFloat(order.total || '0');
      if (isNaN(orderTotal)) return;

      // Check if this order is from the last 7 days
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (orderDate >= weekAgo && orderDate <= now) {
        const dayOfWeek = orderDate.getDay();
        const dayName = days[dayOfWeek];
        salesByDay[dayName] += orderTotal;
      }
    });

    // Create the daily sales array sorted by day of week (starting from today)
    const dailySales = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (todayIndex - 6 + i) % 7;
      const day = days[dayIndex >= 0 ? dayIndex : dayIndex + 7];
      dailySales.push({
        day,
        amount: Math.round(salesByDay[day] * 100) / 100
      });
    }

    return {
      weeklySales,
      avgOrderValue,
      dailySales
    };
  }

  async getPopularProducts(): Promise<Product[]> {
    // Get all products
    const products = await this.getProducts();
    const productsWithSales: Product[] = [];

    // For each product, get its sales data
    for (const product of products) {
      try {
        const salesData = await this.getProductSalesData(product.id);
        productsWithSales.push({
          ...product,
          salesData
        });
      } catch (error) {
        console.error(`Error getting sales data for product ${product.id}:`, error);
        productsWithSales.push(product);
      }
    }

    // Sort by total sales (in descending order)
    productsWithSales.sort((a, b) => {
      const aSales = a.salesData?.totalSales || 0;
      const bSales = b.salesData?.totalSales || 0;
      return bSales - aSales;
    });

    // Return the top products
    return productsWithSales;
  }

  async getCustomersWithOrderInfo({ page = 1, limit = 10, search = '' }: QueryOptions = {}): Promise<{ data: any[], total: number }> {
    try {
      // First get all orders to extract customer information
      const orderRecords = await this.airtable('carts').select().all();

      // Create a map to store unique customers with their order data
      const customersMap = new Map();

      // Process each order to extract and aggregate customer data
      for (const record of orderRecords) {
        const fields = record.fields;

        // Skip orders without essential customer info
        if (!fields.firstname && !fields.lastname && !fields.email) {
          continue;
        }

        // Parse cart items to calculate total spent
        let cartItems = [];
        let orderTotal = 0;

        // Get the order total from the cart
        try {
          orderTotal = parseFloat(fields.totalammount as string || fields.total as string || '0');

          if (fields.cartitems) {
            cartItems = JSON.parse(fields.cartitems as string);
          }
        } catch (error) {
          console.error('Error parsing cart items:', error);
        }

        // Create a customer ID using email or a combination of name fields
        const customerId = fields.email ? 
          fields.email.toString().toLowerCase() : 
          `${fields.firstname || ''}-${fields.lastname || ''}`.toLowerCase();

        if (!customerId) continue;

        // Check if we already have this customer
        if (customersMap.has(customerId)) {
          const customer = customersMap.get(customerId);

          // Update customer data
          customer.totalOrders += 1;
          customer.totalSpent += orderTotal;
          customer.orders.push({
            id: record.id,
            status: fields.status as string || '',
            total: orderTotal,
            items: cartItems.length,
            createdAt: new Date(fields.createdat as string || fields['created at'] as string || Date.now())
          });

          // Ensure the most complete customer information
          if (fields.phone && !customer.phone) customer.phone = fields.phone;
          if (fields.address && !customer.address) customer.address = fields.address;
          if (fields.city && !customer.city) customer.city = fields.city;
          if (fields.state && !customer.state) customer.state = fields.state;
          if (fields.zip && !customer.zip) customer.zip = fields.zip;

          // Update last order date if this order is newer
          const orderDate = new Date(fields.createdat as string || fields['created at'] as string || Date.now());
          if (orderDate > customer.lastOrderDate) {
            customer.lastOrderDate = orderDate;
          }
        } else {
          // Create a new customer entry
          const orderDate = new Date(fields.createdat as string || fields['created at'] as string || Date.now());

          customersMap.set(customerId, {
            id: customerId,
            firstname: fields.firstname as string || '',
            lastname: fields.lastname as string || '',
            email: fields.email as string || '',
            phone: fields.phone as string || '',
            address: fields.address as string || '',
            city: fields.city as string || '',
            state: fields.state as string || '',
            zip: fields.zip as string || '',
            totalOrders: 1,
            totalSpent: orderTotal,
            lastOrderDate: orderDate,
            createdAt: orderDate,
            orders: [{
              id: record.id,
              status: fields.status as string || '',
              total: orderTotal,
              items: cartItems.length,
              createdAt: orderDate
            }]
          });
        }
      }

      // Convert map to array and sort by most recent order
      let customers = Array.from(customersMap.values());

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        customers = customers.filter(customer => {
          // Check each field safely using optional chaining and type checking
          const firstnameMatch = typeof customer.firstname === 'string' && customer.firstname.toLowerCase().includes(searchLower);
          const lastnameMatch = typeof customer.lastname === 'string' && customer.lastname.toLowerCase().includes(searchLower);
          const emailMatch = typeof customer.email === 'string' && customer.email.toLowerCase().includes(searchLower);
          const phoneMatch = typeof customer.phone === 'string' && customer.phone.includes(searchLower);
          const addressMatch = typeof customer.address === 'string' && customer.address.toLowerCase().includes(searchLower);
          const cityMatch = typeof customer.city === 'string' && customer.city.toLowerCase().includes(searchLower);
          const stateMatch = typeof customer.state === 'string' && customer.state.toLowerCase().includes(searchLower);

          return firstnameMatch || lastnameMatch || emailMatch || phoneMatch || 
                 addressMatch || cityMatch || stateMatch;
        });
      }

      // Sort by most recent order date (with null check)
      customers.sort((a, b) => {
        // Handle cases where lastOrderDate might be null/undefined
        if (!a.lastOrderDate) return 1;  // null dates sort to the end
        if (!b.lastOrderDate) return -1;
        return b.lastOrderDate.getTime() - a.lastOrderDate.getTime();
      });

      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // Return paginated customers with total count
      return {
        data: customers.slice(startIndex, endIndex),
        total: customers.length
      };
    } catch (error) {
      console.error('Error fetching customers with order info:', error);
      return {
        data: [],
        total: 0
      };
    }
  }
}

// Memory storage fallback option
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Implement minimal versions of the other required methods
  async getOrders(): Promise<Order[]> {
    return [];
  }

  async getOrdersCount(): Promise<number> {
    return 0;
  }

  async getOrderById(): Promise<Order | null> {
    return null;
  }

  async updateOrder(): Promise<Order | null> {
    return null;
  }

  async getProducts(): Promise<Product[]> {
    return [];
  }

  async getProductsCount(): Promise<number> {
    return 0;
  }

  async getProductById(): Promise<Product | null> {
    return null;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return {
      ...product as any,
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateProduct(): Promise<Product | null> {
    return null;
  }

  async deleteProduct(): Promise<void> {
    return;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      activeCustomers: 0,
      totalProducts: 0,
      lowStockProducts: 0
    };
  }

  async getSalesData(): Promise<SalesData> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const todayIndex = now.getDay();

    // Create empty daily sales array with actual days of the week
    const dailySales = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (todayIndex - 6 + i) % 7;
      const day = days[dayIndex >= 0 ? dayIndex : dayIndex + 7];
      dailySales.push({
        day,
        amount: 0
      });
    }

    return {
      weeklySales: 0,
      avgOrderValue: 0,
      dailySales
    };
  }

  async getPopularProducts(): Promise<Product[]> {
    return [];
  }

  async getProductSalesData(id: number): Promise<{ totalSales: number, salesByWeight: Record<string, number> }> {
    return {
      totalSales: 0,
      salesByWeight: {}
    };
  }

  async getCustomersWithOrderInfo({ page = 1, limit = 10, search = '' }: QueryOptions = {}): Promise<{ data: any[], total: number }> {
    try {
      // Return empty data with correct structure for MemStorage
      return {
        data: [],
        total: 0
      };
    } catch (error) {
      console.error('Error in MemStorage.getCustomersWithOrderInfo:', error);
      return {
        data: [],
        total: 0
      };
    }
  }
}

// Export the storage interface implementation
export const storage = new AirtableStorage();