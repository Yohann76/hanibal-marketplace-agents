# Ansible — Déploiement & Gestion des secrets

Ce dossier contient l'automatisation complète du déploiement de **Marketplace OC Agents** sur le VPS de production. Ansible installe les dépendances, configure Nginx, obtient le certificat SSL et lance Docker Compose.

## Commandes Vault

```
cd ansible 
```


### Éditer un secret (sans déchiffrer sur disque)
```bash
ansible-vault edit ansible/vault.yml
# → Ouvre l'éditeur, rechiffre automatiquement à la fermeture

qw! pour quit + save
```

### Voir le contenu sans modifier
```bash
ansible-vault view ansible/vault.yml
```

### Changer le mot de passe maître
```bash
ansible-vault rekey ansible/vault.yml
# → Ancien mot de passe puis nouveau 

ozezozez keyword
```

---

## Commandes Ansible

### Prérequis local
```bash
pip install ansible && ansible-galaxy collection install community.docker

or 

sudo apt install -y ansible ansible-galaxy collection install community.docker

```

### Premier déploiement complet
```bash
ansible-playbook ansible/playbook.yml -i ansible/inventory.ini --ask-vault-pass -K
```

## Renouvellement SSL

Certbot est configuré automatiquement via cron pour renouveler le certificat Let's Encrypt deux fois par jour (à 3h et 15h). Aucune intervention manuelle nécessaire.

Pour forcer un renouvellement :
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

