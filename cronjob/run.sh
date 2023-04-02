#!/bin/bash

set -e

DIR="$(dirname "${BASH_SOURCE[0]}")"
cd "$DIR"

(
	DT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

	echo "START $DT"

	./cron_tags.py

	BUCKET="gs://furtrack-tags-seed"
	gsutil -h "Custom-Time: $DT" cp -n 'tags/shard-*' "$BUCKET/tags/"
	for NAME in tags/shard-*; do
		gsutil setmeta -h "Custom-Time: $DT" "$BUCKET/$NAME"
	done
	gsutil cp 'tags/index.json' "$BUCKET/tags/"
) >> cron.log 2>&1

tail -n 20000 cron.log > cron.log.tmp
mv cron.log.tmp cron.log
