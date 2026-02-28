// server/routes/facebook.js
import express from 'express';
import axios from 'axios';
const router = express.Router();

const PIXEL_ID = process.env.FB_PIXEL_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const API_VERSION = 'v18.0';

router.post('/track-conversion', async (req, res) => {
  try {
    const { eventName, eventData } = req.body;
    
    const data = {
      ...eventData,
      data: [{
        ...eventData.data[0],
        user_data: {
          ...eventData.data[0].user_data,
          client_ip_address: req.ip,
        }
      }]
    };

    const response = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`,
      data
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('CAPI Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;