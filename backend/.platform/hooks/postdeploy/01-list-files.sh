#!/bin/bash
echo "===== LISTING CURRENT DIR =====" > /var/log/eb-hooks.log
ls -al /var/app/current >> /var/log/eb-hooks.log
echo "===== SEARCHING FOR .env =====" >> /var/log/eb-hooks.log
find /var/app/current -name ".env" >> /var/log/eb-hooks.log
