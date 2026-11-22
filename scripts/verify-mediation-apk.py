#!/usr/bin/env python3
"""Verify SDK implementations, not merely references, exist in the final APK DEX files."""
import argparse
import re
import struct
import zipfile


def dex_classes(data):
    assert data.startswith(b'dex\n'), 'Expected a standard Android DEX file'
    u32 = lambda offset: struct.unpack_from('<I', data, offset)[0]
    string_count, string_offset = u32(56), u32(60)
    type_count, type_offset = u32(64), u32(68)
    class_count, class_offset = u32(96), u32(100)
    strings = []
    for index in range(string_count):
        offset = u32(string_offset + index * 4)
        while data[offset] & 0x80:
            offset += 1
        offset += 1
        end = data.index(b'\0', offset)
        strings.append(data[offset:end].decode('utf-8', errors='replace'))
    types = [strings[u32(type_offset + index * 4)] for index in range(type_count)]
    return {types[u32(class_offset + index * 32)] for index in range(class_count)}


def verify(apk_path):
    found = set()
    with zipfile.ZipFile(apk_path) as apk:
        for name in apk.namelist():
            if re.fullmatch(r'classes\d*\.dex', name):
                found.update(dex_classes(apk.read(name)))
    expected = {
        'Unity SDK': 'Lcom/unity3d/ads/UnityAds;',
        'Unity adapter': 'Lcom/google/ads/mediation/unity/UnityMediationAdapter;',
        'Meta SDK': 'Lcom/facebook/ads/AudienceNetworkAds;',
        'Meta adapter': 'Lcom/google/ads/mediation/facebook/FacebookMediationAdapter;',
    }
    for label, descriptor in expected.items():
        assert descriptor in found, f'Missing {label} class definition: {descriptor}'
        print(f'PASS {label}: {descriptor}')
    print(f'PASS inspected {len(found)} packaged class definitions in {apk_path}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('apk')
    verify(parser.parse_args().apk)
