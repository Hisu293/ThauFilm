#!/usr/bin/env bash

set -Eeuo pipefail

readonly RELEASE_ID="${1:?Release ID is required}"
readonly DEPLOY_ROOT="/opt/thaufilm"
readonly RELEASES_DIR="${DEPLOY_ROOT}/releases"
readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
readonly SHARED_ENV="${DEPLOY_ROOT}/shared/.env"
readonly ARCHIVE_PATH="/tmp/thaufilm-${RELEASE_ID}.zip"

if [[ ! "${RELEASE_ID}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Release ID is not a full Git commit SHA: ${RELEASE_ID}" >&2
  exit 1
fi

for command_name in docker unzip; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command is missing on EC2: ${command_name}" >&2
    exit 1
  fi
done

docker compose version >/dev/null

if [[ ! -f "${ARCHIVE_PATH}" ]]; then
  echo "Deployment archive does not exist: ${ARCHIVE_PATH}" >&2
  exit 1
fi

if [[ ! -r "${SHARED_ENV}" ]]; then
  echo "Shared environment file is missing or unreadable: ${SHARED_ENV}" >&2
  exit 1
fi

umask 077
mkdir -p "${RELEASES_DIR}" "${RELEASE_DIR}"
unzip -q -o "${ARCHIVE_PATH}" -d "${RELEASE_DIR}"
install -m 0600 "${SHARED_ENV}" "${RELEASE_DIR}/.env"

cd "${RELEASE_DIR}"

docker compose config --quiet
docker compose up \
  --build \
  --detach \
  --remove-orphans \
  --wait \
  --wait-timeout 300

ln -sfn "${RELEASE_DIR}" "${DEPLOY_ROOT}/current.next"
mv -Tf "${DEPLOY_ROOT}/current.next" "${DEPLOY_ROOT}/current"

rm -f -- "${ARCHIVE_PATH}"

docker compose ps
echo "Deployment completed: ${RELEASE_ID}"
