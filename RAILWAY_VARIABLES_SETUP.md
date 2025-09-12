# 🚂 Railway Variables Setup Guide

## 🔗 Connecting PostgreSQL Service to Your App

### Method 1: Automatic Service Reference (Recommended)

1. **Go to Railway Dashboard** → Your Project
2. **Click your app service** (not the PostgreSQL service)
3. **Go to "Variables" tab**
4. **Click "+ New Variable" → "Add Reference"**
5. **Select your PostgreSQL service**
6. **Railway automatically adds all these variables:**

```bash
DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
PGDATA=${{Postgres.PGDATA}}
PGDATABASE=${{Postgres.PGDATABASE}}
PGHOST=${{Postgres.PGHOST}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGPORT=${{Postgres.PGPORT}}
PGUSER=${{Postgres.PGUSER}}
POSTGRES_DB=${{Postgres.POSTGRES_DB}}
POSTGRES_PASSWORD=${{Postgres.POSTGRES_PASSWORD}}
POSTGRES_USER=${{Postgres.POSTGRES_USER}}
RAILWAY_PRIVATE_DOMAIN=${{Postgres.RAILWAY_PRIVATE_DOMAIN}}
RAILWAY_TCP_PROXY_DOMAIN=${{Postgres.RAILWAY_TCP_PROXY_DOMAIN}}
RAILWAY_TCP_PROXY_PORT=${{Postgres.RAILWAY_TCP_PROXY_PORT}}
```

### Method 2: Manual Variable Setup (If Automatic Fails)

If the automatic reference doesn't work, add these variables manually:

1. **Click "+ New Variable"**
2. **Add each variable one by one:**

| Variable Name | Value |
|---------------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DATABASE_PUBLIC_URL` | `${{Postgres.DATABASE_PUBLIC_URL}}` |
| `PGHOST` | `${{Postgres.PGHOST}}` |
| `PGUSER` | `${{Postgres.PGUSER}}` |
| `PGDATABASE` | `${{Postgres.PGDATABASE}}` |
| `PGPASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `PGPORT` | `${{Postgres.PGPORT}}` |

## ✅ Verify Variables Are Set

After connecting, your app service variables should show:

```bash
✅ DATABASE_URL=${{Postgres.DATABASE_URL}}
✅ PGHOST=${{Postgres.PGHOST}}
✅ PGUSER=${{Postgres.PGUSER}}
✅ PGDATABASE=${{Postgres.PGDATABASE}}
✅ PGPASSWORD=${{Postgres.PGPASSWORD}}
✅ PGPORT=${{Postgres.PGPORT}}
```

## 🚀 Deploy

Once variables are connected:

```bash
railway up
```

Your app will now use the Railway PostgreSQL database! 🎉

## 🔍 Troubleshooting

**If variables show as `<not set>`:**
1. Ensure PostgreSQL service is "Active" (green)
2. Make sure you're adding variables to your **app service**, not PostgreSQL service
3. Try disconnecting and reconnecting the services
4. Redeploy after connecting variables

**If connection still fails:**
- Check Railway PostgreSQL logs for errors
- Try restarting the PostgreSQL service
- Verify both services are in the same project/environment