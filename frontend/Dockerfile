FROM nginx:1.27-alpine

# nginx config: เสิร์ฟไฟล์ static + proxy /api ไปที่ fastapi_app
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ไฟล์หน้าเว็บ
COPY html/ /usr/share/nginx/html/

EXPOSE 80
