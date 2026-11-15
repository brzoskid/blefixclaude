#!/usr/bin/env python3
"""Uprawnienia Bluetooth w AndroidManifest.xml (idempotentnie). Lokalizację dokłada plugin Geolocation."""
import sys
p = "android/app/src/main/AndroidManifest.xml"
s = open(p, encoding="utf-8").read()
if "BLUETOOTH_CONNECT" in s and "CALL_PHONE" in s:
    print("Manifest już zawiera uprawnienia."); sys.exit(0)
perms = '''
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30"/>
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30"/>
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation"/>
    <uses-permission android:name="android.permission.CALL_PHONE"/>
    <uses-feature android:name="android.hardware.telephony" android:required="false"/>
'''
assert "</manifest>" in s
open(p, "w", encoding="utf-8").write(s.replace("</manifest>", perms + "</manifest>"))
print("OK: dodano uprawnienia BT.")
