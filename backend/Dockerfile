FROM node:20.19-bookworm-slim

WORKDIR /app

# Install OpenSSL — required by Prisma client generation
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run migrations at startup (needs runtime DATABASE_URL), then start the app
CMD ["sh", "-c", "echo \"[BOOT] PORT=$PORT NODE_ENV=$NODE_ENV TRIP_DATA_PROVIDER=$TRIP_DATA_PROVIDER ENCRYPTION_KEY_SET=$(test -n \"$ENCRYPTION_KEY\" && echo YES || echo NO) DATABASE_URL_SET=$(test -n \"$DATABASE_URL\" && echo YES || echo NO)\" && npx prisma migrate deploy --schema ./prisma/schema.prisma && npm start"]
