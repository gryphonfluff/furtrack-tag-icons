#!/usr/bin/python3

import functools
import glob
import hashlib
import json
import os
import requests
import struct
import time

def all_tags():
    r = requests.get('https://solar.furtrack.com/get/tags/all')
    r.raise_for_status()
    r = r.json()
    if not r['success']: raise 'unsuccessful'
    return r

def get_index(name):
    r = requests.get('https://solar.furtrack.com/get/index/' + name)
    r.raise_for_status()
    r = r.json()
    if not r['success']: raise 'unsuccessful'
    return r

def with_delay(delay):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapped(*args, **kwargs):
            ret = fn(*args, **kwargs)
            time.sleep(delay)
            return ret
        return wrapped
    return decorator

@with_delay(0.1)
def get_stub(name):
    j = get_index(name)
    if 'tagmeta' in j:
        name = j['tagmeta']['tagName']
        stub = j['tagmeta']['tagUrlStub']
        print(f'{name}: {stub}')
        if stub != '':
            return stub
    return None

def extract_tag_names(r):
    return map(lambda t: t['tagName'], r['tags'])

def is_char_tag(name):
    return name.startswith('1:')

def is_in_shard(index, total_shards):
    def predicate(name):
        h = hashlib.sha256(name.encode('utf-8')).digest()
        return struct.unpack('>L', h[-4:])[0] % total_shards == index
    return predicate

def load_json_file(path):
    with open(path) as f:
        return json.load(f)

def save_file(path, data):
    tmp_path = path + '.tmp'
    with open(tmp_path, 'wb') as f:
        f.write(data)
    os.rename(tmp_path, path)

def json_compact_serialize(obj):
    return json.dumps(obj, separators=(',', ':'), sort_keys=True).encode('utf-8')

def shard_file_path(filename):
    return os.path.join('tags', filename)

def generate_shard(index, total_shards):
    os.makedirs('tags', exist_ok=True)

    char_tags_names = filter(is_char_tag, extract_tag_names(all_tags()))
    names = sorted(filter(is_in_shard(index, total_shards), char_tags_names))
    mappings = {name: get_stub(name) for name in names}

    stubs = {name: stub for name, stub in mappings.items() if stub}
    nostubs = sorted([name for name, stub in mappings.items() if not stub])
    seed = {'stubs': stubs, 'nostubs': nostubs}
    print(f'# has stubs: {len(stubs)} tags')
    print(f'# no stubs: {len(nostubs)} tags')

    data = json_compact_serialize(seed)
    digest = hashlib.sha256(data).hexdigest()

    filename = f'shard-{digest}.json'
    path = shard_file_path(filename)
    save_file(path, data)
    print(f'# shard {index}: {path} saved')
    return filename

def cron():
    index = 0
    total_shards = 16

    start_time = time.time()
    index_path = os.path.join('tags', 'index.json')
    if os.path.exists(index_path):
        index = load_json_file(index_path)
    else:
        index = {'files': []}

    files_map = {f['name']: f for f in index['files']}
    for index in range(total_shards):
        name = f'shard-{index}'
        if name not in files_map or not os.path.exists(shard_file_path(files_map[name]['path'])):
            print(f'# generate missing: {name}')
            files_map[name] = {
                'name': name,
                'path': generate_shard(index, total_shards),
                'time': start_time,
            }

    files_by_time = sorted(files_map.values(), key=lambda f: f['time'])
    # If we didn't just generate it.
    if files_by_time[0]['time'] < start_time:
        print(f'# updating: {name}')
        name = files_by_time[0]['name']
        index = int(name.split('-')[1])
        files_map[name]['time'] = time.time()
        files_map[name]['path'] = generate_shard(index, total_shards)

    index = {'files': sorted(files_map.values(), key=lambda f: f['name'])}
    save_file(index_path, json_compact_serialize(index))

    # Delete un-referenced files.
    referenced_files = {f['path'] for f in files_map.values()}
    for path in glob.glob(os.path.join('tags', 'shard-*')):
        name = os.path.basename(path)
        if name not in referenced_files:
            print(f'# removing: {path}')
            os.remove(path)

cron()
