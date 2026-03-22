FROM node:20-alpine
LABEL org.opencontainers.image.source=https://github.com/MutluTunca/OmniSync
ENV BUILD_DATE=2026-03-22T20:07

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "run", "start"]
