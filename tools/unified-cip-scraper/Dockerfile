FROM node:18-bullseye-slim
RUN npm i -g tsx
USER node
WORKDIR /home/node
COPY --chown=node:node dist .
RUN npm i
WORKDIR /home/node/node_modules/@libs/db
RUN npm i
RUN npm run generate
WORKDIR /home/node/node_modules/course-scraper
RUN npm i
WORKDIR /home/node/node_modules/instructor-scraper
RUN npm i
WORKDIR /home/node/node_modules/prereq-scraper
RUN npm i
WORKDIR /home/node
CMD ["tsx", "--expose-gc", "index.ts"]
