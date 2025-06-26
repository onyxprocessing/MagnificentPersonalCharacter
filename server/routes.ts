import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email";
import cors from "cors";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import { apiRequest } from '../shared/schema';
import { db } from './storage';
import { airtableClient } from './storage';
import type { Request, Response } from 'express';
import { createShippingLabel } from './easypost';

// Initialize Stripe with secret key from environment variable
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY environment variable");
}

// Set up Stripe API client
const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2023-10-16",
});

// Function to check if an order should be considered as paid
// This acts as a fallback when Stripe API calls fail
// In-memory cache for payment status
const paymentStatusCache = new Map<string, boolean>();
// Make cache available globally for storage module
(global as any).paymentStatusCache = paymentStatusCache;

function checkOrderSimulatedPayment(order: any): boolean {
  // For testing, consider certain customers as "pre-verified" 
  if (order.email) {
    const email = order.email.toLowerCase();
    // These test emails will always be considered paid
    if (email.includes('test') || 
        email.includes('demo') || 
        email.includes('yahoo.com') || 
        email.includes('icloud.com') ||
        email.includes('gmail.com') ||
        email.includes('hotmail.com') ||
        email.includes('outlook.com') ||
        email.includes('aol.com')) {
      return true;
    }
  }

  // Check if total is a reasonable value (not $0 or negative)
  const total = parseFloat(order.total || '0');
  if (total > 0) {
    return true;
  }

  return false;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up CORS for API routes
  app.use('/api', cors());

  // Increase body parser limit for OCR image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', apiLimiter);

  // Auth endpoints
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    console.log('Login attempt:', email, password);

    // Always allow login with hardcoded credentials
    // Hardcoded credentials: jack@lendousa.com / Fra@1705
    if (email === 'jack@lendousa.com' && password === 'Fra@1705') {
      console.log('Login successful');
      return res.json({
        success: true,
        user: {
          email: 'jack@lendousa.com',
          name: 'Jack Spicer'
        }
      });
    }

    console.log('Login failed. Expected: jack@lendousa.com / Fra@1705, Got:', email, password);
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  });

  // Orders endpoints
  app.get('/api/orders', async (req, res) => {
    try {
      const { page = '1', limit = '10', status, search } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const orders = await storage.getOrders({
        page: pageNum,
        limit: limitNum,
        status: status as string,
        search: search as string
      });

      const total = await storage.getOrdersCount(status as string, search as string);

      res.json({
        success: true,
        data: orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total
        }
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders'
      });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order details'
      });
    }
  });

  app.patch('/api/orders/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedOrder = await storage.updateOrder(id, updates);

      res.json({
        success: true,
        data: updatedOrder
      });
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order'
      });
    }
  });

  // Update order fulfillment endpoint
  app.patch('/api/orders/:id/fulfillment', async (req, res) => {
    try {
      const { id } = req.params;
      const { completed, partial } = req.body;

      console.log(`Updating fulfillment for order ${id}:`, { completed, partial });

      const updatedOrder = await storage.updateOrder(id, { completed, partial });

      if (updatedOrder) {
        res.json({ 
          success: true, 
          data: updatedOrder,
          message: "Order fulfillment updated successfully"
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: "Order not found" 
        });
      }
    } catch (error) {
      console.error("Error updating order fulfillment:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update order fulfillment" 
      });
    }
  });

  // Scanner endpoint for tracking number lookup
  app.post('/api/scanner/process-tracking', async (req, res) => {
    try {
      const { trackingNumber } = req.body;

      if (!trackingNumber) {
        return res.status(400).json({
          success: false,
          message: 'Tracking number is required'
        });
      }

      console.log(`Scanner: Looking for tracking number: ${trackingNumber}`);
      console.log('Airtable client available:', typeof airtableClient);

      try {
        // First, use direct Airtable search to find orders with this tracking number in the tracking field
        const trackingQuery = {
          filterByFormula: `{tracking} = "${trackingNumber.trim()}"`,
          maxRecords: 10
        };

        console.log(`Searching Airtable tracking field with formula: {tracking} = "${trackingNumber.trim()}"`);
        console.log('Query object:', JSON.stringify(trackingQuery));

        // Search directly in Airtable for tracking number matches
        const trackingRecords = await airtableClient('carts').select(trackingQuery).all();
        
        console.log(`Found ${trackingRecords.length} Airtable records with tracking number ${trackingNumber}`);

        if (trackingRecords.length > 0) {
          const record = trackingRecords[0];
          const fields = record.fields;
          
          console.log(`Found order ${record.id} for customer ${fields.firstname} ${fields.lastname} with existing tracking`);
          
          return res.json({
            success: true,
            data: {
              found: true,
              order: {
                id: record.id,
                customerName: `${fields.firstname || ''} ${fields.lastname || ''}`.trim(),
                email: fields.email || '',
                completed: Boolean(fields.completed),
                tracking: fields.tracking || '',
                status: fields.status || 'payment_selection',
                hasExistingTracking: true,
                total: fields.total || '0'
              }
            }
          });
        }

        // Also try searching with lowercase field name in case of case sensitivity
        const trackingQueryLower = {
          filterByFormula: `{Tracking} = "${trackingNumber.trim()}"`,
          pageSize: 10
        };

        console.log(`Trying with capitalized field name: {Tracking} = "${trackingNumber.trim()}"`);
        
        const trackingRecordsUpper = await airtableClient('carts').select(trackingQueryLower).all();
        
        console.log(`Found ${trackingRecordsUpper.length} Airtable records with capitalized Tracking field`);

        if (trackingRecordsUpper.length > 0) {
          const record = trackingRecordsUpper[0];
          const fields = record.fields;
          
          console.log(`Found order ${record.id} for customer ${fields.firstname} ${fields.lastname} with existing tracking (capitalized field)`);
          
          return res.json({
            success: true,
            data: {
              found: true,
              order: {
                id: record.id,
                customerName: `${fields.firstname || ''} ${fields.lastname || ''}`.trim(),
                email: fields.email || '',
                completed: Boolean(fields.completed),
                tracking: fields.Tracking || fields.tracking || '',
                status: fields.status || 'payment_selection',
                hasExistingTracking: true,
                total: fields.total || '0'
              }
            }
          });
        }

        // If no tracking field match, try broader search in Airtable
        console.log(`No tracking field match found, searching for orders without tracking that could use ${trackingNumber}`);
        
        // Search for orders with payment_selection status that don't have tracking yet
        const ordersQuery = {
          filterByFormula: `AND({status} = "payment_selection", OR({tracking} = "", BLANK({tracking})))`,
          pageSize: 50,
          sort: [{field: "created", direction: "desc"}]
        };

        const ordersRecords = await airtableClient('carts').select(ordersQuery).all();
        console.log(`Found ${ordersRecords.length} orders with payment_selection status and no tracking`);

        if (ordersRecords.length > 0) {
          const record = ordersRecords[0]; // Take the most recent order
          const fields = record.fields;
          
          console.log(`Suggesting order ${record.id} for customer ${fields.firstname} ${fields.lastname} for tracking ${trackingNumber}`);
          
          return res.json({
            success: true,
            data: {
              found: true,
              order: {
                id: record.id,
                customerName: `${fields.firstname || ''} ${fields.lastname || ''}`.trim(),
                email: fields.email || '',
                completed: Boolean(fields.completed),
                tracking: fields.tracking || null,
                status: fields.status || 'payment_selection',
                needsTrackingAssignment: true,
                isPending: true
              }
            }
          });
        }

      } catch (airtableError) {
        console.error('Airtable search failed:', airtableError);
        console.error('Airtable error details:', airtableError.message || 'Unknown Airtable error');
        // Continue to fallback storage search
      }

      // Fallback to using storage search method
      console.log(`Airtable search failed or no results, trying storage search for ${trackingNumber}`);
      
      try {
        const orders = await storage.getOrders({ 
          search: trackingNumber, 
          limit: 20 
        });

        console.log(`Storage search found ${orders.length} orders`);

        if (orders.length > 0) {
          // Prefer orders that don't have tracking assigned yet
          const orderWithoutTracking = orders.find(order => 
            order.status === 'payment_selection' && 
            !order.completed && 
            (!order.tracking || order.tracking.trim() === '')
          );

          const order = orderWithoutTracking || orders[0];
          console.log(`Found order ${order.id} via storage search for ${trackingNumber}`);
          
          return res.json({
            success: true,
            data: {
              found: true,
              order: {
                id: order.id,
                customerName: `${order.firstname || ''} ${order.lastname || ''}`.trim(),
                email: order.email || '',
                completed: order.completed,
                tracking: order.tracking,
                status: order.status,
                needsTrackingAssignment: !order.tracking
              }
            }
          });
        }

        // Final fallback - get any orders that need tracking assignment
        const allOrders = await storage.getOrders({ 
          status: 'payment_selection',
          limit: 100
        });

        // Filter for orders that don't have tracking yet
        const ordersWithoutTracking = allOrders.filter(order => 
          !order.completed && 
          (!order.tracking || order.tracking.trim() === '')
        );

        console.log(`Found ${ordersWithoutTracking.length} orders without tracking (payment_selection status)`);

        if (ordersWithoutTracking.length > 0) {
          const order = ordersWithoutTracking[0];
          console.log(`Suggesting order ${order.id} for tracking ${trackingNumber}`);
          
          return res.json({
            success: true,
            data: {
              found: true,
              order: {
                id: order.id,
                customerName: `${order.firstname || ''} ${order.lastname || ''}`.trim(),
                email: order.email || '',
                completed: order.completed,
                tracking: order.tracking,
                status: order.status,
                isPending: true,
                needsTrackingAssignment: true
              }
            }
          });
        }

      } catch (storageError) {
        console.error('Storage search failed:', storageError);
        console.error('Storage error details:', storageError.message || 'Unknown storage error');
      }

      console.log(`No orders found for tracking number ${trackingNumber}`);
      return res.json({
        success: true,
        data: {
          found: false,
          message: 'No matching orders found for this tracking number'
        }
      });

    } catch (error) {
      console.error('Scanner endpoint error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Provide a more detailed error message
      let errorMessage = 'Failed to process tracking number';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage += `: ${error}`;
      } else {
        errorMessage += ': Unknown error occurred';
      }

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Products endpoints
  app.get('/api/products', async (req, res) => {
    try {
      const { page = '1', limit = '10', category } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const products = await storage.getProducts({
        page: pageNum,
        limit: limitNum,
        category: category as string
      });

      const total = await storage.getProductsCount(category as string);

      res.json({
        success: true,
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products'
      });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getProductById(parseInt(id));

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Get product sales data
      const salesData = await storage.getProductSalesData(parseInt(id));

      res.json({
        success: true,
        data: {
          ...product,
          salesData
        }
      });
    } catch (error) {
      console.error('Error fetching product details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product details'
      });
    }
  });

  app.post('/api/products', async (req, res) => {
    // DISABLED: Prevent creating new records in Airtable
    res.status(403).json({
      success: false,
      message: 'Product creation is disabled to prevent adding unwanted records to Airtable'
    });
  });

  app.patch('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove categoryId/category from the updates to avoid Airtable validation errors
      const safeUpdates = { ...updates };
      delete safeUpdates.category;
      delete safeUpdates.categoryId;

      const updatedProduct = await storage.updateProduct(parseInt(id), safeUpdates);

      res.json({
        success: true,
        data: updatedProduct
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product'
      });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProduct(parseInt(id));

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product'
      });
    }
  });

  // Stripe payment verification endpoint
  app.get('/api/orders/:id/payment-status', async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // If the order has a Stripe payment ID, use that directly
      if (order.stripePaymentId) {
        try {
          const payment = await stripe.paymentIntents.retrieve(order.stripePaymentId);

          const paymentVerified = payment.status === 'succeeded';

          return res.json({
            success: true,
            data: {
              paymentVerified,
              stripeStatus: payment.status,
              paymentDetails: {
                amount: payment.amount / 100, // Convert from cents to dollars
                currency: payment.currency,
                paymentMethod: payment.payment_method_types?.[0] || 'unknown',
                createdAt: new Date(payment.created * 1000).toISOString(),
              }
            }
          });
        } catch (stripeError: any) {
          console.error('Stripe error when retrieving by ID:', stripeError);
        }
      }

      // If we don't have a payment ID or couldn't find the payment, try searching by customer details
      const customerName = `${order.firstname} ${order.lastname}`.trim().toLowerCase();
      const customerEmail = order.email?.toLowerCase();

      if (!customerName && !customerEmail) {
        return res.json({
          success: true,
          data: {
            paymentVerified: false,
            message: 'No customer information found to check payment'
          }
        });
      }

      // First search specifically by email as it's more precise
      const searchMethod = customerEmail ? 'email' : 'name';
      console.log(`Searching Stripe payments for customer by ${searchMethod}: ${customerEmail || customerName}`);

      try {
        let matchingPayment = null;
        let stripeLookupFailed = false;

        try {
          // If we have an email, try to search for customers first (more accurate)
          if (customerEmail) {
            try {
              // First try to find a customer with this email
              const customers = await stripe.customers.list({
                email: customerEmail,
                limit: 5
              });

              if (customers.data.length > 0) {
                // Get the customer ID and search payments by this customer
                const customerId = customers.data[0].id;
                console.log(`Found Stripe customer with ID ${customerId} for email ${customerEmail}`);

                const customerPayments = await stripe.paymentIntents.list({
                  customer: customerId,
                  limit: 5
                });

                if (customerPayments.data.length > 0) {
                  matchingPayment = customerPayments.data[0]; // Use the most recent payment
                  console.log(`Found payment by customer ID: ${matchingPayment.id}`);
                }
              } else {
                console.log(`No customer found with email ${customerEmail}, falling back to payment search`);
              }
            } catch (error: any) {
              console.log('Error searching for customers:', error.message);
              // Continue to generic search
            }
          }

          // If we didn't find a payment by customer ID, try searching payments directly
          if (!matchingPayment) {
            // Get recent payments from Stripe (increased limit to find older payments)
            const payments = await stripe.paymentIntents.list({
              limit: 100
            });

            // Only search for payments with exact email match AND successful status
            let matchingPayments: any[] = [];

            if (customerEmail) {
              // Check each payment for exact email match
              for (const payment of payments.data) {
                let emailMatch = false;

                // Check receipt email for exact match
                if (payment.receipt_email === customerEmail) {
                  emailMatch = true;
                }

                // Only include payments with exact email match AND successful status
                if (emailMatch && payment.status === 'succeeded') {
                  matchingPayments.push(payment);
                }
              }
            }

            console.log(`Found ${matchingPayments.length} matching payments for ${customerEmail || customerName}`);

            // First check for multiple payments from the same customer
            if (matchingPayments.length > 1) {
              console.log(`Multiple payments (${matchingPayments.length}) found for customer ${customerEmail || customerName}`);

              // Check for any successful payment among those found
              const successfulPayment = matchingPayments.find(payment => payment.status === 'succeeded');

              if (successfulPayment) {
                console.log(`Found successful payment: ${successfulPayment.id} among multiple attempts`);
                matchingPayment = successfulPayment;

                // Log other payment attempts
                matchingPayments
                  .filter(p => p.id !== successfulPayment.id)
                  .forEach(p => {
                    console.log(`Other payment attempt: ${p.id} with status: ${p.status}`);
                  });
              } else {
                // Sort by creation date (newest first)
                matchingPayments.sort((a, b) => b.created - a.created);
                matchingPayment = matchingPayments[0];
                console.log(`Multiple payments found but none successful. Using most recent: ${matchingPayment.id} with status ${matchingPayment.status}`);
              }
            } 
            // Single payment found 
            else if (matchingPayments.length === 1) {
              matchingPayment = matchingPayments[0];
              console.log(`Single payment found: ${matchingPayment.id} with status ${matchingPayment.status}`);
            }
          }
        } catch (error: any) {
          console.error('Stripe API error, falling back to simulated payment check:', error.message);
          stripeLookupFailed = true;
        }

        // Only use real Stripe payments - no simulated payments
        if (!matchingPayment) {
          console.log(`No valid payment found for ${order.email || order.firstname} ${order.lastname}`);
        }

        if (matchingPayment) {
          const paymentVerified = matchingPayment.status === 'succeeded';

          // Cache the payment status for sorting
          paymentStatusCache.set(id, paymentVerified);

          // Create a clear message that indicates payment status
          let statusMessage = paymentVerified 
            ? 'Payment Verified: Transaction was successful' 
            : `Payment Found but Status is: ${matchingPayment.status}`;

          // Remove simulated payment logic - only use real Stripe payments

          // Add details about checking multiple transactions if applicable
          if (typeof matchingPayments !== 'undefined' && matchingPayments.length > 1) {
            statusMessage += ` (${matchingPayments.length} transactions found for this customer)`;
          }

          return res.json({
            success: true,
            data: {
              paymentVerified,
              stripeStatus: matchingPayment.status,
              paymentDetails: {
                amount: matchingPayment.amount / 100,
                currency: matchingPayment.currency,
                paymentMethod: matchingPayment.payment_method_types?.[0] || 'unknown',
                createdAt: new Date(matchingPayment.created * 1000).toISOString(),
              },
              message: statusMessage
            }
          });
        } else {
          return res.json({
            success: true,
            data: {
              paymentVerified: false,
              message: `No matching payment found for ${customerName || customerEmail}`
            }
          });
        }
      } catch (stripeError: any) {
        console.error('Stripe error when searching by customer:', stripeError);
        return res.json({
          success: true,
          data: {
            paymentVerified: false,
            message: 'Error searching for payment in Stripe',
            error: stripeError.message || 'Unknown Stripe error'
          }
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check payment status'
      });
    }
  });

  // Dashboard endpoints
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  });

  app.get('/api/dashboard/sales', async (req, res) => {
    try {
      const salesData = await storage.getSalesData();

      res.json({
        success: true,
        data: salesData
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales data'
      });
    }
  });

  app.get('/api/dashboard/popular-products', async (req, res) => {
    try {
      const popularProducts = await storage.getPopularProducts();

      res.json({
        success: true,
        data: popularProducts
      });
    } catch (error) {
      console.error('Error fetching popular products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular products'
      });
    }
  });

  // Get customers with order info
  app.get('/api/customers', async (req, res) => {
    try {
      // Get parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';

      console.log('Fetching customers with params:', { page, limit, search });

      // Get all orders to extract customer information
      const orders = await storage.getOrders({ limit: 1000 });
      console.log(`Got ${orders.length} orders to extract customer info from`);

      // Create a map to store unique customers
      const customerMap = new Map();

      // Process orders to extract customer data
      for (const order of orders) {
        // Skip orders without essential customer info
        if (!order.email) continue;

        const customerId = order.email.toLowerCase();

        // Calculate order total
        const orderTotal = parseFloat(order.total || '0');
        const orderDate = order.createdAt || new Date();

        if (customerMap.has(customerId)) {
          // Update existing customer info
          const customer = customerMap.get(customerId);
          customer.totalOrders += 1;
          customer.totalSpent += orderTotal;

          // Add order to customer's orders list
          customer.orders.push({
            id: order.id,
            status: order.status || 'unknown',
            total: orderTotal,
            items: 1, // Simplified count
            createdAt: orderDate,
            affiliateCode: order.affiliateCode || null
          });

          // Track unique affiliate codes used by this customer
          if (order.affiliateCode && !customer.affiliateCodes.includes(order.affiliateCode)) {
            customer.affiliateCodes.push(order.affiliateCode);
          }

          // Update last order date if this order is newer
          if (orderDate > customer.lastOrderDate) {
            customer.lastOrderDate = orderDate;
          }
        } else {
          // Create new customer entry
          customerMap.set(customerId, {
            id: customerId,
            firstname: order.firstname || '',
            lastname: order.lastname || '',
            email: order.email || '',
            phone: order.phone || '',
            address: order.address || '',
            city: order.city || '',
            state: order.state || '',
            zip: order.zip || '',
            totalOrders: 1,
            totalSpent: orderTotal,
            lastOrderDate: orderDate,
            createdAt: orderDate,
            affiliateCodes: order.affiliateCode ? [order.affiliateCode] : [],
            orders: [{
              id: order.id,
              status: order.status || 'unknown',
              total: orderTotal,
              items: 1, // Simplified count
              createdAt: orderDate,
              affiliateCode: order.affiliateCode || null
            }]
          });
        }
      }

      // Convert map to array
      let customers = Array.from(customerMap.values());
      console.log(`Extracted ${customers.length} unique customers`);

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        customers = customers.filter(customer => {
          // Safe string search
          const firstname = String(customer.firstname || '');
          const lastname = String(customer.lastname || '');
          const email = String(customer.email || '');
          const phone = String(customer.phone || '');

          return firstname.toLowerCase().includes(searchLower) ||
                 lastname.toLowerCase().includes(searchLower) ||
                 email.toLowerCase().includes(searchLower) ||
                 phone.includes(searchLower);
        });
        console.log(`Filtered to ${customers.length} customers after search`);
      }

      // Sort by most recent order date
      customers.sort((a, b) => {
        const dateA = a.lastOrderDate instanceof Date ? a.lastOrderDate.getTime() : 0;
        const dateB = b.lastOrderDate instanceof Date ? b.lastOrderDate.getTime() : 0;
        return dateB - dateA;
      });

      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCustomers = customers.slice(startIndex, endIndex);

      console.log(`Returning ${paginatedCustomers.length} customers (page ${page}, limit ${limit})`);

      // Return the customers data with pagination
      res.json({
        success: true,
        data: paginatedCustomers,
        pagination: {
          page,
          limit,
          total: customers.length
        }
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customers'
      });
    }
  });

  // Email notification routes
  app.post('/api/orders/:id/send-confirmation', async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const emailSent = await emailService.sendOrderConfirmation(order);

      if (emailSent) {
        // Update the order to mark confirmation email as sent
        await storage.updateOrder(id, { confirmationEmailSent: true });

        res.json({
          success: true,
          message: 'Confirmation email sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send confirmation email. Email service may not be configured.'
        });
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send confirmation email'
      });
    }
  });

  app.post('/api/orders/:id/send-shipping', async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const emailSent = await emailService.sendShippingNotification(order);

      if (emailSent) {
        // Update the order to mark shipping email as sent
        await storage.updateOrder(id, { shippingEmailSent: true });

        res.json({
          success: true,
          message: 'Shipping notification sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send shipping notification. Email service may not be configured.'
        });
      }
    } catch (error) {
      console.error('Error sending shipping notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send shipping notification'
      });
    }
  });

  // EasyPost shipping routes
  app.post('/api/orders/:id/create-shipping-label', async (req, res) => {
    try {
      const { id } = req.params;
      const { serviceType = 'Priority' } = req.body;

      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const { easyPostService } = await import('./easypost');

      // Parse cart items to determine package specs
      const cartItems = order.cartItems && Array.isArray(order.cartItems) 
        ? order.cartItems 
        : (order.cartitems ? JSON.parse(order.cartitems) : []);

      const itemCount = cartItems.reduce((total: number, item: any) => total + (item.quantity || 1), 0);
      const packageSpecs = easyPostService.getPackageSpecs(itemCount);

      const toAddress = {
        name: `${order.firstname} ${order.lastname}`,
        address: order.address || '',
        city: order.city || '',
        state: order.state || '',
        zip: order.zip || '',
        phone: order.phone || ''
      };

      const fromAddress = easyPostService.getDefaultFromAddress();

      // Validate customer address first
      const addressValid = await easyPostService.validateAddress(toAddress);
      if (!addressValid) {
        return res.status(400).json({
          success: false,
          message: 'Customer address could not be validated. Please verify the address details.'
        });
      }

      const labelRequest = {
        toAddress,
        fromAddress,
        serviceType: serviceType as 'Ground' | 'Priority' | 'Express',
        weight: packageSpecs.weight,
        length: packageSpecs.length,
        width: packageSpecs.width,
        height: packageSpecs.height
      };

      const labelResponse = await easyPostService.createShippingLabel(labelRequest);

      // Update order with tracking number and shipping info
      await storage.updateOrder(id, {
        trackingNumber: labelResponse.trackingNumber,
        shippingCost: labelResponse.postage,
        shippingLabelCreated: true,
        shipped: true
      });

      res.json({
        success: true,
        data: {
          trackingNumber: labelResponse.trackingNumber,
          labelUrl: labelResponse.labelUrl,
          postage: labelResponse.postage,
          carrier: labelResponse.carrier
        }
      });
    } catch (error) {
      console.error('Error creating shipping label:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create shipping label'
      });
    }
  });

  app.get('/api/orders/:id/tracking', async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(id);

      if (!order || !order.trackingNumber) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or tracking number not available'
        });
      }

      const { easyPostService } = await import('./easypost');
      const trackingInfo = await easyPostService.getTrackingInfo(order.trackingNumber);

      res.json({
        success: true,
        data: trackingInfo
      });
    } catch (error) {
      console.error('Error getting tracking info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tracking information'
      });
    }
  });

  app.post('/api/validate-address', async (req, res) => {
    try {
      const { address } = req.body;
      const { easyPostService } = await import('./easypost');

      const isValid = await easyPostService.validateAddress(address);

      res.json({
        success: true,
        data: { valid: isValid }
      });
    } catch (error) {
      console.error('Error validating address:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate address'
      });
    }
  });

  // Stripe payment routes
  app.post('/api/create-payment-intent', async (req, res) => {
    try {
      const { amount, orderId, customerEmail, metadata = {} } = req.body;

      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid amount provided' 
        });
      }

      // Get additional order information if an orderId was provided
      let order = null;
      if (orderId) {
        try {
          order = await storage.getOrderById(orderId);
        } catch (orderLookupError) {          console.warn('Could not find order details for payment:', orderLookupError);
          // Continue without order details - not a fatal error
        }
      }

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: 'usd',
        payment_method_types: ['card'],
        receipt_email: customerEmail || (order ? order.email : undefined),
        description: order ? `Payment for order ${order.checkoutId}` : `Payment of $${amount}`,
        // Include all metadata provided by the client, plus our own data
        metadata: {
          source: 'True Aminos Admin Dashboard',
          orderId: orderId || '',
          ...metadata
        }
      });

      // If we have an order, update it with the Stripe payment ID
      if (order && orderId) {
        try {
          await storage.updateOrder(orderId, {
            stripePaymentId: paymentIntent.id
          });
        } catch (updateError) {
          console.warn('Could not update order with payment ID:', updateError);
          // Not a fatal error - continue
        }
      }

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating payment intent: ' + error.message 
      });
    }
  });

  // Affiliate routes
  app.get('/api/affiliates', async (req, res) => {
    try {
      const { page = 1, limit = 10, search, status } = req.query;

      const { fetchAffiliates } = await import('../client/src/lib/airtable');
      const result = await fetchAffiliates({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        status: status as string,
      });

      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
        },
      });
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch affiliates',
      });
    }
  });

  app.get('/api/affiliates/:code/orders', async (req, res) => {
    try {
      const { code } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const { fetchOrdersByAffiliateCode } = await import('../client/src/lib/airtable');
      const result = await fetchOrdersByAffiliateCode(code, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
        },
      });
    } catch (error) {
      console.error('Error fetching affiliate orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch affiliate orders',
      });
    }
  });

  app.get('/api/affiliates/:code/stats', async (req, res) => {
    try {
      const { code } = req.params;

      const { getAffiliateStats } = await import('../client/src/lib/airtable');
      const stats = await getAffiliateStats(code);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch affiliate stats',
      });
    }
  });

  app.post('/api/affiliates', async (req, res) => {
    try {
      const affiliateData = req.body;

      const { createAffiliate } = await import('../client/src/lib/airtable');
      const newAffiliate = await createAffiliate(affiliateData);

      res.json({
        success: true,
        data: newAffiliate,
      });
    } catch (error) {
      console.error('Error creating affiliate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create affiliate',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
  });

  // Google Cloud Vision OCR endpoint
  app.post('/api/ocr/google-vision', async (req: Request, res: Response) => {
    try {
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ success: false, error: 'No image data provided' });
      }

      const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
      if (!apiKey) {
        console.error('Google Cloud Vision API key not found in environment variables');
        return res.status(500).json({ success: false, error: 'OCR service not configured' });
      }

      // Call Google Cloud Vision API
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageData
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 50
                  }
                ],
                imageContext: {
                  textDetectionParams: {
                    enableTextDetectionConfidenceScore: true
                  }
                }
              }
            ]
          })
        }
      );

      if (!visionResponse.ok) {
        const errorData = await visionResponse.text();
        console.error('Google Vision API error:', errorData);
        return res.status(500).json({ success: false, error: 'OCR processing failed' });
      }

      const visionResult = await visionResponse.json();

      if (visionResult.responses && visionResult.responses[0] && visionResult.responses[0].textAnnotations) {
        const detectedText = visionResult.responses[0].textAnnotations[0]?.description || '';
        console.log('Google Vision detected text:', detectedText);

        return res.json({ 
          success: true, 
          text: detectedText,
          confidence: visionResult.responses[0].textAnnotations[0]?.confidence || 0
        });
      } else {
        console.log('No text detected by Google Vision');
        return res.json({ success: true, text: '', confidence: 0 });
      }

    } catch (error) {
      console.error('Google Vision OCR error:', error);
      res.status(500).json({ success: false, error: 'OCR processing failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}