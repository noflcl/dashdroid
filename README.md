# dashdroid

<p align="center">
  <strong>Documentation:</strong>
  <a href="./docs/main.md">Markdown</a>
  •
  <a href="./CHANGELOG.md">Changelog</a>
</p>
<p align="center">
  <!-- <img src="doc/src/demo.gif" alt="Demo GIF"> -->
  <img src="docs/assets/images/dashdroid-panel.webp">
</p>

Web dashboard to manage ADB enabled Android devices.

### Alpha Project! There will be bugs

## Install

Only tested on Linux `X11`. The only command I see failing on Mac or Windows is when calling remote display commands I'm using `wmctrl` to query window titles and raise a window alert rather than spawning a new window if a remote display window is already active for that device.

### Dependencies
If you are running locally without Docker or MicroVM you must install the following dependencies:
- `adb`
- `fastboot`
- `scrcpy`
- `wmctrl`

Optional:
- `ssh` - If you decide to install Termux or nix-on-droid

## Start

To run the dashboard first enter the `app` directory and install the Node dependencies.

- `npm install` to install dependencies

Now you can run the dashboard in its early Alpha stages.

- `npm run dev` to start the dashboard

## Docker

Current base image is Ubuntu 22.04, build with Docker and run the dashboard locally.

- `docker build -t dashdroid:latest .` to build the image

- Run the image or use the supplied compose file

<mark>Note:</mark> I have yet to overwrite my adb keys with this project, I suggest backing your local keys up (If you have any).

```
docker run \
  --name dashdroid \
  --restart unless-stopped \
  --privileged \
  -v ./settings.cfg:/app/settings.cfg \
  -v /path/to/adb/keys/.android:/root/.android:rw \
  -v /dev/bus/usb:/dev/bus/usb:ro \
  -v /tmp/.X11-unix:/tmp/.X11-unix:ro \
  -v /run/user/1000/pulse:/run/user/1000/pulse \
  -p 3000:3000 \
  -e NODE_ENV=development \
  -e DISPLAY=${DISPLAY} \
  -e QT_X11_NO_MITSHM=1 \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  -e SDL_AUDIODRIVER=pulseaudio \
  dashdroid
```

## MicroVM

If using `Nix` or `NixOS` you need flakes enabled, default virtual machine is `qemu` easily change with your choice of [supported hypervisor]("https://github.com/astro/microvm.nix#hypervisors").

- `nix run .#dashdroid` to build and run dashdroid with MicroVM

There are more ways of using the project with Nix / NixOS. View the documentation [here](docs/nixos.md) for more examples.


## ToDo
  - [ ] GPU monitoring
    - Different depending on device (create general GPU test for correct command)
  - [ ] SSH isn't flushed out, would like to enable it from the dashboard
