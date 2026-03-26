FROM node:20.19-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npm run prisma:generate

COPY . .

ENV NODE_ENV=development
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
