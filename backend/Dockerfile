# syntax=docker/dockerfile:1.7
# ---------- deps stage: production dependencies only ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
 && npm install --no-save sequelize-cli@6 \
 && npm cache clean --force

# ---------- runtime stage ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/app/uploads
WORKDIR /app
RUN apk add --no-cache tini wget
COPY --from=deps /app/node_modules ./node_modules
COPY package.json .sequelizerc ./
COPY src ./src
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health/live || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
# Run pending migrations, then start the API
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node src/server.js"]
