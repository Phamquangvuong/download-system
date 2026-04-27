FROM node:18

# Install tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    python3-pip

# Install yt-dlp chuẩn nhất
RUN pip3 install yt-dlp

# đảm bảo path
RUN ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp || true

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "api.js"]
