FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install

COPY index.html postcss.config.js tailwind.config.ts tsconfig.json vite.config.ts ./
COPY src ./src

EXPOSE 5173

CMD ["yarn", "dev"]
