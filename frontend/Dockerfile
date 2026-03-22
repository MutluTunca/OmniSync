FROM node:20-alpine
LABEL org.opencontainers.image.source=https://github.com/MutluTunca/OmniSync
ENV BUILD_DATE=2026-03-20T16:45

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
