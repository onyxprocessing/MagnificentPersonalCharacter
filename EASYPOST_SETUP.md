
# EasyPost API Integration Setup

## Required Environment Variables

Add these environment variables to your Replit Secrets:

### EasyPost API Credentials
- `EASYPOST_API_KEY` - Your EasyPost API key (test key: EZTK447d7d7dc214400d8697559657869e65aOkLdIKBolsqhUaT3weymQ)

### Business Information (for return address)
- `BUSINESS_NAME` - Your business name (e.g., "True Aminos")
- `BUSINESS_ADDRESS` - Your business street address
- `BUSINESS_CITY` - Your business city
- `BUSINESS_STATE` - Your business state (2-letter code)
- `BUSINESS_ZIP` - Your business ZIP code
- `BUSINESS_PHONE` - Your business phone number

## Getting EasyPost API Access

1. Go to [EasyPost.com](https://www.easypost.com/)
2. Create an account and get your API keys
3. Start with the test key provided above
4. Add your production key when ready to go live

## Features Added

- **Easy Label Creation**: Create shipping labels with a simple API call
- **Automatic Address Validation**: Validate customer addresses before creating labels
- **Multiple Service Types**: Support for Ground Advantage, Priority Mail, and Priority Express
- **Label URLs**: Get direct links to downloadable/printable PDF labels
- **Automatic Tracking**: Tracking numbers are automatically added to orders
- **Package Detection**: Automatically determines package dimensions based on order contents
- **Cost Calculation**: Real postage costs returned and stored with orders

## Usage

1. Open any order in the fulfillment modal
2. Select the desired shipping service type
3. Click "Create Label" to generate USPS shipping label via EasyPost
4. Click "View/Download Label" to open the PDF label
5. Tracking number is automatically saved to the order

## Advantages over Direct USPS API

- **Simpler Integration**: No OAuth token management needed
- **Better Reliability**: EasyPost handles USPS API issues and downtime
- **Rate Shopping**: Automatically finds the best rates
- **Address Validation**: Built-in validation that works consistently
- **Multiple Carriers**: Easy to add FedEx, UPS later if needed

## Error Handling

- Address validation prevents creating labels for invalid addresses
- Clear error messages for API failures
- Automatic retry logic built into EasyPost
- Fallback to manual tracking number entry if needed

## Cost

EasyPost charges a small fee per label (typically $0.05) but saves significant development time and provides better reliability than direct carrier APIs.
