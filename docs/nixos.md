# NixOS dashdroid

If you want to run `dashdroid` on NixOS you can pick your poison💊

`git pull https://github.com/noflcl/dashdroid.git`

## Native

To install adb and fastoot system wide, `programs.adb.enable = true;` and add user to group `adbusers` if you don't want to use sudo with adb and fastboot commands.

You can install the dependencies within your `configuration.nix`, or `home-manager` config, you could use `nix-shell -p` to temporarily satisfy dependencies, heck there is `direnv` directory under the `nix` directory if your heart desires.

- `android-tools` ( do not install if `programs.adb.enable = true;` )
- `wmctrl`
- `scrcpy`
- `nodejs_23`
- `usbutils`

## oci-containers
Remember to build the container image from the supplied Dockerfile first

`docker build -t dashdroid:latest .`

```nix
  virtualisation = {
    containers.enable = true;
    docker.enable = true;

    oci-containers.containers = {
      "dashdroid" = {
        autoStart = true;
        image = "dashdroid:latest";
        environment = {
          NODE_ENV = "development";
          DISPLAY = "$DISPLAY";
          XAUTHORITY = "/root/.Xauthority";
          QT_X11_NO_MITSHM = "1";
          PULSE_SERVER = "unix:/run/user/1000/pulse/native"; # for audio
          SDL_AUDIODRIVER = "pulseaudio ";
        };
        ports = [
          "3000:3000/tcp"
        ];
        volumes = [
          "./settings.cfg:/app/settings.cfg"
          "/path/to/keys/.android:/root/.android:rw"
          "/dev/bus/usb:/dev/bus/usb:ro"
          "/tmp/.X11-unix:/tmp/.X11-unix:ro"
          "${XAUTHORITY:-$HOME/.Xauthority}:/root/.Xauthority:ro"
          "/run/user/1000/pulse:/run/user/1000/pulse # for audio"
        ];
      };
    };
  };
```

## MicroVM

You need flakes enabled, default virtual machine is `qemu` easily changed with your choice of [supported hypervisor]("https://github.com/astro/microvm.nix#hypervisors").

- `nix run .#dashdroid` to build and run dashdroid with MicroVM

<mark>Note:</mark> Review the `guest.nix` file to pass devices to your VM.

## direnv

You need flakes enabled, navigate into the `nix -> direnv` and execute `direnv allow` to start the dashdroid server 😎
