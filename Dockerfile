# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src
RUN npm ci --omit=dev
# If project requires building with mastra or typescript, run build
RUN npm run build --silent || true

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Expose a common port; change if your app uses a different port
EXPOSE 3000
# Require OPENAI_API_KEY to be set at runtime
CMD [ "sh", "-c", "if [ -z \"$OPENAI_API_KEY\" ]; then echo 'ERROR: OPENAI_API_KEY not set'; exit 1; fi; npm start" ]