#!/bin/sh
mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/localhost.crt ]; then
    echo "Generating self-signed SSL certificate for localhost..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/localhost.key \
        -out /etc/nginx/ssl/localhost.crt \
        -subj "/C=KR/ST=Seoul/L=Seoul/O=TinySherpa/OU=Dev/CN=localhost"
fi
exec nginx -g "daemon off;"
