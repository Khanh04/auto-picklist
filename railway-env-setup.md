# Railway Environment Variables for Connection Limits

To fix the "too many connection attempts" issue, add these environment variables to your Railway service:

```bash
# Database connection pool settings for Railway
DB_MAX_CONNECTIONS=5
DB_IDLE_TIMEOUT=10000
DB_CONNECTION_TIMEOUT=5000
DB_ACQUIRE_TIMEOUT=10000
```

## How to set these in Railway:

1. Go to your Railway project dashboard
2. Select your service
3. Go to the "Variables" tab
4. Add each variable with its value

## Alternatively, use Railway CLI:

```bash
railway variables set DB_MAX_CONNECTIONS=5
railway variables set DB_IDLE_TIMEOUT=10000  
railway variables set DB_CONNECTION_TIMEOUT=5000
railway variables set DB_ACQUIRE_TIMEOUT=10000
```

## What these do:

- **DB_MAX_CONNECTIONS=5**: Reduces max pool connections from 20 to 5
- **DB_IDLE_TIMEOUT=10000**: Closes idle connections after 10 seconds
- **DB_CONNECTION_TIMEOUT=5000**: Timeout for new connections after 5 seconds
- **DB_ACQUIRE_TIMEOUT=10000**: Timeout for getting connection from pool after 10 seconds

## If you're still getting connection errors:

1. Wait 10-15 minutes for connection limits to reset
2. Check Railway logs for specific error messages
3. Consider upgrading to Railway Pro for higher connection limits
4. Use railway `railway run` commands to test locally first