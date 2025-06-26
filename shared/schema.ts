import { pgTable, text, serial, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Interface for weight and price options
export interface WeightPrice {
  weight: string;
  price: string;
};

export interface InventoryItem {
  weight: string;
  quantity: number;
};

export interface SupplierCostItem {
  weight: string;
  cost: number;
};

export interface SalesData {
  totalSales: number;
  salesByWeight: Record<string, number>;
};

// User model for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Cart item schema for nested objects
export const cartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  sessionId: z.string().optional(),
  selectedWeight: z.string().optional(),
  id: z.number().optional(),
  product: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number().optional(),
    image: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
});

// Order model
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  checkoutId: text("checkout_id").notNull(),
  firstname: text("firstname"),
  lastname: text("lastname"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  shippingMethod: text("shipping_method"),
  status: text("status").notNull(),
  cartItems: json("cart_items").$type<z.infer<typeof cartItemSchema>[]>(),
  total: text("total"),
  completed: boolean("completed").default(false),
  partial: boolean("partial").default(false),
  notes: text("notes"),
  affiliateCode: text("affiliate_code"),
  tracking: text("tracking"),
  partialDetails: json("partial_details").$type<{[key: string]: { fulfilled: number; total: number }}>(),
  confirmationEmailSent: boolean("confirmation_email_sent").default(false),
  shippingEmailSent: boolean("shipping_email_sent").default(false),
  shipped: boolean("shipped").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  stripePaymentId: text("stripe_payment_id"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Product model
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku"),
  price: text("price"),
  category: text("category"),
  weight: text("weight"),
  stock: integer("stock"),
  lowStockThreshold: integer("low_stock_threshold"),
  image: text("image"),
  imageAlt: text("image_alt"),
  status: text("status").default("active"),
  trackInventory: boolean("track_inventory").default(true),
  weightOptions: json("weight_options").$type<WeightPrice[]>(),
  allWeights: text("all_weights"),
  inventory: json("inventory").$type<InventoryItem[]>(),
  supplierCost: json("supplier_cost").$type<SupplierCostItem[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Customers model
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  totalOrders: integer("total_orders").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  totalOrders: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;

export type Product = typeof products.$inferSelect & {
  salesData?: SalesData;
};
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;