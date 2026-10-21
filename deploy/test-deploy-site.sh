#!/usr/bin/env bash
#
# test-deploy-site.sh - regression tests for deploy-site.
#
# Runs the real script inside a sandbox: the release paths are redirected into
# a temp directory and `nginx`/`systemctl` are replaced with stubs, so the
# symlink bookkeeping and argument handling can be tested without root and
# without touching the live site.
#
# Usage: bash deploy/test-deploy-site.sh
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SITE="$SCRIPT_DIR/deploy-site"

if [[ ! -f "$DEPLOY_SITE" ]]; then
  echo "test-deploy-site.sh: $DEPLOY_SITE not found" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ok   - $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL - $1"; [[ $# -gt 1 ]] && echo "         $2"; }

assert_eq() {
  local expected="$1" actual="$2" name="$3"
  if [[ "$expected" == "$actual" ]]; then
    pass "$name"
  else
    fail "$name" "expected '$expected', got '$actual'"
  fi
}

assert_contains() {
  local haystack="$1" needle="$2" name="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    pass "$name"
  else
    fail "$name" "output did not contain '$needle'"
  fi
}

assert_fails() {
  local name="$1" pattern="$2"
  shift 2
  local out status
  out="$("$@" 2>&1)"
  status=$?
  if [[ $status -eq 0 ]]; then
    fail "$name" "expected a non-zero exit, got 0 (output: $out)"
  elif [[ "$out" != *"$pattern"* ]]; then
    fail "$name" "expected output containing '$pattern', got: $out"
  else
    pass "$name"
  fi
}

# --- sandbox ----------------------------------------------------------------

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"
# chown is stubbed too: the real one needs root, and the sandbox files are
# already owned by whoever is running the test.
for stub in nginx systemctl chown; do
  cat > "$FAKEBIN/$stub" <<EOF
#!/usr/bin/env bash
echo "stub: $stub \$*"
EOF
  chmod +x "$FAKEBIN/$stub"
done
export PATH="$FAKEBIN:$PATH"

RELEASES="$TMP/releases"
mkdir -p "$RELEASES"
CURRENT="$TMP/current"
PREVIOUS="$TMP/previous"

sed -e "s|^RELEASES_DIR=.*|RELEASES_DIR=$RELEASES|" \
    -e "s|^CURRENT_LINK=.*|CURRENT_LINK=$CURRENT|" \
    -e "s|^PREVIOUS_LINK=.*|PREVIOUS_LINK=$PREVIOUS|" \
    "$DEPLOY_SITE" > "$TMP/deploy-site"
chmod +x "$TMP/deploy-site"
DS="$TMP/deploy-site"

SRC1="$TMP/src1"
SRC2="$TMP/src2"
mkdir -p "$SRC1" "$SRC2"
echo "release one" > "$SRC1/index.html"
echo "release two" > "$SRC2/index.html"

# --- tests ------------------------------------------------------------------

echo "deploy-site: publishing a release"
out="$("$DS" --release abc123 --source "$SRC1" 2>&1)"
status=$?
if [[ $status -ne 0 ]]; then
  fail "publish succeeds" "exit $status: $out"
else
  pass "publish succeeds"
fi
assert_contains "$out" "live -> abc123" "publish reports the live release"
assert_eq "$RELEASES/abc123" "$(readlink -f "$CURRENT" 2>/dev/null)" "current symlink points at the release"
assert_eq "release one" "$(cat "$RELEASES/abc123/index.html" 2>/dev/null)" "release content was copied"
if [[ ! -e "$PREVIOUS" ]]; then
  pass "no previous release recorded on first publish"
else
  fail "no previous release recorded on first publish" "previous symlink was created: $(readlink -f "$PREVIOUS" 2>/dev/null)"
fi

echo "deploy-site: status"
out="$("$DS" --status 2>&1)"
assert_contains "$out" "abc123" "status reports the current release"
assert_contains "$out" "releases: 1" "status reports the release count"

echo "deploy-site: publishing a second release"
out="$("$DS" --release def456 --source "$SRC2" 2>&1)"
status=$?
if [[ $status -ne 0 ]]; then
  fail "second publish succeeds" "exit $status: $out"
