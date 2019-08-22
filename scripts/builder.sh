#!/usr/bin/env bash
set -eo pipefail

cd "/tmp/$1";
echo "Build from: $(pwd)";
npm run deploy -- ${*:2} --source=remote;
