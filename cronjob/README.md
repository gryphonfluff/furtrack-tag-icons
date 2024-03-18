# cronjob

**OBSOLETE: As of v0.2.0, tag icon info is present in the local tag database.**

Note: You only need this if you want to self-host the mapping seed.

This cronjob needs to be run periodically to update the mappings.

On the initial run, it attemps to generates all the mappings. It has a built-in throttle of 10 QPS to FurTrack server.
On the subsequent runs, it updates the oldest shards of the mappings.

The total number of shards are currently hard-coded to 16. This is about 1000 mappings each shard as of this writing.
Schedule this cronjob to run mutiple times through out the week to update each shard on rotation.

## Setup

There are two components of this background job.

### Cloud Storage Bucket

You'll need a storage to distribute these mapping files. This is currently
coded to use Google Cloud Storage buckets.

Setup the bucket as public, with [CORS setting][gcs-cors] in the `cors.json`
file, and object lifecycle management to auto-delete objects whose
`Custom-Time` is older than 7 days.

[gcs-cors]: https://cloud.google.com/storage/docs/using-cors#command-line

### Update URLs

* The bucket name in `run.sh` file in this directory.
* The bucket public URL in `seeding.ts` file in the `userscript` directory.

### Run Job using Cron

Example:

```text
00 09,21 * * * timeout -k 15m 12m furtrack-tag-icons/cronjob/run.sh
```
