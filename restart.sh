#!/bin/bash

npm run build
pm2 restart api.nft.com
