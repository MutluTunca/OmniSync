import sys
import os

path = '/etc/nginx/sites-available/omnisync'
with open(path, 'r') as f:
    content = f.read()

insert_str = """
    location /uploads {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
"""

if 'location /uploads' not in content:
    content = content.replace('location /api {', insert_str.lstrip('\\n') + '\\n    location /api {')
    with open(path, 'w') as f:
        f.write(content)
    print("Nginx configuration updated.")
else:
    print("location /uploads already exists.")
