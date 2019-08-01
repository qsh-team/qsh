#!/bin/bash
LOCAL="$PWD"
PATH=~/.qsh_install/node/bin/:PATH
cd ~/.qsh_install/qsh_core/
~/.qsh_install/node/bin/npm install $LOCAL
