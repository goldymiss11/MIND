FROM node:22-slim

WORKDIR /app

# Copy repository files
COPY . .

# Install dependencies
RUN npm ci

# Build required packages and backend API
RUN npm run build:packages && npm run --workspace=@mind/api build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
