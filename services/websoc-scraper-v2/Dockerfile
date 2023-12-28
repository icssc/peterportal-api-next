FROM node:20-bookworm-slim
RUN npm i -g tsx
RUN apt-get update -y && apt-get install -y openssl
USER node
WORKDIR /home/node
COPY --chown=node:node dist .
CMD ["node", "--expose-gc", "index.mjs"]
