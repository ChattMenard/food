/**
 * Google Cloud Function: AI Proxy
 * 
 * This function serves as a secure proxy for all AI operations.
 * The Gemini API key is stored securely as an environment variable,
 * never exposed to the client.
 * 
 * Deploy with:
 * gcloud functions deploy aiProxy \
 *   --runtime nodejs20 \
 *   --trigger-http \
 *   --allow-unauthenticated \
 *   --set-env-vars GEMINI_API_KEY=$YOUR_KEY
 */

const functions = require('@google-cloud/functions-framework');
const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Simple in-memory rate limiting (use Redis in production)
const requestLog = new Map();
const RATE_LIMIT_PER_IP = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000;

functions.http('aiProxy', async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  // Rate limiting by IP
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  if (!requestLog.has(clientIp)) {
    requestLog.set(clientIp, []);
  }

  const timestamps = requestLog.get(clientIp).filter(ts => now - ts < RATE_LIMIT_WINDOW);
  timestamps.push(now);
  requestLog.set(clientIp, timestamps);

  if (timestamps.length > RATE_LIMIT_PER_IP) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }

  try {
    const { prompt, systemInstruction, responseSchema } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid prompt' });
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemInstruction || {
          parts: { text: 'You are a helpful meal planning assistant.' }
        },
        contents: {
          parts: { text: prompt }
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: responseSchema || undefined
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return res.status(response.status).json({ 
        error: 'AI service error',
        details: error
      });
    }

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});
