FROM node:lts
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list
RUN apt-get update && apt-get install -y zsh
RUN yarn install --registry=https://registry.npm.taobao.org/
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .
