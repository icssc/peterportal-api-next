FROM node:16-bullseye-slim
RUN npm i -g pm2 tsx
USER node
WORKDIR /home/node
COPY --chown=node:node dist .
RUN npm i
CMD ["pm2-runtime", "ecosystem.config.js", "--only", "websoc-scraper-v2"]
