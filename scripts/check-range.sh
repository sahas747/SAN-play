#!/bin/sh
# Usage: ./check-range.sh "<audio download URL>"   Expect: HTTP 206, Accept-Ranges: bytes, Content-Range, audio/* Content-Type, small Content-Length.
[ -z "$1" ] && { echo 'usage: check-range.sh URL'; exit 1; }
curl -s -o /dev/null -D - -H 'Range: bytes=0-1023' "$1" | grep -iE '^(HTTP|accept-ranges|content-range|content-length|content-type)'
