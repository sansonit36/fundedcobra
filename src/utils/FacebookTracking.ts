import ReactPixel from 'react-facebook-pixel';
import axios from 'axios';

const PIXEL_ID = '1765985323943547';  // Your Facebook Pixel ID
const ACCESS_TOKEN = 'EAANfl9zblnMBOy5wwmZA0JapE6IrliSh5WDEKLjqmDbHdp6j3Pz9O8C169uLmx1uJ5DZB56Vjwl70rRhOiyGsIwquwKZCammxZBHYbdN3IkPW7hBrHKfJK9ZBHNHMzvQhZCSyhM6xHbUH9p6rwb2CZB0it8qcF6CZBh66NM6mwVKHxaCrdXuZBZCclJdofB9k4klyp3AZDZD'; // Your Facebook Access Token
const API_VERSION = 'v18.0';

export const initFacebookPixel = () => {
  // Prevent double initialization
  if (window.fbq) {
    console.log('Facebook Pixel already initialized');
    return;
  }

  const options = {
    autoConfig: true,
    debug: false
  };

  ReactPixel.init(PIXEL_ID, undefined, options);
  ReactPixel.pageView();
};

export const trackPurchaseSubmission = (purchaseDetails: {
  amount: number;
  packageName: string;
  requestId?: string;
}) => {
  try {
    // Browser Pixel tracking for initial purchase submission
    ReactPixel.track('Purchase', {
      value: purchaseDetails.amount,
      currency: 'USD',
      content_name: purchaseDetails.packageName,
      content_category: 'Trading Account',
      transaction_id: purchaseDetails.requestId,
      status: 'submitted'
    });
  } catch (error) {
    console.error('Error tracking purchase submission:', error);
  }
};

export const trackPurchaseApproval = async (requestDetails: {
  requestId: string;
  userId: string;
  amount: number;
  packageName: string;
  packageBalance: number;
}) => {
  try {
    // Browser Pixel tracking
    ReactPixel.track('PurchaseApproved', {
      value: requestDetails.amount,
      currency: 'USD',
      content_name: requestDetails.packageName,
      content_category: 'Trading Account',
      transaction_id: requestDetails.requestId,
      status: 'approved'
    });

    // Server-side CAPI tracking
    const eventData = {
      data: [{
        event_name: 'PurchaseApproved',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: window.location.href,
        user_data: {
          client_user_agent: navigator.userAgent
        },
        custom_data: {
          value: requestDetails.amount,
          currency: 'USD',
          content_name: requestDetails.packageName,
          content_category: 'Trading Account',
          transaction_id: requestDetails.requestId,
          package_balance: requestDetails.packageBalance,
          status: 'approved'
        }
      }],
      access_token: ACCESS_TOKEN
    };

    await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`,
      eventData
    );

  } catch (error) {
    console.error('Error tracking approval:', error);
  }
};

export const trackPurchaseRejection = async (requestDetails: {
  requestId: string;
  userId: string;
  amount: number;
  packageName: string;
  rejectionReason: string;
}) => {
  try {
    // Browser Pixel tracking
    ReactPixel.track('PurchaseRejected', {
      value: requestDetails.amount,
      currency: 'USD',
      content_name: requestDetails.packageName,
      content_category: 'Trading Account',
      transaction_id: requestDetails.requestId,
      status: 'rejected',
      rejection_reason: requestDetails.rejectionReason
    });

    // Server-side CAPI tracking
    const eventData = {
      data: [{
        event_name: 'PurchaseRejected',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: window.location.href,
        user_data: {
          client_user_agent: navigator.userAgent
        },
        custom_data: {
          value: requestDetails.amount,
          currency: 'USD',
          content_name: requestDetails.packageName,
          content_category: 'Trading Account',
          transaction_id: requestDetails.requestId,
          status: 'rejected',
          rejection_reason: requestDetails.rejectionReason
        }
      }],
      access_token: ACCESS_TOKEN
    };

    await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`,
      eventData
    );

  } catch (error) {
    console.error('Error tracking rejection:', error);
  }
};