# Use Ubuntu 24.04 base
FROM ubuntu:24.04

# Add tini for proper signal handling
RUN apt-get update && apt-get install -y tini

ENV NODE_ENV=development

# Install required packages and scrcpy dependencies
RUN apt-get update && apt-get install -y \
    android-tools-adb \
    android-tools-fastboot \
    file \
    nodejs \
    npm \
    wget \
    git \
    curl \
    jq \
    tar \
    python3 \
    python3-pip \
    python3-requests \
    libpulse0 \
    pulseaudio \
    && rm -rf /var/lib/apt/lists/*

COPY download_scrcpy.sh /tmp/download_scrcpy.sh

# Make the script executable
RUN chmod +x /tmp/download_scrcpy.sh

# Run the script
RUN /tmp/download_scrcpy.sh

# Clean up
RUN rm /tmp/download_scrcpy.sh

WORKDIR /app
COPY app/package*.json ./
RUN npm install
COPY app/ .

EXPOSE 3000
EXPOSE 5037

ENTRYPOINT ["/usr/bin/tini", "--"]
STOPSIGNAL SIGINT

CMD ["npm", "run", "dev"]
