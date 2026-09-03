# API only (Render). Frontend stays on Vercel.
FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./

ENV NODE_ENV=production

EXPOSE 5001

CMD ["node", "server.js"]
