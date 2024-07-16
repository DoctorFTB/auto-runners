FROM node:20.5-alpine

RUN apk update && \
    ln -snf /usr/share/zoneinfo/UTC /etc/localtime && echo UTC > /etc/timezone

WORKDIR /build

COPY .yarn ./.yarn
COPY package.json .yarnrc.yml yarn.lock tsconfig.json ./

RUN yarn

COPY . .

RUN yarn run build

CMD node dist/main.js;
