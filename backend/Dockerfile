FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install

COPY prisma ./prisma
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

EXPOSE 3000

CMD ["sh", "-c", "yarn prisma:generate && yarn prisma:deploy && yarn dev"]
