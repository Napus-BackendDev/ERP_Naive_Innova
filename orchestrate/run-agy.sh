#!/usr/bin/env bash
# Wrapper: drive Antigravity (agy) headless — SAFE posture (no skip-permissions).
# Usage: run-agy.sh <review|build> "<MODEL>" "<PROMPT>"
#   review = read-only: --mode plan --sandbox (cannot edit files, restricted terminal)
#   build  = edits allowed but bounded: --mode accept-edits --sandbox
set -uo pipefail
KIND="${1:?kind required: review|build}"
MODEL="${2:?model required}"
PROMPT="${3:?prompt required}"
LOG_DIR="$(cd "$(dirname "$0")" && pwd)/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/agy-$STAMP.log"

case "$KIND" in
  review) MODE_FLAGS=(--mode plan --sandbox) ;;
  build)  MODE_FLAGS=(--mode accept-edits --sandbox) ;;
  *) echo "kind must be review|build" >&2; exit 2 ;;
esac

{
  echo "### agy | kind=$KIND | model=$MODEL | $STAMP"
  echo "### prompt: $PROMPT"
  echo "----"
} >>"$LOG"

agy -p "$PROMPT" \
    --model "$MODEL" \
    --add-dir . \
    "${MODE_FLAGS[@]}" \
    --print-timeout 8m 2>&1 | tee -a "$LOG"
