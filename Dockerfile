# ===================
# Build stage
# ===================
FROM node:20-alpine AS build

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig*.json ./
COPY src ./src

# Build TS to JS
RUN npm run build

# ===================
# Production stage
# ===================
FROM gcr.io/distroless/nodejs20-debian12
# FROM node:20-alpine AS production

WORKDIR /app

# Copy only built output & deps
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./

# Expose your port
EXPOSE 3000

# ✅ Run migrations first, THEN start server
CMD ["dist/main.js"]