else
  pass "second publish succeeds"
fi
assert_eq "$RELEASES/def456" "$(readlink -f "$CURRENT" 2>/dev/null)" "current symlink moved to the new release"
assert_eq "$RELEASES/abc123" "$(readlink -f "$PREVIOUS" 2>/dev/null)" "previous symlink records the old release"
assert_eq "release two" "$(cat "$RELEASES/def456/index.html" 2>/dev/null)" "second release content was copied"

echo "deploy-site: rollback"
out="$("$DS" --rollback 2>&1)"
status=$?
if [[ $status -ne 0 ]]; then
  fail "rollback succeeds" "exit $status: $out"
else
  pass "rollback succeeds"
fi
assert_eq "$RELEASES/abc123" "$(readlink -f "$CURRENT" 2>/dev/null)" "rollback restored the previous release"
assert_eq "$RELEASES/def456" "$(readlink -f "$PREVIOUS" 2>/dev/null)" "rollback is itself reversible"

echo "deploy-site: argument validation"
assert_fails "unknown flag is rejected" "unknown argument" "$DS" --nope
assert_fails "missing --release is rejected" "--release is required" "$DS" --source "$SRC1"
assert_fails "missing --source is rejected" "--source is required" "$DS" --release abc123
assert_fails "missing source directory is rejected" "source directory not found" "$DS" --release abc123 --source "$TMP/does-not-exist"
assert_fails "unsafe release identifier is rejected" "unsafe release identifier" "$DS" --release "../evil" --source "$SRC1"
assert_fails "unsafe release identifier with slash is rejected" "unsafe release identifier" "$DS" --release "a/b" --source "$SRC1"

# --- install-deploy-site ----------------------------------------------------
# The release engine is installed from the repository on every deploy, so that
# a fix reaches the server without a manual root session.
INSTALLER="$SCRIPT_DIR/install-deploy-site"
if [[ -f "$INSTALLER" ]]; then
  echo "deploy-site: install-deploy-site"
  DEST_FILE="$TMP/installed-deploy-site"
  chmod +x "$INSTALLER"

  out="$(DEPLOY_SITE_DEST="$DEST_FILE" "$INSTALLER" "$DEPLOY_SITE" 2>&1)"
  status=$?
  if [[ $status -ne 0 ]]; then
    fail "installer accepts a valid source" "exit $status: $out"
  else
    pass "installer accepts a valid source"
  fi
  assert_eq "755" "$(stat -c '%a' "$DEST_FILE" 2>/dev/null)" "installed script is mode 0755"
  if diff -q "$DEPLOY_SITE" "$DEST_FILE" >/dev/null 2>&1; then
    pass "installed script matches the source"
  else
    fail "installed script matches the source" "content differs"
  fi

  # A file that is not valid bash at all.
  printf 'if [ -z ; then\n  fi\n' > "$TMP/broken.sh"
  # A file that is valid bash but is not the release engine.
  printf '#!/usr/bin/env bash\necho "not the release engine"\n' > "$TMP/other.sh"

  assert_fails "installer refuses a missing source" "source file not found" \
    env DEPLOY_SITE_DEST="$DEST_FILE" "$INSTALLER" "$TMP/nope"
  assert_fails "installer refuses a directory" "source file not found" \
    env DEPLOY_SITE_DEST="$DEST_FILE" "$INSTALLER" "$TMP"
  assert_fails "installer refuses a non-bash file" "not valid bash" \
    env DEPLOY_SITE_DEST="$DEST_FILE" "$INSTALLER" "$TMP/broken.sh"
  assert_fails "installer refuses a file that is not deploy-site" "does not look like deploy-site" \
    env DEPLOY_SITE_DEST="$DEST_FILE" "$INSTALLER" "$TMP/other.sh"
  assert_fails "installer requires a source argument" "source file is required" \
    env DEPLOY_SITE_DEST="$DEST_FILE" "$INSTALLER"
else
  fail "install-deploy-site exists" "not found at $INSTALLER"
fi

echo
echo "passed: $PASS  failed: $FAIL"
[[ $FAIL -eq 0 ]] || exit 1
echo "deploy-site: all tests passed"
