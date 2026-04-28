# Security & AI Architecture

## Critical Security Fix: Gemini API Key Handling

### The Problem (FIXED)
Previously, the client-side code attempted to include the Gemini API key directly in browser requests to Google's API. This is a **catastrophic security vulnerability** because:

1. **API key exposure**: Any code review, repository clone, or web traffic inspection would reveal your API key
2. **Billing risk**: Malicious actors could use your key to make expensive API calls
3. **No authentication**: The browser client had zero protection against abuse

### The Solution: Backend Proxy Architecture

The Gemini API key is now **never sent to or stored on the client**. Instead:

1. **Client** → Makes request to YOUR backend proxy
2. **Backend proxy** → Authenticates client request, then calls Gemini API with secure credentials
3. **Gemini API** → Returns response to proxy
4. **Backend proxy** → Returns response to client

The API key lives **only on your secure server**, never in JavaScript.

## Implementation

### 1. Deploy the Backend Proxy

We provide a Google Cloud Function ready to deploy:

```bash
# Set your actual Gemini API key
export GEMINI_KEY="your_actual_key_here"

# Deploy to Google Cloud
gcloud functions deploy aiProxy \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_KEY \
  --source=backend/ \
  --entry-point=aiProxy
```

This returns a URL like: `https://us-central1-your-project.cloudfunctions.net/aiProxy`

### 2. Configure Your Environment

Add to your `.env.local`:

```bash
VITE_AI_PROXY_URL=https://us-central1-your-project.cloudfunctions.net/aiProxy
```

### 3. Client Code Automatically Uses Proxy

The `GeminiAI` class now:
- Reads `VITE_AI_PROXY_URL` from environment
- Sends requests to your backend proxy instead of directly to Gemini
- Gracefully degrades to offline features if proxy is unavailable

## Security Best Practices

### API Key Management

✅ **DO:**
- Store API keys in environment variables on secure servers
- Use Google Cloud Secret Manager for production
- Rotate keys regularly (at least quarterly)
- Use restrictive IAM permissions (AI model access only)
- Monitor API usage via Cloud Logging

❌ **DON'T:**
- Commit API keys to git (ever)
- Use the same key in multiple environments
- Share keys via email or chat
- Store keys in config files checked into version control

### Backend Proxy Security

The proxy function includes:

1. **CORS restrictions** - Only accepts requests from your domain
2. **Rate limiting** - 10 requests/minute per IP address
3. **Request validation** - Validates prompt structure before forwarding
4. **Error handling** - Never leaks API key in error messages
5. **Logging** - Logs requests for audit and abuse detection

To lock down further:

```bash
# Deploy with authentication required
gcloud functions deploy aiProxy \
  --no-allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGINS=https://yourapp.com

# Use Identity-Aware Proxy (IAP) for additional security
```

### Rate Limiting Strategy

The proxy enforces **10 requests/minute per IP**. For production:

1. Use Redis for distributed rate limiting
2. Implement per-user quotas (requires authentication)
3. Monitor for abuse patterns
4. Use Cloud Armor for DDoS protection

### Monitoring & Logging

```bash
# View Cloud Function logs
gcloud functions logs read aiProxy --limit 50

# Set up alerts for high error rates or unusual patterns
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="High AI Proxy Error Rate"
```

## Testing the Setup

### Local Development (Without Proxy)

If `VITE_AI_PROXY_URL` is not set, the app gracefully falls back to **offline suggestions**:

```javascript
// Client automatically detects missing proxy
const AI_ENABLED = !!AI_PROXY_URL;

// Falls back to local recipe matching
const suggestions = this.getOfflineSuggestions(pantry);
```

### Testing With Proxy

```bash
# Test the deployed function
curl -X POST https://your-cloud-function-url/aiProxy \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Suggest recipes with tomato and basil"}'
```

## Removing Compromised Keys

If a key was ever exposed:

```bash
# 1. Revoke the key in Google Cloud Console
# Go to: APIs & Services > Credentials
# Delete or regenerate the key

# 2. Rotate to new key
export NEW_KEY="your_new_key"
gcloud functions deploy aiProxy \
  --update-env-vars GEMINI_API_KEY=$NEW_KEY

# 3. Verify old key is invalidated
# Monitor API usage to ensure no spurious calls
gcloud logging read "resource.type=api" --limit 100
```

## Architecture Diagram

```
┌──────────────────┐
│   Browser (PWA)  │
│   GeminiAI class │
└────────┬─────────┘
         │ HTTP POST
         │ { prompt: "..." }
         ▼
┌──────────────────────────────┐
│  Your Backend Proxy          │
│  (Cloud Function / Vercel)   │
│  - Validates request         │
│  - Rate limits               │
│  - Logs audit trail          │
│  - Has API key (secure)      │
└──────────┬───────────────────┘
           │ HTTPS
           │ {prompt, key}
           ▼
┌──────────────────────────────┐
│  Google Gemini API           │
│  (Publicly available)        │
└──────────────────────────────┘
```

## Offline Fallback

Without internet or AI proxy, the app still works:

- Pantry management: ✅ Fully functional (IndexedDB)
- Meal suggestions: 📊 Uses local recipe matching (100% offline)
- Meal planning: ⚠️ Limited to recipes in app data
- AI chat: ❌ Unavailable without connectivity

This graceful degradation ensures the app is **always usable**, even if AI features fail.

## Future Improvements

1. **User authentication** - Per-user rate limits and audit logs
2. **Caching layer** - Redis for frequently-asked questions
3. **Prompt injection prevention** - Input sanitization
4. **Cost management** - Track API costs per user
5. **Alternative models** - Support Claude, OpenAI, etc. via same proxy

## Testing Checklist

- [ ] API key never appears in client-side code or browser console
- [ ] Proxy URL is set in `.env.local`
- [ ] Cloud Function successfully deploys
- [ ] Requests to proxy return valid responses
- [ ] Rate limiting activates after 10 requests
- [ ] Error messages don't leak API key
- [ ] Offline mode gracefully degrades
- [ ] Git history contains no exposed keys

For detailed deployment instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).
