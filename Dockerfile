FROM nginxinc/nginx-unprivileged:1.30.4-alpine

USER root

RUN rm -rf /usr/share/nginx/html/*

COPY default.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html style.css script.js /usr/share/nginx/html/

USER 101

EXPOSE 80