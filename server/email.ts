import nodemailer from 'nodemailer';
import { Order } from '../shared/schema.js';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string = '';

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    // Check for email configuration
    const emailHost = process.env.EMAIL_HOST || 'smtppro.zoho.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '465');
    const emailUser = process.env.EMAIL_USER || 'info@trueaminos.com';
    const emailPass = process.env.EMAIL_PASS || 'Fra@1705';
    const emailFrom = process.env.EMAIL_FROM || 'info@trueaminos.com';

    if (!emailUser || !emailPass) {
      console.log('Email credentials not provided. Email service disabled.');
      return;
    }

    this.fromEmail = emailFrom;

    const config: EmailConfig = {
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendOrderConfirmation(order: Order): Promise<boolean> {
    if (!this.transporter || !order.email) {
      console.log('Email service not configured or no email address');
      return false;
    }

    try {
      const subject = `Order Confirmation - ${order.checkoutId}`;
      const html = this.generateConfirmationEmail(order);

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: order.email,
        subject,
        html
      });

      console.log(`Confirmation email sent to ${order.email}`);
      return true;
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return false;
    }
  }

  async sendShippingNotification(order: Order): Promise<boolean> {
    if (!this.transporter || !order.email) {
      console.log('Email service not configured or no email address');
      return false;
    }

    try {
      const subject = `Your Order Has Shipped - ${order.checkoutId}`;
      const html = this.generateShippingEmail(order);

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: order.email,
        subject,
        html
      });

      console.log(`Shipping email sent to ${order.email}`);
      return true;
    } catch (error) {
      console.error('Error sending shipping email:', error);
      return false;
    }
  }

  private generateConfirmationEmail(order: Order): string {
    const itemsList = order.cartItems?.map(item => 
      `<li>${item.product?.name || 'Product'} (${item.selectedWeight}) - Quantity: ${item.quantity}</li>`
    ).join('') || '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Dear ${order.firstname} ${order.lastname},</p>
        <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
        
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h3>Order Details:</h3>
          <p><strong>Order ID:</strong> ${order.checkoutId}</p>
          <p><strong>Total:</strong> $${order.total}</p>
          
          <h4>Items Ordered:</h4>
          <ul>${itemsList}</ul>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h3>Shipping Address:</h3>
          <p>${order.address}<br>
          ${order.city}, ${order.state} ${order.zip}</p>
        </div>
        
        <p>We'll send you another email when your order ships.</p>
        
        <p>Best regards,<br>TrueAminos Team</p>
      </div>
    `;
  }

  private generateShippingEmail(order: Order): string {
    const itemsList = order.cartItems?.map(item => 
      `<li>${item.product?.name || 'Product'} (${item.selectedWeight}) - Quantity: ${item.quantity}</li>`
    ).join('') || '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Order Has Shipped!</h2>
        <p>Dear ${order.firstname} ${order.lastname},</p>
        <p>Great news! Your order has been shipped and is on its way to you.</p>
        
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h3>Order Details:</h3>
          <p><strong>Order ID:</strong> ${order.checkoutId}</p>
          <p><strong>Total:</strong> $${order.total}</p>
          ${order.tracking ? `<p><strong>Tracking Number:</strong> <a href="https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${order.tracking}" style="color: #0066cc; text-decoration: none;">${order.tracking}</a></p>
          <p><a href="https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${order.tracking}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Your Package</a></p>` : ''}
          
          <h4>Items Shipped:</h4>
          <ul>${itemsList}</ul>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h3>Shipping Address:</h3>
          <p>${order.address}<br>
          ${order.city}, ${order.state} ${order.zip}</p>
        </div>
        
        <p>Your order should arrive within the expected delivery timeframe.</p>
        
        <p>Best regards,<br>TrueAminos Team</p>
      </div>
    `;
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}

export const emailService = new EmailService();