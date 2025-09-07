.PHONY: ping setup deploy

ping:
	ansible -i inventory/hosts.ini mixtli -m ping

setup:
	ansible-playbook -i inventory/hosts.ini playbooks/site.yml

deploy:
	ansible-playbook -i inventory/hosts.ini playbooks/deploy.yml
