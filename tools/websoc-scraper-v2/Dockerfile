FROM node:16-bullseye-slim
RUN npm i -g tsx
USER node
WORKDIR /home/node
COPY --chown=node:node dist .
RUN npm i
CMD ["tsx", "--expose-gc", "index.ts"]
