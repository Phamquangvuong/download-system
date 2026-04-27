FROM node:18

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    ca-certificates

# install yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp

RUN chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# copy cookies
COPY cookies.txt .

CMD ["node", "api.js"]
