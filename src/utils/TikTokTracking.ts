// Declare TikTok Pixel global type
declare global {
  interface Window {
    ttq?: {
      track: (event: string, data?: any) => void;
      page: () => void;
      identify: (data: any) => void;
    };
  }
}

export const trackTikTokPurchase = (purchaseData: {
  value: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  transaction_id?: string;
  status?: string;
}) => {
  try {
    if (window.ttq) {
      window.ttq.track('CompletePayment', {
        value: purchaseData.value,
        currency: purchaseData.currency || 'USD',
        content_name: purchaseData.content_name,
        content_category: purchaseData.content_category,
        content_id: purchaseData.transaction_id,
      });
    }
  } catch (error) {
    console.error('TikTok tracking error:', error);
  }
};

export const trackTikTokPurchaseApproval = (requestDetails: {
  requestId: string;
  userId: string;
  amount: number;
  packageName: string;
  packageBalance: number;
}) => {
  try {
    if (window.ttq) {
      window.ttq.track('CompletePayment', {
        value: requestDetails.amount,
        currency: 'USD',
        content_name: requestDetails.packageName,
        content_category: 'Trading Account',
        content_id: requestDetails.requestId,
        description: `Purchase Approved - ${requestDetails.packageName}`,
      });
    }
  } catch (error) {
    console.error('TikTok purchase approval tracking error:', error);
  }
};

export const trackTikTokPurchaseRejection = (requestDetails: {
  requestId: string;
  userId: string;
  amount: number;
  packageName: string;
  rejectionReason: string;
}) => {
  try {
    if (window.ttq) {
      // Track as a custom event since TikTok doesn't have a standard "rejection" event
      window.ttq.track('SubmitForm', {
        content_name: `Purchase Rejected - ${requestDetails.packageName}`,
        content_category: 'Trading Account',
        content_id: requestDetails.requestId,
        description: requestDetails.rejectionReason,
      });
    }
  } catch (error) {
    console.error('TikTok purchase rejection tracking error:', error);
  }
};
