# No npm inside Docker — app is pre-built on the host via `npm run build`
# before this image is built. This avoids Docker DNS/proxy network issues.
FROM nginx:alpine
COPY dist/       /usr/share/nginx/html
COPY nginx.conf  /etc/nginx/conf.d/default.conf
EXPOSE 80
