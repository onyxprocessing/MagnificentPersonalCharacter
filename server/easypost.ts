import EasyPost from '@easypost/api';

// EasyPost API configuration
const api = new EasyPost(process.env.EASYPOST_API_KEY || 'EZTK447d7d7dc214400d8697559657869e65aOkLdIKBolsqhUaT3weymQ');

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
  serviceType: 'Ground' | 'Priority' | 'Express';
  weight: number; // in ounces
  length?: number;
  width?: number;
  height?: number;
}

interface EasyPostLabelResponse {
  labelUrl: string;
  trackingNumber: string;
  postage: number;
  carrier: string;
}

class EasyPostService {
  async createShippingLabel(request: ShippingLabelRequest): Promise<EasyPostLabelResponse> {
    try {
      // Create addresses
      const toAddress = await api.Address.create({
        name: request.toAddress.name,
        street1: request.toAddress.address,
        city: request.toAddress.city,
        state: request.toAddress.state,
        zip: request.toAddress.zip,
        country: 'US',
        phone: request.toAddress.phone || '',
      });

      const fromAddress = await api.Address.create({
        name: request.fromAddress.name,
        street1: request.fromAddress.address,
        city: request.fromAddress.city,
        state: request.fromAddress.state,
        zip: request.fromAddress.zip,
        country: 'US',
        phone: request.fromAddress.phone || '',
      });

      // Create parcel
      const parcel = await api.Parcel.create({
        length: request.length || 6,
        width: request.width || 4,
        height: request.height || 2,
        weight: request.weight,
      });

      // Create shipment with specific carrier account
      const shipment = await api.Shipment.create({
        to_address: toAddress,
        from_address: fromAddress,
        parcel: parcel,
        carrier_accounts: ['ca_17ee02d95ec64ad9aa35dac979ca1bf5'], // Your USPS carrier account ID
        service: request.serviceType,
        options: { label_format: 'PDF' },
      });

      // Get the lowest rate
      const lowestRate = shipment.lowestRate();
      console.log('Available rates:', shipment.rates);
      console.log('Lowest rate:', lowestRate);

      // Buy the label with the lowest rate
      const bought = await api.Shipment.buy(shipment.id, lowestRate);

      return {
        labelUrl: bought.postage_label.label_url,
        trackingNumber: bought.tracking_code,
        postage: parseFloat(bought.selected_rate.rate),
        carrier: 'USPS'
      };
    } catch (error: any) {
      console.error('EasyPost detailed error:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
        statusCode: error.statusCode,
        fullError: error
      });

      let errorMessage = 'Failed to create shipping label';

      if (error.code === 'SHIPMENT.CARRIER_ACCOUNTS.INVALID') {
        errorMessage = 'USPS carrier account not configured in EasyPost. Please set up USPS carrier account in your EasyPost dashboard.';
      } else if (error.code) {
        errorMessage = `EasyPost error: ${error.code} - ${error.message}`;
      } else if (error.message) {
        errorMessage = `EasyPost error: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  async validateAddress(address: ShippingAddress): Promise<boolean> {
    try {
      const addressObj = await api.Address.create({
        name: address.name,
        street1: address.address,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: 'US',
      });

      // EasyPost automatically validates addresses during creation
      // If it throws an error, the address is invalid
      return true;
    } catch (error) {
      console.error('Address validation error:', error);
      return false;
    }
  }

  async getTrackingInfo(trackingNumber: string): Promise<any> {
    try {
      const tracker = await api.Tracker.create({
        tracking_code: trackingNumber,
        carrier: 'USPS'
      });

      return tracker;
    } catch (error) {
      console.error('Tracking error:', error);
      throw new Error('Failed to get tracking information');
    }
  }

  // Helper method to determine package specifications based on typical peptide vial shipments
  getPackageSpecs(itemCount: number = 1): { weight: number, length: number, width: number, height: number } {
    // Most peptide vials are very light, typically under 1 oz each
    const baseWeight = 2; // Packaging weight in ounces
    const itemWeight = 0.5; // Average vial weight in ounces
    const totalWeight = baseWeight + (itemCount * itemWeight);

    if (totalWeight <= 3 && itemCount <= 2) {
      return { weight: totalWeight, length: 6, width: 4, height: 1 }; // Small envelope
    } else if (totalWeight <= 16) {
      return { weight: totalWeight, length: 6, width: 4, height: 2 }; // Small package
    } else {
      return { weight: totalWeight, length: 8, width: 6, height: 4 }; // Larger package
    }
  }

  // Helper method to get default from address (your business address)
  getDefaultFromAddress(): ShippingAddress {
    return {
      name: process.env.BUSINESS_NAME || 'True Aminos',
      address: process.env.BUSINESS_ADDRESS || '456 Warehouse Blvd',
      city: process.env.BUSINESS_CITY || 'Franklin',
      state: process.env.BUSINESS_STATE || 'TN',
      zip: process.env.BUSINESS_ZIP || '37064',
      phone: process.env.BUSINESS_PHONE || '5551234567'
    };
  }
}

export const easyPostService = new EasyPostService();
export type { ShippingAddress, ShippingLabelRequest, EasyPostLabelResponse };