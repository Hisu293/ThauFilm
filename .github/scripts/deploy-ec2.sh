#!/usr/bin/env bash

set -Eeuo pipefail

readonly RELEASE_ID="${1:?Release ID is required}"
readonly DEPLOY_BACKEND="${2:?Backend deployment selection is required}"
readonly DEPLOY_FRONTEND="${3:?Frontend deployment selection is required}"
readonly DEPLOY_ROOT="/opt/thaufilm"
readonly RELEASES_DIR="${DEPLOY_ROOT}/releases"
readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
readonly SHARED_ENV="${DEPLOY_ROOT}/shared/.env"
readonly ARCHIVE_PATH="/tmp/thaufilm-${RELEASE_ID}.zip"

if [[ ! "${RELEASE_ID}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Release ID is not a full Git commit SHA: ${RELEASE_ID}" >&2
  exit 1
fi

for deployment_selection in "${DEPLOY_BACKEND}" "${DEPLOY_FRONTEND}"; do
  if [[ "${deployment_selection}" != "true" &&
        "${deployment_selection}" != "false" ]]; then
    echo "Deployment selections must be true or false." >&2
    exit 1
  fi
done

if [[ "${DEPLOY_BACKEND}" == "false" &&
      "${DEPLOY_FRONTEND}" == "false" ]]; then
  echo "No service was selected for deployment." >&2
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

umask 077
mkdir -p "${RELEASES_DIR}" "${RELEASE_DIR}"
unzip -q -o "${ARCHIVE_PATH}" -d "${RELEASE_DIR}"

if [[ -r "${SHARED_ENV}" ]]; then
  install -m 0600 "${SHARED_ENV}" "${RELEASE_DIR}/.env"
else
  echo "Shared .env not found; using Docker Compose defaults."
fi

cd "${RELEASE_DIR}"

docker compose config --quiet

running_services="$(docker compose ps --status running --services)"

require_running_service() {
  local required_service="$1"

  if ! grep -qx "${required_service}" <<<"${running_services}"; then
    echo "Required service is not running: ${required_service}" >&2
    echo "Start the required dependency before retrying deployment." >&2
    exit 1
  fi
}

services_to_build=()

if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
  require_running_service database
  services_to_build+=(backend)
elif [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
  require_running_service database
  require_running_service backend
fi

if [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
  services_to_build+=(frontend)
fi

docker compose build "${services_to_build[@]}"

if [[ "${DEPLOY_BACKEND}" == "true" ]]; then
  docker compose up \
    --detach \
    --no-deps \
    --wait \
    --wait-timeout 300 \
    backend
fi

if [[ "${DEPLOY_FRONTEND}" == "true" ]]; then
  docker compose up \
    --detach \
    --no-deps \
    --wait \
    --wait-timeout 300 \
    frontend
fi

ln -sfn "${RELEASE_DIR}" "${DEPLOY_ROOT}/current.next"
mv -Tf "${DEPLOY_ROOT}/current.next" "${DEPLOY_ROOT}/current"

rm -f -- "${ARCHIVE_PATH}"

docker compose ps
echo "Deployment completed (${services_to_build[*]}): ${RELEASE_ID}"
