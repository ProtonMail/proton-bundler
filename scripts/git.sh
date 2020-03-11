#!/usr/bin/env bash
set -eo pipefail

##
# Extract from git log:
#   - The hash of the commit for the release
#   - The current branch (if it is a tag we detect it)
# Why do we clean the output via sed ? Because on MacOS git gives you origin/HEAD as the latest element
# instead of origin/branch.
function getBranchCommit {
  git log --format='%H %D' -1 | sed 's|, origin/HEAD||' | awk '{ if ($NF ~ /^v[0-9]/) {print $1, "tag:"$NF} else {print $1, $NF}}'
}

function getTag {
  git describe --abbrev=0 || ''
}

function main {
  local infoBranch="$(getBranchCommit)";
  local commit="$(echo "$infoBranch" | awk '{print $1}')";
  local branch="$(echo "$infoBranch" | awk '{print $2}')";

  cat <<EOT
{
  "branch": "$branch",
  "commit": "$commit",
  "tag": "$(getTag)"
}
EOT
}

main
