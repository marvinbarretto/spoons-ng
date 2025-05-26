# Stage 1: Install dependencies
FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build the app
FROM node:20 AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Stage 3: Run the server
FROM node:20 AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

# Optional: copy .env if needed
# COPY .env .env

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/spoons/server/server.mjs"]
