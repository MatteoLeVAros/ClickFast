FROM node:22.23.2-alpine3.23 AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY server.js ./

RUN npm prune --omit=dev


FROM node:22.23.2-alpine3.23 AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=dependencies --chown=node:node /app/package.json ./
COPY --from=dependencies --chown=node:node /app/package-lock.json ./
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=dependencies --chown=node:node /app/server.js ./

USER node

EXPOSE 3000

CMD ["node", "server.js"]