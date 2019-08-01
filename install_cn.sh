#!/bin/bash

rm -rf ~/.qsh_install
mkdir -p ~/.qsh_install
cd ~/.qsh_install

echo 'Install nodejs for qsh'
curl https://cdn.npm.taobao.org/dist/node/v11.0.0/node-v11.0.0-darwin-x64.tar.gz | tar -xz -C ~/.qsh_install

ln -s node-v11.0.0-darwin-x64 node

export PATH=~/.qsh_install/node/:$PATH
export NODE_PATH=~/.qsh_install/node/node_modules


mkdir -p qsh_core
cd qsh_core

echo '{}' > package.json

# echo 'Install cnpm'
# ~/.qsh_install/node/bin/npm install cnpm --registry=https://registry.npm.taobao.org --save-dev

echo 'Install qsh'
~/.qsh_install/node/bin/npm install install --save qsh@1.0.9 --registry=https://registry.npm.taobao.org
rm /usr/local/bin/qsh
ln -s $HOME/.qsh_install/qsh_core/node_modules/.bin/qsh /usr/local/bin/qsh

cd ..

echo 'DONE, enjoy with /usr/local/bin/qsh'