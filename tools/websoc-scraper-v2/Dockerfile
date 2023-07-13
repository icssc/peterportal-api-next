FROM node:18-bookworm-slim@sha256:02632fa826cdbdaa5fba25032bd2931fc79348c60110fefea2edf3fc480f39c5
RUN npm i -g tsx
USER node
WORKDIR /home/node
COPY --chown=node:node dist .
RUN npm i
WORKDIR /home/node/node_modules/@libs/db
RUN npm i
RUN npm run generate
WORKDIR /home/node/node_modules/@libs/registrar-api
RUN npm i
WORKDIR /home/node/node_modules/@libs/websoc-api-next
RUN npm i
WORKDIR /home/node
CMD ["tsx", "--expose-gc", "index.ts"]
