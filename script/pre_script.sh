#!/bin/bash

ROOT_DIR=$(pwd)/../../
NODE_VERSION=node-v16.15.0-linux-x64
NODE_HOME=$ROOT_DIR/$NODE_VERSION
NODE_URL=https://nodejs.org/download/release/v16.15.0/${NODE_VERSION}.tar.gz

prepare_nodejs() {
    echo "### preparing nodejs"
    if [ ! -d "$NODE_HOME" ]; then
        wget --no-check-certificate $NODE_URL
        if [ $? -ne 0 ]; then
            echo "download nodejs failed! exit"
            return 1
        fi

        local node_name=${NODE_URL##*/}
        tar -zxf $node_name
        chmod 777 $NODE_HOME/bin/*
    fi

    export PATH=$NODE_HOME:$PATH
    export NODE_HOME=${NODE_HOME}
    export PATH=$NODE_HOME/bin:$PATH

    npm config set registry=https://repo.huaweicloud.com/repository/npm/
    npm config set lockfile=false

    npm install typescript
}

prepare_nodejs
pwd

cd arkanalyzer
npm install

