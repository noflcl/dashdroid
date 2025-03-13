# Android Commands
These are the commands that need to be converted to API calls

### System

Start and stop the adb server
```
# Start server without probing for devices
adb start-server

# Stop server immediately  (will kill all commands running)
adb kill-server
```

With multiple connected devices, when referencing individuals, use the `-s` serial flag for adb commands to target specified devices
```
# ${device} can be a unique serial of the device or ip-addr:port

adb -s ${device} command-to-run
```

Restart device or reboot bootloader for `fastboot` mode
```
adb -s ${device} reboot
adb -s ${device} reboot-bootloader
```

Will start the `adb` server if not running and probe for any connected devices. If a device is already connected physically or over TCP, this command will return it
```
adb devices
```

Connect to a network enabled ADB device
```
# Almost always searching for port 5555
adb connect ip-addr:port
```

### File management

```
# Copy a file from computer to device
adb -s ${device} push [source] [destination]

# Copy a file from device to computer
adb -s ${device} pull [device file location] [local file location]

# To recursively copy files and folders use the `-r` flag
adb -s ${device} push -r [source] [destination]
adb -s ${device} pull -r [device file location] [local file location]
```

### Package management

Install
```
adb -s ${device} install yourApp.apk

# Install package on ALL CONNECTED DEVICES
adb devices | tail -n +2 | cut -sf 1 | xargs -IX adb -s X install -r yourApp.apk
```

Remove
```
adb -s ${device} uninstall yourApp.apk

# -k means remove without deleting existing data
adb -s ${device} uninstall -k yourApp.apk

# Remove package on ALL CONNECTED DEVICES
adb devices | tail -n +2 | cut -sf 1 | xargs -IX adb -s X uninstall com.yourPackageName

# Example removing F-Droid from ALL CONNECTED DEVICES
adb devices | tail -n +2 | cut -sf 1 | xargs -IX adb -s X uninstall org.fdroid.fdroid
```

Update App
```
# -r means re-install the app and keep its data on the device.
adb -s ${device} install -r yourApp.apk

# -k means install and remove all existing data
adb -s ${device} install –k yourApp.apk
```

Delete App Data
```
# Delete all data connected to an application
adb -s ${device} shell pm clear yourPackageName

# Example removing all data belonging to F-Droid
adb -s ${device} shell pm clear org.fdroid.frdoid
```
### Device

Rotate Reference
```
# disable auto rotate
adb shell settings put system accelerometer_rotation 0

# Next, set the desired orientation using the user_rotation setting:
#    0 for Portrait (0°)
#    1 for Landscape (90°)
#    2 for Portrait Reversed (180°)
#    3 for Landscape Reversed (270°)

adb shell settings put system user_rotation 3
```

## Paths

Path Reference
```
/data/data/<package>/databases (app databases)
/data/data/<package>/shared_prefs/ (shared preferences)
/data/app (apk installed by user)
/system/app (pre-installed APK files)
/mmt/asec (encrypted apps) (App2SD)
/mmt/emmc (internal SD Card)
/mmt/adcard (external/Internal SD Card)
/mmt/adcard/external_sd (external SD Card)
```

Device Info
```
adb get-statе (print device state)
adb get-serialno (get the serial number)
adb shell dumpsys iphonesybinfo (get the IMEI)
adb shell netstat (list TCP connectivity)
adb shell pwd (print current working directory)
adb shell dumpsys battery (battery status)
adb shell pm list features (list phone features)
adb shell service list (list all services)
adb shell dumpsys activity <package>/<activity> (activity info)
adb shell ps (print process status)
adb shell wm size (displays the current screen resolution)
dumpsys window windows | grep -E 'mCurrentFocus|mFocusedApp' (print current app's opened activity)
```

Package Info
```
adb shell list packages (list package names)
adb shell list packages -r (list package name + path to apks)
adb shell list packages -3 (list third party package names)
adb shell list packages -s (list only system packages)
adb shell list packages -u (list package names + uninstalled)
adb shell dumpsys package packages (list info on all apps)
adb shell dump <name> (list info on one package)
adb shell path <package> (path to the apk file)
```

Backup Restore
```
adb backup -apk -all -f backup.ab (backup settings and apps)
adb backup -apk -shared -all -f backup.ab (backup settings, apps and shared storage)
adb backup -apk -nosystem -all -f backup.ab (backup only non-system apps)
adb restore backup.ab (restore a previous backup)

adb backup // Create a full backup of your phone and save to the computer.
adb restore // Restore a backup to your phone.
adb sideload //  Push and flash custom ROMs and zips from your computer.
```
