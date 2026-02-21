#!/usr/bin/env bash
set -euo pipefail

: "${RPC:?RPC empty}"
: "${PK:?PK empty}"

# 1) bootstrap roles/routes/minter
./scripts/bootstrap-foreign-v1.sh

# 2) smoke end-to-end
node scripts/smoke-foreign-v1.js
