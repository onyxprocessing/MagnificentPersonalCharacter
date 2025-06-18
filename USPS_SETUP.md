
# USPS API Integration Setup

## Required Environment Variables

Add these environment variables to your Replit Secrets:

### USPS API Credentials
- `USPS_CLIENT_ID` - Your USPS API Client ID
- `USPS_CLIENT_SECRET` - Your USPS API Client Secret

### Business Information (for return address)
- `BUSINESS_NAME` - Your business name (e.g., "True Aminos")
- `BUSINESS_ADDRESS` - Your business street address
- `BUSINESS_CITY` - Your business city
- `BUSINESS_STATE` - Your business state (2-letter code)
- `BUSINESS_ZIP` - Your business ZIP code
- `BUSINESS_PHONE` - Your business phone number

## Getting USPS API Access

1. Go to [USPS Developer Portal](https://developer.usps.com/)
2. Create an account and register your application
3. Get your Client ID and Client Secret
4. Add them to your Replit Secrets

## Features Added

- **Automatic Label Creation**: Create shipping labels directly from order fulfillment modal
- **Address Validation**: Validate customer addresses before creating labels
- **Multiple Service Types**: Support for Ground Advantage, Priority Mail, and Priority Express
- **Label Download/Print**: Download labels as PDF or print directly
- **Automatic Tracking**: Tracking numbers are automatically added to orders
- **Package Type Detection**: Automatically determines package type based on order contents

## Usage

1. Open any order in the fulfillment modal
2. Select the desired shipping service type
3. Click "Create Label" to generate USPS shipping label
4. Download or print the label
5. Tracking number is automatically saved to the order

## Cost Calculation

The actual postage cost is returned from USPS and stored with the order. This gives you accurate shipping costs for accounting purposes.

## Error Handling

- Address validation prevents creating labels for invalid addresses
- Clear error messages for API failures
- Fallback to manual tracking number entry if API is unavailable
