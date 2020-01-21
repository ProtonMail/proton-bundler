#!/usr/bin/env bash
set -eo pipefail

TAG='';
BRANCH='';
COMMIT='';
OUTPUT_FILE='build/assets/version.json';
IS_DEBUG=false;

while [ ! $# -eq 0 ]; do
  case "$1" in
    --tag) TAG="$2"; ;;
    --branch) BRANCH="$2"; ;;
    --commit) COMMIT="$2"; ;;
    --output) OUTPUT_FILE="$2"; ;;
    --debug) IS_DEBUG=true; ;;
  esac
  shift
done;

OUTPUT_DIR="$(dirname "$OUTPUT_FILE")";

function getVersion {

    if [ -n "$TAG" ]; then
        echo "$TAG";
        return 0;
    fi;

    # Sadly MacOS doesn't have gawk but awk, which doesn't support this match :/
    # awk 'match($0, /"version": "([0-9]+\.[0-9]+\.[0-9]+)"/, arr) { print arr[1]; }'
    local version=$(cat package.json | awk '/"version": "(.+)"/{print $2}' | sed 's/"//g;s/,//g');
    echo "$version";
}

function getCommit {
    if [ -n "$COMMIT" ]; then
        echo "$COMMIT";
        return 0;
    fi;

    git rev-parse HEAD;
}

function getBranch {
    if [ -n "$BRANCH" ]; then
        echo "$BRANCH";
        return 0;
    fi;

    git describe --all;
}

function toJSON {
    local commit=$(getCommit);
    local version=$(getVersion);
    local branch=$(getBranch);
    local buildDate="$(date -u '+%FT%TZ')";
    local release="$(git describe --long --dirty --all)";

cat <<EOT
{
    "version": "${version}",
    "commit": "${commit}",
    "branch": "${branch}",
    "buildDate": "${buildDate}",
    "release": "${release}"
}
EOT
}


if ! [ -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR";
fi;

printf '%-20s' "[TAG]" "$TAG";
echo
printf '%-20s' "[BRANCH]" "$BRANCH";
echo
printf '%-20s' "[COMMIT]" "$COMMIT";
echo
printf '%-20s' "[OUTPUT_FILE]" "$OUTPUT_FILE";
echo

##
#  Write JSON version inside assets
toJSON > "$OUTPUT_FILE";

if $IS_DEBUG; then
    cat "$OUTPUT_FILE";
fi;

