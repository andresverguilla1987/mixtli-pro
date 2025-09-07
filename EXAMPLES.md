# Ejemplos rápidos

## Scripts (ambos puertos)
sudo bash apply_db_redis_access.sh 203.0.113.10
sudo bash revoke_db_redis_access.sh 203.0.113.10

## Scripts (individuales)
sudo bash allow_db_access.sh 203.0.113.10 5432
sudo bash allow_db_access.sh 203.0.113.10 6379
sudo bash deny_db_access.sh 203.0.113.10 5432
sudo bash deny_db_access.sh 203.0.113.10 6379

## Ansible
ansible-playbook -i ansible/inventory.ini ansible/db_redis_access.yml   --extra-vars "db_allow_ip=203.0.113.10 redis_allow_ip=203.0.113.10"   --ask-become-pass

## Túneles SSH
ssh -N -L 5432:127.0.0.1:5432 ubuntu@TU.IP -p 2222
ssh -N -L 6379:127.0.0.1:6379 ubuntu@TU.IP -p 2222
