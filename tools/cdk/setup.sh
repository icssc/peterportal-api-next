#!/usr/bin/env bash
# create swap file
dd if=/dev/zero of=/swap bs=1M count=4096
chmod 0600 /swap
mkswap /swap
swapon /swap
echo "/swap none swap defaults 0 0" >>/etc/fstab
# install Node.js
yum update -y
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum update -y
yum install -y nodejs
# install npm packages
npm i -g dotenv-cli pm2 tsx
# copy dist tarball to /srv
cd /srv
cp "$1" websoc-scraper-v2.tar.gz
tar xf websoc-scraper-v2.tar.gz
rm websoc-scraper-v2.tar.gz
cd websoc-scraper-v2
npm install --omit=dev
PM2_HOME=/root/.pm2 pm2 start
