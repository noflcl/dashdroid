{ pkgs, inputs, ... }:
{
  imports =
    [
      inputs.sops-nix.nixosModules.sops
    ];
  ###
  # System
  ###
  system.stateVersion = "24.11";

  ###
  # Networking
  ###
  networking = {
    hostName = "dashdroid";
    networkmanager.enable = true;
    firewall = {
      enable = true;
      trustedInterfaces = [ ];
      allowedTCPPorts = [ ];
      allowedUDPPorts = [ ];
    };
  };

  systemd.services = {
    NetworkManager-wait-online.enable = false;
  };

  ###
  # Users
  ###
  users.users = {
    root = {
      password = "";
    };
    android = {
      isSystemUser = true;
      description = "adb user account";
      group = "users";
      extraGroups = [ "adbusers" ];
      home = "/var/lib/dashdroid";
      createHome = true;
    };
  };
  users.motd = ''
      _           _         _           _     _
   __| | __ _ ___| |__   __| |_ __ ___ (_) __| |
  / _` |/ _` / __| '_ \ / _` | '__/ _ \| |/ _` |
 | (_| | (_| \__ \ | | | (_| | | | (_) | | (_| |
  \__,_|\__,_|___/_| |_|\__,_|_|  \___/|_|\__,_|

'';

  environment.interactiveShellInit = ''
    export PS1="\n\[\033[1;31m\][\[\e]0;\u@\h:\w\a\] \u @\[\033[0;35m\] \h\[\033[1;31m\]: \w]\n $ \[\033[0m\]"
    color_prompt=yes
    alias vi="vim"
    alias nano="vim"
    alias edit="vim"
  '';

  ###
  # Packages
  ###
  programs.adb.enable = true;

  environment.systemPackages = with pkgs; [
    btop
    git
    nodejs_23
    scrcpy
    usbutils
    vim
  ];

  ###
  # Services
  ###
  systemd.tmpfiles.rules = [
    "d /var/lib/dashdroid 0755 android users -"
  ];

  systemd.services.dashdroid = {
    description = "dashdroid Auto-start Service";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];

    environment = {
      HOME = "/var/lib/dashdroid";
    };

    serviceConfig = {
      Type = "simple";
      User = "android";
      Group = "users";
      WorkingDirectory = "/var/lib/dashdroid";
      Restart = "always";
    };

    script = ''
      if [ ! -d "/var/lib/dashdroid/app" ]; then
        git clone https://github.com/noflcl/dashdroid.git app
      else
        cd app
        git pull
      fi

      cd app
      npm install
      npm run dev
    '';
  };

  ###
  # Virtual Machine
  ###
  microvm = {
    hypervisor = "qemu";
    socket = "control.socket";
    mem = 1 * 1024;
    vcpu = 1;

    # Use this reference to pass USB devices to the VM
    # Boot device normally and obtain vendorID, productID, serialID, then reboot into
    # fastboot mode, repeat to get fastboot mode vendorID, productID

    # lsusb to find vendorID & productID, add the `0x` prefix
    # lsusb -v -d 18d1:4ee7 to get detailed info of the device

    # 15141FDD4001CR - droidsrv0
    # 09151FDD40031J - droidsrv1

    # devices = [
    #   # adb mode 4ee7
    #   { bus = "usb"; path = "vendorid=0x18d1,productid=0x4ee7,serial='15141FDD4001CR'"; }
    #   { bus = "usb"; path = "vendorid=0x18d1,productid=0x4ee7,serial='09151FDD40031J'"; }
    #   # fastboot mode 4ee0
    #   { bus = "usb"; path = "vendorid=0x18d1,productid=0x4ee0,serial='15141FDD4001CR'"; }
    #   { bus = "usb"; path = "vendorid=0x18d1,productid=0x4ee0,serial='09151FDD40031J'"; }
    # ];

    interfaces = [ {
      type = "user";
      id = "qemu";
      mac = "02:00:00:01:01:01";
    } ];

    volumes = [{
      mountPoint = "/";
      image = "dashdroid.img";
      size = 8 * 1024;
    }];

    shares = [{
      proto = "9p";
      tag = "ro-store";
      source = "/nix/store";
      mountPoint = "/nix/.ro-store";
    }];
  };
}
