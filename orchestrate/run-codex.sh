#!/usr/bin/env bash
# Wrapper: drive Codex CLI headless — SAFE posture (bounded sandbox, no full auto).
# Usage: run-codex.sh <review|analyze|build> "<PROMPT>"
#   review  = codex review (read-only)
#   analyze = codex exec --sandbox read-only  (reason, no writes)
#   build   = codex exec --sandbox workspace-write  (may edit workspace files, no network/system)
set -uo pipefail
KIND="${1:?kind required: review|analyze|build}"
PROMPT="${2:-}"
LOG_DIR="$(cd "$(dirname "$0")" && pwd)/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/codex-$STAMP.log"

{
  echo "### codex | kind=$KIND | $STAMP"
  echo "### prompt: $PROMPT"
  echo "----"
} >>"$LOG"

case "$KIND" in
  review)  codex review 2>&1 | tee -a "$LOG" ;;
  analyze) codex exec --sandbox read-only "$PROMPT" 2>&1 | tee -a "$LOG" ;;
  build)   codex exec --sandbox workspace-write "$PROMPT" 2>&1 | tee -a "$LOG" ;;
  *) echo "kind must be review|analyze|build" >&2; exit 2 ;;
esac
