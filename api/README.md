# Svarog Tracer Backend API

Backend API for Svarog Tracer - eliminates CORS proxy dependencies by running serverless functions on Vercel.

## 📁 Structure

```
api/
├── wuwa/
│   ├── stats.js       # GET /api/wuwa/stats?id={bannerId}
│   └── banners.js     # GET /api/wuwa/banners
├── hsr/
│   └── stats.js       # GET /api/hsr/stats?id={bannerId}
├── genshin/
│   ├── stats.js       # GET /api/genshin/stats?id={bannerId}
│   └── banners.js     # GET /api/genshin/banners
├── zzz/
│   └── stats.js       # GET /api/zzz/stats?id={bannerId}
└── utils/
    └── wuwaAdaptiveParser.js
```

## 🚀 Local Development

```bash
# Install Vercel CLI
npm install -g vercel

# Start local dev server
vercel dev
```

API will be available at `http://localhost:3000/api`

## 📡 API Endpoints

### WuWa

**Get Banner Stats:**
```
GET /api/wuwa/stats?id=100031
```

**Get Live Banners:**
```
GET /api/wuwa/banners
```

### HSR

**Get Banner Stats:**
```
GET /api/hsr/stats?id=2099
```

### Genshin

**Get Banner Stats:**
```
GET /api/genshin/stats?id=300094
```

**Get Live Banners:**
```
GET /api/genshin/banners
```

### ZZZ

**Get Banner Stats:**
```
GET /api/zzz/stats?id=2001015
```

## 🧪 Testing

```bash
# Test WuWa
curl http://localhost:3000/api/wuwa/stats?id=100031

# Test HSR
curl http://localhost:3000/api/hsr/stats?id=2099

# Test Genshin
curl http://localhost:3000/api/genshin/stats?id=300094
```

## 🌐 Deployment

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## 📝 Features

- ✅ No CORS issues (server-to-server)
- ✅ Automatic caching (1 hour)
- ✅ Error handling
- ✅ Serverless (scales automatically)
- ✅ Free tier friendly

## 🔧 Configuration

See `vercel.json` for deployment configuration.
See `.env.example` for environment variables.
