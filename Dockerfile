# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY eslint.config.js ./
COPY scripts ./scripts
COPY src ./src

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Rewrite relative imports/exports in compiled generated Prisma files for Node ESM compat
# Adds .js extension to extensionless relative imports and converts .ts → .js
RUN node -e " \
  const fs = require('fs'), path = require('path'); \
  (function fix(dir) { \
    fs.readdirSync(dir, {withFileTypes:true}).forEach(f => { \
      const p = path.join(dir, f.name); \
      if (f.isDirectory()) return fix(p); \
      if (!f.name.endsWith('.js')) return; \
      let c = fs.readFileSync(p,'utf8'); \
      c = c.replace(/(?:from|require\()\s*(['\"])(\.[^'\"]*?)\1/g, (m,q,spec) => { \
        if (spec.endsWith('.js')||spec.endsWith('.json')||spec.endsWith('.mjs')||spec.endsWith('.cjs')) return m; \
        const prefix = m.startsWith('require') ? 'require('+q : 'from '+q; \
        const suffix = m.startsWith('require') ? q : q; \
        if (spec.endsWith('.ts')) return prefix+spec.slice(0,-3)+'.js'+suffix; \
        return prefix+spec+'.js'+suffix; \
      }); \
      fs.writeFileSync(p, c); \
    }); \
  })('dist/generated'); \
  console.log('Fixed imports in dist/generated');"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies + tools needed for migrations/seeding
RUN npm ci --omit=dev && npm install --no-save tsx prisma

# Copy built application from builder (includes generated Prisma client)
COPY --from=builder /app/dist ./dist
COPY scripts ./scripts
COPY prisma ./prisma
COPY prisma.config.ts ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/app.js"]

EXPOSE 3000