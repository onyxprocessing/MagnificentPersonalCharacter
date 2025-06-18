
import fetch from 'node-fetch';
import FormData from 'form-data';

// USPS API configuration
const USPS_API_BASE_URL = 'https://api.usps.com';
const USPS_OAUTH_URL = 'https://api.usps.com/oauth2/v3/token';

interface USPSCredentials {
  clientId: string;
  clientSecret: string;
}

interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

interface ShippingLabelRequest {
  toAddress: ShippingAddress;
  fromAddress: ShippingAddress;
  packageType: 'PACKAGE' | 'ENVELOPE' | 'FLAT_RATE_BOX';
  serviceType: 'GROUND_ADVANTAGE' | 'PRIORITY' | 'PRIORITY_EXPRESS';
  weight: number; // in ounces
  length?: number;
  width?: number;
  height?: number;
}

interface USPSTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface USPSLabelResponse {
  labelImage: string; // Base64 encoded PDF
  trackingNumber: string;
  postage: number;
  zone: string;
}

class USPSService {
  private credentials: USPSCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.credentials = {
      clientId: process.env.USPS_CLIENT_ID || '',
      clientSecret: process.env.USPS_CLIENT_SECRET || ''
    };

    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      console.warn('USPS API credentials not configured. Set USPS_CLIENT_ID and USPS_CLIENT_SECRET environment variables.');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.credentials.clientId || !this.credentials.clientSecret) {
      throw new Error('USPS API credentials not configured');
    }

    const formData = new FormData();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', this.credentials.clientId);
    formData.append('client_secret', this.credentials.clientSecret);
    formData.append('scope', 'addresses labels tracking');

    try {
      const response = await fetch(USPS_OAUTH_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`USPS OAuth failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as USPSTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000) - 60000); // Expire 1 minute early

      return this.accessToken;
    } catch (error) {
      console.error('Error getting USPS access token:', error);
      throw new Error('Failed to authenticate with USPS API');
    }
  }

  async validateAddress(address: ShippingAddress): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${USPS_API_BASE_URL}/addresses/v3/address`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          streetAddress: address.address,
          city: address.city,
          state: address.state,
          zipCode: address.zip
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.deliverable === true;
      }
      
      return false;
    } catch (error) {
      console.error('Error validating address:', error);
      return false;
    }
  }

  async createShippingLabel(request: ShippingLabelRequest): Promise<USPSLabelResponse> {
    try {
      const token = await this.getAccessToken();

      const labelRequest = {
        imageInfo: {
          imageType: 'PDF',
          labelType: 'SHIPPING_LABEL'
        },
        toAddress: {
          firstName: request.toAddress.name.split(' ')[0] || '',
          lastName: request.toAddress.name.split(' ').slice(1).join(' ') || '',
          streetAddress: request.toAddress.address,
          city: request.toAddress.city,
          state: request.toAddress.state,
          zipCode: request.toAddress.zip,
          phone: request.toAddress.phone || ''
        },
        fromAddress: {
          firstName: request.fromAddress.name.split(' ')[0] || '',
          lastName: request.fromAddress.name.split(' ').slice(1).join(' ') || '',
          streetAddress: request.fromAddress.address,
          city: request.fromAddress.city,
          state: request.fromAddress.state,
          zipCode: request.fromAddress.zip,
          phone: request.fromAddress.phone || ''
        },
        packageDescription: {
          packageType: request.packageType,
          weight: request.weight,
          length: request.length || 6,
          width: request.width || 4,
          height: request.height || 2,
          mailClass: request.serviceType,
          processingCategory: 'MACHINABLE'
        }
      };

      const response = await fetch(`${USPS_API_BASE_URL}/labels/v3/label`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(labelRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`USPS Label API failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      return {
        labelImage: data.labelImage,
        trackingNumber: data.trackingNumber,
        postage: data.postage,
        zone: data.zone || ''
      };
    } catch (error) {
      console.error('Error creating shipping label:', error);
      throw new Error('Failed to create shipping label');
    }
  }

  async getTrackingInfo(trackingNumber: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${USPS_API_BASE_URL}/tracking/v3/tracking/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`USPS Tracking API failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting tracking info:', error);
      throw new Error('Failed to get tracking information');
    }
  }

  // Helper method to determine package specifications based on typical peptide vial shipments
  getPackageSpecs(itemCount: number = 1): { weight: number, packageType: 'PACKAGE' | 'ENVELOPE' | 'FLAT_RATE_BOX' } {
    // Most peptide vials are very light, typically under 1 oz each
    const baseWeight = 2; // Packaging weight in ounces
    const itemWeight = 0.5; // Average vial weight in ounces
    const totalWeight = baseWeight + (itemCount * itemWeight);

    if (totalWeight <= 3 && itemCount <= 2) {
      return { weight: totalWeight, packageType: 'ENVELOPE' };
    } else if (totalWeight <= 16) {
      return { weight: totalWeight, packageType: 'PACKAGE' };
    } else {
      return { weight: totalWeight, packageType: 'FLAT_RATE_BOX' };
    }
  }

  // Helper method to get default from address (your business address)
  getDefaultFromAddress(): ShippingAddress {
    return {
      name: process.env.BUSINESS_NAME || 'True Aminos',
      address: process.env.BUSINESS_ADDRESS || '123 Business St',
      city: process.env.BUSINESS_CITY || 'Business City',
      state: process.env.BUSINESS_STATE || 'CA',
      zip: process.env.BUSINESS_ZIP || '90210',
      phone: process.env.BUSINESS_PHONE || '555-123-4567'
    };
  }
}

export const uspsService = new USPSService();
export type { ShippingAddress, ShippingLabelRequest, USPSLabelResponse };
