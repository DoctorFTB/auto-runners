FROM mhart/alpine-node:14

RUN apk update && \
    ln -snf /usr/share/zoneinfo/UTC /etc/localtime && echo UTC > /etc/timezone

WORKDIR /build

COPY package.json ./package.json

RUN yarn

COPY . .

RUN yarn run build

CMD node dist/main.js;
