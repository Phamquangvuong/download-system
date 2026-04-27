FROM node:18

# Install system tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    python3 \
    python3-pip \
    ca-certificates

# Install yt-dlp (latest stable)
RUN pip3 install --no-cache-dir yt-dlp

# Verify tools
RUN ffmpeg -version
RUN yt-dlp --version

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "api.js"]
