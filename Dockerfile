FROM node:16-alpine AS base
WORKDIR /app
RUN apk update && apk add --no-cache \
    bash
COPY lib lib
COPY component.json component.json
COPY package.json package.json
COPY README.md README.md
COPY logo.png logo.png

FROM base AS dependencies
RUN apk update && apk add --no-cache \
    python2 \
    g++ \
    make
RUN npm install --production

FROM base AS release
ENV ELASTICIO_OTEL_SERVICE_NAME=COMPONENT:FILTER
COPY --from=dependencies /app/node_modules ./node_modules
RUN chown -R node:node .
USER node
ENTRYPOINT ["npm", "start"]