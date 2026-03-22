#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

IMAGE_NAME="${IMAGE_NAME:-ppeyes}"
IMAGE_TAG="${IMAGE_TAG:-x86_64}"
PLATFORM="${PLATFORM:-linux/amd64}"
OUTPUT_DIR="${OUTPUT_DIR:-dist}"
OUTPUT_FILE="${OUTPUT_FILE:-${IMAGE_NAME}-${IMAGE_TAG}.tar}"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"

echo "[1/3] Building ${IMAGE_REF} for ${PLATFORM} ..."
docker buildx build \
  --platform "${PLATFORM}" \
  --tag "${IMAGE_REF}" \
  --load \
  .

mkdir -p "${OUTPUT_DIR}"

echo "[2/3] Exporting ${IMAGE_REF} to ${OUTPUT_DIR}/${OUTPUT_FILE} ..."
docker save \
  --output "${OUTPUT_DIR}/${OUTPUT_FILE}" \
  "${IMAGE_REF}"

echo "[3/3] Done."
echo "Image tarball: ${ROOT_DIR}/${OUTPUT_DIR}/${OUTPUT_FILE}"
