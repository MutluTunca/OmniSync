import sys

path = '/etc/nginx/sites-available/omnisync'
with open(path, 'r') as f:
    config = f.read()

config = config.replace('\\n    location /api', '\n    location /api')

with open(path, 'w') as f:
    f.write(config)
print("Fixed literal newline in Nginx config.")
