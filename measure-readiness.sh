#!/usr/bin/env bash

set -u

wait_for_200() {
  service_name="$1"
  url="$2"
  global_start_ns="$3"
  timeout_seconds=30

  while true; do
    current_ns=$(date +%s%N)
    elapsed_ms=$(( (current_ns - global_start_ns) / 1000000 ))

    if [ "$elapsed_ms" -ge $((timeout_seconds * 1000)) ]; then
      echo "$service_name : aucun HTTP 200 après ${timeout_seconds} secondes"
      return 1
    fi

    status=$(
      curl \
        --silent \
        --output /dev/null \
        --write-out "%{http_code}" \
        --max-time 1 \
        "$url" 2>/dev/null
    ) || status="000"

    if [ "$status" = "200" ]; then
      echo "$service_name : ${elapsed_ms} ms jusqu'au premier HTTP 200"
      return 0
    fi

    sleep 0.2
  done
}

docker compose down >/dev/null 2>&1 || true

start_ns=$(date +%s%N)

wait_for_200 \
  "clickfast-game" \
  "http://localhost:8080" \
  "$start_ns" &
game_pid=$!

wait_for_200 \
  "clickfast-api" \
  "http://localhost:3000/health" \
  "$start_ns" &
api_pid=$!

wait_for_200 \
  "clickfast-stats-api" \
  "http://localhost:8000/health" \
  "$start_ns" &
stats_pid=$!

docker compose up -d >/dev/null 2>&1

wait "$game_pid"
wait "$api_pid"
wait "$stats_pid"