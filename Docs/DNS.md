# Deploy 
  
1. Chez ton registrar / hébergeur DNS pour hanibal.fr :
agents.hanibal.fr  →  A  →  162.19.241.44

2. install nginx + cerbot on VPS 

sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

3 Config nginx (already exists)

/home/yohann/marketplace-oc-agents/nginx.conf

4. Update .env and docker-compose ()

5. Deploy with commands: 

sudo cp /home/yohann/marketplace-oc-agents/nginx.conf/etc/nginx/sites-available/agents.hanibal.fr

sudo ln -s /etc/nginx/sites-available/agents.hanibal.fr /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx


###  Obtenir le certificat SSL Let's Encrypt (gratuit, automatique)

sudo certbot --nginx -d agents.hanibal.fr

### Rebuild with env and docker-compose

sudo docker compose up -d --build