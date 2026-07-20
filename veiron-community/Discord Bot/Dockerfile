FROM node:20-alpine

WORKDIR /app

ARG DATABASE_PROVIDER=sqlite
ARG DATABASE_URL=file:./data/veiron-community.db
ARG DATABASE_URL_LEDGER=file:./data/veiron-ledger.db

COPY package*.json ./
RUN npm ci

COPY . .
ENV DATABASE_PROVIDER=${DATABASE_PROVIDER}
ENV DATABASE_URL=${DATABASE_URL}
ENV DATABASE_URL_LEDGER=${DATABASE_URL_LEDGER}
RUN npm run dashboard:build
RUN npm run prisma:generate
RUN npm run prisma:generate:ledger
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npm", "start"]
