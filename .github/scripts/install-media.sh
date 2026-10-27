#!/bin/bash
set -euo pipefail

# Each package operation has a total limit as well as lock/network limits.
# No global apt update: hosted runners also configure unrelated third-party repos.
media=true
emoji=false
case "${1:-}" in
  '') ;;
  --emoji) emoji=true ;;
  --emoji-only) media=false; emoji=true ;;
  *) printf 'Unknown media setup option: %s\n' "$1" >&2; exit 2 ;;
esac

have_media() { command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null; }
have_emoji() { command -v fc-match >/dev/null && [[ "$(fc-match -f '%{family}' emoji)" == *'Noto Color Emoji'* ]]; }

packages=()
if [ "$media" = true ] && ! have_media; then packages+=(ffmpeg); fi
if [ "$emoji" = true ] && ! have_emoji; then packages+=(fonts-noto-color-emoji); fi
if [ "${#packages[@]}" -eq 0 ]; then
  printf '[media-tools] Required tools/fonts already available; no package work.\n'
  exit 0
fi

run_apt() {
  printf '[media-tools] apt-get %s\n' "$*"
  timeout --kill-after=5s 60s sudo -n env DEBIAN_FRONTEND=noninteractive \
    NEEDRESTART_MODE=a APT_LISTCHANGES_FRONTEND=none apt-get \
    -o DPkg::Lock::Timeout=15 -o Dpkg::Use-Pty=0 -o Acquire::Retries=1 \
    -o Acquire::http::Timeout=15 -o Acquire::https::Timeout=15 "$@"
}

# The image's existing indexes normally suffice; avoid a network-wide refresh.
if ! run_apt install -y --no-install-recommends "${packages[@]}"; then
  sources=/etc/apt/sources.list.d/ubuntu.sources
  if [ ! -f "$sources" ]; then sources=/etc/apt/sources.list; fi
  if ! run_apt -o "Dir::Etc::sourcelist=$sources" -o Dir::Etc::sourceparts=- update; then
    printf '[media-tools] Ubuntu index refresh failed or timed out; retrying cached indexes.\n'
  fi
  if ! run_apt install -y --no-install-recommends "${packages[@]}"; then
    printf '::error::Media tools could not be installed within bounded attempts.\n' >&2
    exit 1
  fi
fi

if [ "$media" = true ] && ! have_media; then
  printf '::error::Media tools remain missing after installation.\n' >&2; exit 1
fi
if [ "$emoji" = true ] && ! have_emoji; then
  printf '::error::Noto Color Emoji remains missing after installation.\n' >&2; exit 1
fi
printf '[media-tools] Required tools/fonts are ready.\n'
