#!/usr/bin/env bash
# Install the generic DSH fast-boot bundles into a profile.
#
#   ./install.sh                 # profile "web"
#   ./install.sh --profile tui   # another profile
#   DSH_BIN=/path/to/dsh ./install.sh
#   ./install.sh --dry-run
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="web"
DRY_RUN=0
WITH_HOT_RELOAD=1

while [ "$#" -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-hot-reload) WITH_HOT_RELOAD=0; shift ;;
    -h|--help)
      sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

DSH_BIN="${DSH_BIN:-$(command -v dsh || true)}"
if [ -z "$DSH_BIN" ] || [ ! -x "$DSH_BIN" ]; then
  echo "cannot find the dsh binary; set DSH_BIN=/path/to/dsh" >&2
  exit 1
fi
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"
if [ ! -f "$PROFILE_DIR/package.json" ]; then
  echo "profile '$PROFILE' not found at $PROFILE_DIR" >&2
  echo "create it first (for example: dsh $PROFILE --help)" >&2
  exit 1
fi

BUNDLES=(
  "$ROOT/dsh-mcp-fastboot"
  "$ROOT/dsh-mcp-background"
)
if [ "$WITH_HOT_RELOAD" -eq 1 ]; then
  BUNDLES+=("$ROOT/dsh-hot-reload")
fi
BUNDLE_NAMES=(
  "@local/dsh-mcp-fastboot"
  "@local/dsh-mcp-background"
)
if [ "$WITH_HOT_RELOAD" -eq 1 ]; then
  BUNDLE_NAMES+=("@local/dsh-hot-reload")
fi

echo "dsh:      $DSH_BIN ($("$DSH_BIN" --version))"
echo "profile:  $PROFILE ($PROFILE_DIR)"
echo "bundles:  ${BUNDLE_NAMES[*]}"
echo

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '  [dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

echo "1/3 link the MCP SDK into dsh-mcp-fastboot"
if [ "$DRY_RUN" -eq 1 ]; then
  printf '  [dry-run] DSH_BIN=%s node %s\n' "$DSH_BIN" "$ROOT/dsh-mcp-fastboot/scripts/link-sdk.mjs"
else
  DSH_BIN="$DSH_BIN" node "$ROOT/dsh-mcp-fastboot/scripts/link-sdk.mjs"
fi

echo "2/3 install the linked bundles"
for dir in "${BUNDLES[@]}"; do
  run "$DSH_BIN" plugin --profile "$PROFILE" add "link:$dir"
done

echo "3/3 enable the bundles in the profile"
if [ "$DRY_RUN" -eq 1 ]; then
  printf '  [dry-run] node %s %s %s\n' "$ROOT/scripts/enable-bundles.mjs" "$PROFILE_DIR" "${BUNDLE_NAMES[*]}"
else
  node "$ROOT/scripts/enable-bundles.mjs" "$PROFILE_DIR" "${BUNDLE_NAMES[@]}"
fi

echo
echo "done. Restart DSH to load the new bundles:"
echo "  $DSH_BIN $PROFILE"
echo
echo "Adding an MCP server stays the normal DSH way: add a"
echo "  name: '@deepseek-ai/dsh-mcp-client'"
echo "row in the profile's cordis.patch.yml. Both accelerators pick it up"
echo "automatically; see ADD-MCP.md."
