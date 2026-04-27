FROM node:18

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates

# 🔥 INSTALL YT-DLP BINARY (KHÔNG DÙNG PIP)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp

RUN chmod a+rx /usr/local/bin/yt-dlp

# verify
RUN yt-dlp --version
RUN ffmpeg -version

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["node", "api.js"]
