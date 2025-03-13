let adbStatusChecked = false;
let checkInProgress = false;

async function initializeADBServer() {
  try {
    const response = await fetch("/api/adb/status");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("[ADB] Server initialization failed:", error);
    return false;
  }
}

async function checkADBStatus() {
  if (checkInProgress) {
    console.log("[ADB] Status check already in progress");
    return;
  }

  checkInProgress = true;
  try {
    const pageName = window.location.pathname.split("/").pop() || "index.html";
    console.log(`[${pageName}] Checking ADB server status...`);

    const serverInitialized = await initializeADBServer();
    if (!serverInitialized) {
      throw new Error("Failed to initialize ADB server");
    }

    // Only server checks update status circle
    const statusCircle = document.getElementById("adbStatus");
    if (statusCircle) {
      statusCircle.classList.add("active");
    }

    adbStatusChecked = true;
    return adbStatusChecked;
  } catch (error) {
    console.error("[ADB] Status check failed:", error);
    throw error;
  } finally {
    checkInProgress = false;
  }
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

async function loadSettings() {
  try {
    // Only load settings if we're on the settings page
    const isSettingsPage = window.location.pathname.includes('settings.html');
    if (!isSettingsPage) {
      console.log('Not on settings page, skipping settings load');
      return;
    }

    const response = await fetch('/api/settings');
    const settings = await response.json();

    // Get all form elements and check if they exist
    const elements = {
      // serverPort: document.getElementById('serverPort'),
      forceFullscreen: document.getElementById('forceFullscreen'),
      screenSize: document.getElementById('screenSize'),
      forceOrientation: document.getElementById('forceOrientation'),
      alwaysOnTop: document.getElementById('alwaysOnTop'),
      disableScreensaver: document.getElementById('disableScreensaver')
    };

    // Check if all elements exist before updating
    const missingElements = Object.entries(elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.warn('Missing form elements:', missingElements);
      return;
    }

    // Populate form fields
    // elements.serverPort.value = settings.serverPort;
    elements.forceFullscreen.checked = settings.forceFullscreen === "true";
    elements.screenSize.value = settings.screenSize;
    elements.forceOrientation.value = settings.forceOrientation;
    elements.alwaysOnTop.checked = settings.alwaysOnTop === "true";
    elements.disableScreensaver.checked = settings.disableScreensaver === "true";

  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const form = document.getElementById('settings-form');
  const formData = new FormData(form);
  // const currentPort = window.location.port;
  // const newPort = formData.get('serverPort');

  // Build settings object with all form values
  const settings = {
    // serverPort: newPort,
    forceFullscreen: formData.get('forceFullscreen') === 'on' ? 'true' : 'false',
    screenSize: formData.get('screenSize'),
    forceOrientation: formData.get('forceOrientation'),
    alwaysOnTop: formData.get('alwaysOnTop') === 'on' ? 'true' : 'false',
    disableScreensaver: formData.get('disableScreensaver') === 'on' ? 'true' : 'false'
  };

  // Ensure all required settings are present
  Object.keys(settings).forEach(key => {
    if (settings[key] === null) {
      settings[key] = 'false'; // Default value for missing checkboxes
    }
  });

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (response.ok) {
      showNotification('Settings saved successfully');

      // Check if server port has changed
      // if (newPort !== currentPort) {
      //   const content = `
      //             <h2>Server Port Changed</h2>
      //             <p>New server address will be: <br><br>
      //             <strong>
      //                 <a href="http://localhost:${newPort}">http://localhost:${newPort}</a>
      //             </strong></p>
      //             <p>Please restart the server.</p>
      //         `;
      //   Modal.open(content);
      // } else {
      //   showNotification('Settings saved successfully');
      // }
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showNotification('Failed to save settings', 'error');
  }
}

async function restoreDefaults() {
  try {
    const response = await fetch('/api/settings/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      await loadSettings(); // Reload form with default values
      showNotification('Settings restored to defaults');
    } else {
      throw new Error('Failed to restore defaults');
    }
  } catch (error) {
    console.error('Failed to restore defaults:', error);
    showNotification('Failed to restore defaults', 'error');
  }
}

async function checkDeviceAuthorization(deviceId) {
  try {
    const response = await fetch("/api/adb/devices");
    const { devices } = await response.json();

    // Find device in list and check if unauthorized
    const deviceStatus = devices.find((device) => device.includes(deviceId));
    return deviceStatus && !deviceStatus.includes("unauthorized");
  } catch (error) {
    console.error("Failed to check device authorization:", error);
    return false;
  }
}

function updateDeviceList(devices) {
  const deviceList = document.querySelector(".item1");
  const deviceListHtml = devices.length
    ? devices
      .map((device) => {
        const [id, status] = device.replace('\t', ' ').split(" ");
        const isBootloader = status === "bootloader";
        const deviceType = isBootloader ? "bootloader" : (id.includes(":") ? "net" : "usb");
        const isAuthorized = status !== "unauthorized";
        const isOffline = status === "offline";
        const buttonText = status === 'unauthorized' ? 'Unauthorized' : 'Remote Display';

        const isDisabled = !isAuthorized || isOffline;

        return `
          <div class="device-item ${isDisabled ? "unauthorized" : ""} ${isBootloader ? "bootloader" : ""} ${id === selectedDevice ? "selected" : ""
          }"
              data-device-id="${id}"
              data-authorized="${isAuthorized}"
              data-offline="${isOffline}"
              data-type="${deviceType}">
              <span class="device-id ${isDisabled ? "unauthorized" : ""}">${id}</span>
              <div class="badge device-type ${deviceType}">${deviceType}</div>
              ${!isBootloader ? `
              <button class="display-btn gh-solid ${isDisabled ? "unauthorized" : ""}"
                  data-id="${id}"
                  data-type="${deviceType}"
                  ${isDisabled ? "disabled" : ""}>
                  ${buttonText}
              </button>` : ''}
          </div>`;
      })
      .join("")
    : '<div class="no-devices">No devices connected</div>';

  deviceList.innerHTML = `
      <div class="item-header-flex">
          <h2 class="item-header">Systems</h2>
          <button class="refresh-btn" title="Refresh Devices">
              <i class="fa fa-refresh"></i>
          </button>
          <button class="add-device-btn gh-white">+ Add New Device</button>
      </div>
      <div class="device-list">
          ${deviceListHtml}
      </div>
  `;

  // Attach event listeners after HTML is updated
  document.querySelectorAll(".device-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation();
      const authorized = item.dataset.authorized === "true";
      const offline = item.dataset.offline === "true";
      const deviceType = item.dataset.type;

      if (!authorized || offline) {
        console.log(
          `Cannot select ${offline ? "offline" : "unauthorized"} device`
        );
        return;
      }

      const deviceId = item.dataset.deviceId;
      document
        .querySelectorAll(".device-item")
        .forEach((d) => d.classList.remove("selected"));
      item.classList.add("selected");
      selectedDevice = deviceId;

      if (deviceType === "bootloader") {
        const unlockedStatus = await getFastbootVar(deviceId, "unlocked");
        showPowerMenu(deviceId, true, unlockedStatus);
      } else {
        showPowerMenu(deviceId, false, null);
        startMonitoring(deviceId);
      }
    });
  });

  document.querySelectorAll(".display-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent event propagation to avoid opening the power menu
      const deviceId = btn.dataset.id;

      try {
        const response = await fetch("/api/display", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ deviceId })
        });

        if (!response.ok) {
          throw new Error('Failed to start display');
        }

        const result = await response.json();
        if (!result.success) {
          console.error("Failed to start display:", result.error);
        }
      } catch (error) {
        console.error("Display command failed:", error);
      }
    });
  });

  // Update info for all devices including unauthorized
  updateDeviceInfo(devices);
  initDeviceControls();
}

async function getConnectedDevices() {
  try {
    const adbResponse = await fetch("/api/adb/devices");
    const adbData = await adbResponse.json();

    const fastbootResponse = await fetch("/api/fastboot/devices");
    const fastbootData = await fastbootResponse.json();

    const devices = [
      ...adbData.devices,
      ...fastbootData.devices.filter(device => device.trim() !== "").map((device) => `${device}\tbootloader`)
    ];

    if (!devices.length) {
      console.log("No devices connected");
      updateDeviceList([]);
      return;
    }

    updateDeviceList(devices);
    console.log("Connected devices:", devices);
  } catch (error) {
    console.error("[Device Check] Error:", error.message);
  }
}

// Android version and patch level
async function updateDeviceInfo(devices) {
  const item2 = document.querySelector(".item2");
  const deviceInfoHtml = [];

  for (const device of devices) {
    try {
      const [id, status] = device.split("\t");
      const isBootloader = status === "bootloader";
      const isAuthorized = status !== "unauthorized";
      const isOffline = status === "offline";

      if (!isAuthorized) {
        deviceInfoHtml.push(`
          <div class="device-info unauthorized">
            <div class="version">Device Unauthorized</div>
          </div>
        `);
        continue;
      }

      if (isOffline) {
        deviceInfoHtml.push(`
          <div class="device-info offline">
            <div class="version">Device is offline</div>
          </div>
        `);
        continue;
      }

      if (isBootloader && id.trim() !== "") {
        // Issue fastboot commands for bootloader devices
        const bootloaderVersion = await getFastbootVar(id, "version");
        const unlockedStatus = await getFastbootVar(id, "unlocked");

        deviceInfoHtml.push(`
          <div class="device-info">
            <div class="version">Bootloader: ${bootloaderVersion}</div>
            <div class="patch">Unlocked: ${unlockedStatus}</div>
          </div>
        `);
        continue;
      }

      // Add timeout to fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`/api/device/info/${id}`, {
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error("Failed to fetch device info");
      }

      const info = await response.json();
      deviceInfoHtml.push(`
        <div class="device-info">
          <div class="version">Android ${info.version}</div>
          <div class="patch">Security Patch: ${info.patch}</div>
        </div>
      `);
    } catch (error) {
      // Handle network errors gracefully
      deviceInfoHtml.push(`
        <div class="device-info error">
          <div class="version">Info unavailable</div>
          <div class="error-details">${error.name === 'AbortError' ? 'Connection timeout' : 'Connection failed'}</div>
        </div>
      `);
      console.warn(`Device info fetch failed:`, error);
    }
  }

  if (item2) {
    item2.innerHTML = `
      <div class="item-header-flex">
        <h2 class="item-header">Version / Patch Level</h2>
      </div>
      <div class="device-info-list">
        ${deviceInfoHtml.length ? deviceInfoHtml.join("") : "<p>No device info available</p>"}
      </div>
    `;
  }
}

async function getFastbootVar(deviceId, variable) {
  try {
    let command;
    if (variable === "version") {
      command = `fastboot -s ${deviceId} getvar version 2>&1 | grep "version:" | cut -d ":" -f 2- | tr -d ' '`;
    } else if (variable === "unlocked") {
      command = `fastboot -s ${deviceId} getvar unlocked 2>&1 | grep "unlocked:" | cut -d ":" -f 2- | tr -d ' '`;
    } else {
      throw new Error(`Unsupported variable: ${variable}`);
    }

    const response = await fetch("/api/fastboot/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, command })
    });

    if (!response.ok) {
      throw new Error(`Failed to get fastboot variable: ${variable}`);
    }

    const result = await response.json();
    return result.output.trim();
  } catch (error) {
    console.error(`Failed to get fastboot variable ${variable} for device ${deviceId}:`, error);
    return "Unknown";
  }
}

function showPowerMenu(deviceId, isBootloader = false, unlockedStatus = null) {
  let content = `
    <div class="modal-header">
      <h2>${deviceId}</h2>
    </div>
    <div class="modal-icons">
      <div class="icon-item" id="rebootBtn">
        <i class="fa fa-refresh"></i>
        <span>Reboot</span>
      </div>
  `;

  if (isBootloader) {
    const lockIcon = unlockedStatus === "yes" ? "fa-lock-open" : "fa-lock";
    const lockText = unlockedStatus === "yes" ? "Lock Bootloader" : "Unlock Bootloader";
    const lockCommand = unlockedStatus === "yes" ? "flashing lock" : "flashing unlock";

    content += `
      <div class="icon-item" id="lockBtn">
        <i class="fa ${lockIcon}"></i>
        <span>${lockText}</span>
      </div>
      <div class="icon-item" id="updateBtn">
        <i class="fa fa-arrow-up"></i>
        <span>Update</span>
      </div>
    `;
  } else {
    content += `
      <div class="icon-item" id="recoveryBtn">
        <i class="fa fa-wrench"></i>
        <span>Recovery</span>
      </div>
      <div class="icon-item" id="bootloaderBtn">
        <i class="fa fa-cogs"></i>
        <span>Bootloader</span>
      </div>
      <div class="icon-item" id="shutdownBtn">
        <i class="fa fa-power-off"></i>
        <span>Shutdown</span>
      </div>
    `;
  }

  content += `
    </div>
    <div class="modal-content">
      <!-- Additional content goes here -->
    </div>
  `;

  Modal.open(content);

  const rebootBtn = document.getElementById('rebootBtn');
  const lockBtn = document.getElementById('lockBtn');
  const updateBtn = document.getElementById('updateBtn');
  const recoveryBtn = document.getElementById('recoveryBtn');
  const bootloaderBtn = document.getElementById('bootloaderBtn');
  const shutdownBtn = document.getElementById('shutdownBtn');

  const handleFastbootCommand = async (command) => {
    try {
      const response = await fetch('/api/fastboot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, command })
      });

      if (!response.ok) {
        throw new Error('Failed to execute fastboot command');
      }

      const result = await response.json();
      if (!result.success) {
        console.error('Fastboot command failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to execute fastboot command:', error);
    }
  };

  const handleADBCommand = async (command) => {
    try {
      const response = await fetch('/api/adb/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, command })
      });

      if (!response.ok) {
        throw new Error('Failed to execute ADB command');
      }

      const result = await response.json();
      if (!result.success) {
        console.error('ADB command failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to execute ADB command:', error);
    }
  };

  const handleButtonClick = async (command) => {
    const deviceType = deviceId.includes(":") ? "net" : "usb";

    if (deviceType === "net" && (command === 'reboot bootloader' || command === 'reboot recovery')) {
      const warningContent = `
        <div class="modal-header">
          <h2>Warning</h2>
        </div>
        <div class="modal-content">
          <p>Executing this command on a network device may cause it to become unresponsive. Do you want to continue?</p>
          <div class="modal-actions">
            <button id="continueBtn" class="gh-solid">Continue</button>
            <button id="cancelBtn" class="gh-white">Cancel</button>
          </div>
        </div>
      `;
      Modal.open(warningContent);

      document.getElementById('continueBtn').addEventListener('click', async () => {
        await handleADBCommand(command);
        Modal.close();
        clearDeviceSelection();
        getConnectedDevices();
      });

      document.getElementById('cancelBtn').addEventListener('click', () => {
        Modal.close();
      });
    } else {
      await handleADBCommand(command);
      Modal.close();
      clearDeviceSelection();
      getConnectedDevices();
    }
  };

  if (isBootloader) {
    if (rebootBtn) {
      rebootBtn.addEventListener('click', () => handleFastbootCommand(`reboot`));
    }
    if (lockBtn) {
      lockBtn.addEventListener('click', () => handleFastbootCommand(`${lockCommand}`));
    }
    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        console.log('Update button clicked, but not yet implemented');
      });
    }
  } else {
    if (rebootBtn) {
      rebootBtn.addEventListener('click', () => handleButtonClick(`reboot`));
    }
    if (recoveryBtn) {
      recoveryBtn.addEventListener('click', () => {
        const warningContent = `
          <div class="modal-header">
            <h2 style="color: var(--status-warning)">Warning</h2>          
          </div>
          <div class="modal-content">
            <p>If the device doesn't load a recovery image hold Power + Volume Up until the device reboots, then release both buttons.</p>
            <div class="modal-actions">
              <button id="rebootRecoveryBtn" class="gh-solid">Reboot</button>
              <button id="cancelBtn" class="gh-white">Cancel</button>
            </div>
          </div>
        `;
        Modal.open(warningContent);

        document.getElementById('rebootRecoveryBtn').addEventListener('click', async () => {
          await handleButtonClick(`reboot recovery`);
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
          Modal.close();
        });
      });
    }
    if (bootloaderBtn) {
      bootloaderBtn.addEventListener('click', () => handleButtonClick(`reboot bootloader`));
    }
    if (shutdownBtn) {
      shutdownBtn.addEventListener('click', () => handleButtonClick(`reboot -p`));
    }
  }

  const closeButton = document.querySelector('.modal .close-btn');
  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }
}

// Nav Menu
function initMenuToggle() {
  const menuToggle = document.getElementById("menuToggle");
  const nav = document.querySelector("nav");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      nav.classList.toggle("open");
    });
  }
}

// Theme switcher
function initThemeToggle() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const themeToggle = document.getElementById('themeToggle');
  const themeEmoji = document.querySelector('.theme-text');

  // Set initial theme on document
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.body.classList.add(savedTheme);

  if (themeToggle && themeEmoji) {
    // Set initial states
    themeToggle.checked = savedTheme === 'dark';
    themeEmoji.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

    themeToggle.addEventListener('change', () => {
      // Remove old theme
      document.body.classList.remove('light', 'dark');

      // Set new theme
      const newTheme = themeToggle.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      document.body.classList.add(newTheme);

      // Update emoji and storage
      localStorage.setItem('theme', newTheme);
      themeEmoji.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    });
  }
}

// Logo error handling
function initLogoHandling() {
  const logo = document.querySelector(".logo");
  if (logo) {
    logo.onerror = function (e) {
      console.error("Logo failed to load:", e);
      this.src = "assets/images/fallback-logo.png";
    };
  }
}

// Add New Device
function initDeviceControls() {
  const refreshBtn = document.querySelector(".refresh-btn");
  const addDeviceBtn = document.querySelector(".add-device-btn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      getConnectedDevices();
    });
  }

  if (addDeviceBtn) {
    addDeviceBtn.addEventListener("click", () => {
      const content = `
            <h2>Add New Device</h2>
            <div class="connection-modes">
                <button id="scanModeBtn" class="mode-btn active">Network Scan</button>
                <button id="ipModeBtn" class="mode-btn">Direct IP</button>
            </div>

            <div id="scanMode" class="connection-mode">
                <div class="scan-controls">
                    <input type="text" id="subnetInput" placeholder="192.168.1.0/24" required>
                    <button id="scanButton" class="gh-solid scan-btn">Scan Network</button>
                </div>
            </div>

            <div id="ipMode" class="connection-mode" style="display: none;">
                <div class="scan-controls">
                    <input type="text" id="ipInput" placeholder="192.168.1.100" required>
                    <button id="connectButton" class="gh-solid scan-btn">Connect</button>
                </div>
            </div>

            <div id="scanStatus" class="scan-status"></div>
            <div id="deviceResults" class="device-results">
                <!-- Results will be populated here -->
            </div>
        `;

      Modal.open(content);

      // Get DOM elements after modal is opened
      const scanModeBtn = document.getElementById("scanModeBtn");
      const ipModeBtn = document.getElementById("ipModeBtn");
      const scanMode = document.getElementById("scanMode");
      const ipMode = document.getElementById("ipMode");
      const scanStatus = document.getElementById("scanStatus");
      const deviceResults = document.getElementById("deviceResults");

      // Set initial status
      scanStatus.textContent = "Please enter a subnet";

      // Mode switching handlers
      scanModeBtn.addEventListener("click", () => {
        scanModeBtn.classList.add("active");
        ipModeBtn.classList.remove("active");
        scanMode.style.display = "block";
        ipMode.style.display = "none";
        scanStatus.textContent = "Please enter a subnet";
      });

      ipModeBtn.addEventListener("click", () => {
        ipModeBtn.classList.add("active");
        scanModeBtn.classList.remove("active");
        ipMode.style.display = "block";
        scanMode.style.display = "none";
        scanStatus.textContent = "Please enter an IP address";
      });

      // Direct IP connection handler
      const connectButton = document.getElementById("connectButton");
      const ipInput = document.getElementById("ipInput");

      connectButton?.addEventListener("click", async () => {
        const ip = ipInput.value.trim();
        if (!ip) {
          scanStatus.textContent = "Please enter an IP address";
          return;
        }

        connectButton.disabled = true;
        const deviceId = `${ip}:5555`;
        const command = `adb connect ${deviceId}`;

        try {
          scanStatus.textContent = `Connecting to ${deviceId}...`;
          const response = await fetch("/api/adb/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command }),
          });

          const result = await response.json();
          if (response.ok && result.success) {
            console.log(`Connected to device at TESTING ${deviceId}`);
            getConnectedDevices();
            Modal.close();
          } else {
            scanStatus.textContent = `Failed to connect: ${result.error || "Unknown error"
              }`;
          }
        } catch (error) {
          console.error("Connection failed:", error);
          scanStatus.textContent = `Connection failed: ${error.message}`;
        } finally {
          connectButton.disabled = false;
        }
      });

      // Network scan handler
      const scanButton = document.getElementById("scanButton");
      const subnetInput = document.getElementById("subnetInput");

      scanButton?.addEventListener("click", async () => {
        const subnet = subnetInput.value.trim();
        if (!subnet) {
          scanStatus.textContent = "Please enter a subnet";
          return;
        }

        scanButton.disabled = true;
        scanStatus.textContent = "Scanning network...";
        deviceResults.innerHTML = "";

        try {
          console.log("Starting subnet scan:", subnet);
          const devices = await scanSubnetForPort(subnet, 5555);
          console.log("Scan results:", devices);

          if (devices.length === 0) {
            scanStatus.textContent = "No devices found";
          } else {
            scanStatus.textContent = `Found ${devices.length} device(s)`;
            deviceResults.innerHTML = devices
              .map(
                (ip) => `
                              <div class="scan-device-item">
                                  <div class="scan-device-info">${ip}:5555</div>
                                  <button class="connect-btn gh-white" data-ip="${ip}">Connect</button>
                              </div>
                          `
              )
              .join("");

            // Add connect button handlers
            deviceResults.querySelectorAll(".connect-btn").forEach((btn) => {
              btn.addEventListener("click", async () => {
                const ip = btn.dataset.ip;
                const deviceId = `${ip}:5555`;
                const command = `adb connect ${deviceId}`;

                btn.disabled = true;
                scanStatus.textContent = `Connecting to ${deviceId}...`;

                try {
                  const response = await fetch("/api/adb/connect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ command }),
                  });

                  const result = await response.json();
                  if (response.ok && result.success) {
                    console.log(`Connected to device at ${deviceId}`);
                    getConnectedDevices();
                    Modal.close();
                  } else {
                    scanStatus.textContent = `Failed to connect: ${result.error || "Unknown error"
                      }`;
                  }
                } catch (error) {
                  console.error("Connection failed:", error);
                  scanStatus.textContent = `Connection failed: ${error.message}`;
                } finally {
                  btn.disabled = false;
                }
              });
            });
          }
        } catch (error) {
          console.error("Scan failed:", error);
          scanStatus.textContent = `Scan failed: ${error.message}`;
        } finally {
          scanButton.disabled = false;
        }
      });
    });
  }
}

async function scanSubnetForPort(subnet, port) {
  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subnet, port }),
    });

    if (!response.ok) {
      throw new Error("Network scan failed");
    }

    const data = await response.json();
    return data.devices;
  } catch (error) {
    throw new Error(`Scan failed: ${error.message}`);
  }
}

// Device monitoring

//Memory monitoring
let cpuHistory = {
  labels: [],
  load: [],
};

let selectedDevice = null;
let memoryPollInterval = null;
let cpuPollInterval = null;
let memoryHistory = {
  labels: [],
  total: [],
  available: [],
  colors: [],
};

let gpuHistory = {
  labels: [],
  load: [],
};
let gpuPollInterval = null;

const MAX_DATA_POINTS = 30; // Keep last 5 minutes of data

// Memory monitoring
async function getMemoryInfo(deviceId) {
  try {
    const response = await fetch("/api/device/memory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId }),
    });

    return await response.json();
  } catch (error) {
    console.error("Failed to get memory info:", error);
    return null;
  }
}

function startMemoryPolling(deviceId) {
  // Clear existing interval
  if (memoryPollInterval) {
    clearInterval(memoryPollInterval);
  }

  // Initial check
  updateMemoryInfo(deviceId);

  // Start polling
  memoryPollInterval = setInterval(() => updateMemoryInfo(deviceId), 5000);
}

function kbToGB(kb) {
  return kb / (1024 * 1024);
}

async function updateMemoryInfo(deviceId) {
  const memInfo = await getMemoryInfo(deviceId);
  if (!memInfo) return;

  const availableGB = kbToGB(memInfo.available);
  const totalGB = kbToGB(memInfo.total);

  const memoryDiv = document.querySelector(".item4");
  memoryDiv.innerHTML = `
      <h2 class="item-header">Memory Usage</h2>
      <div class="memory-info">
          <div class="memory-stats">
              <div class="memory-total">Total: ${totalGB.toFixed(2)} GB</div>
              <div class="memory-available">Available: ${availableGB.toFixed(
    2
  )} GB</div>
          </div>
          <div class="memory-chart">
              <canvas id="memoryChart" height="260"></canvas>
          </div>
      </div>
  `;

  updateMemoryGraph(availableGB, totalGB);
}

function formatMemory(kb) {
  return (kb / 1024 / 1024).toFixed(2) + " GB";
}

function updateMemoryGraph(available, total) {
  const now = new Date().toLocaleTimeString();

  memoryHistory.labels.push(now);
  memoryHistory.available.push(available);
  memoryHistory.colors.push(getMemoryColors(available).line);

  if (memoryHistory.labels.length > MAX_DATA_POINTS) {
    memoryHistory.labels.shift();
    memoryHistory.available.shift();
    memoryHistory.colors.shift();
  }

  // Color selection based on memory thresholds
  function getMemoryColors(value) {
    if (value >= 3.2) {
      return {
        line: "#50A7FF", // Blue
        fill: "rgba(80, 167, 255, 0.1)", // Light blue background
      };
    } else if (value >= 1.0) {
      return {
        line: "#FFD700", // Yellow
        fill: "rgba(98, 114, 164, 0.3)", // Darker blue background
      };
    } else {
      return {
        line: "#FF5555", // Red
        fill: "rgba(98, 114, 164, 0.5)", // Very dark blue background
      };
    }
  }

  const colors = getMemoryColors(available);

  const ctx = document.getElementById("memoryChart");
  if (!ctx.chart) {
    ctx.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: memoryHistory.labels,
        datasets: [
          {
            label: "Available Memory",
            data: memoryHistory.available,
            borderColor: colors.line,
            backgroundColor: colors.fill,
            tension: 0.4,
            fill: {
              target: "start",
              below: colors.fill,
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            reverse: true,
            min: 0,
            max: Math.ceil(total),
            ticks: {
              callback: (value) => value.toFixed(2) + " GB",
            },
          },
        },
        animation: false,
      },
    });
  } else {
    const dataset = ctx.chart.data.datasets[0];
    dataset.borderColor = colors.line;
    dataset.backgroundColor = colors.fill;
    dataset.fill.below = colors.fill;

    ctx.chart.data.labels = memoryHistory.labels;
    ctx.chart.data.datasets[0].data = memoryHistory.available;
    ctx.chart.update();
  }
}

// CPU monitoring
async function getCPUInfo(deviceId) {
  try {
    const response = await fetch("/api/device/cpu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to get CPU info:", error);
    return null;
  }
}

function updateCPUGraph(cpuLoad) {
  const now = new Date().toLocaleTimeString();

  cpuHistory.labels.push(now);
  cpuHistory.load.push(cpuLoad);

  if (cpuHistory.labels.length > MAX_DATA_POINTS) {
    cpuHistory.labels.shift();
    cpuHistory.load.shift();
  }

  // Determine max scale based on current and historical loads
  const maxLoad = Math.max(...cpuHistory.load);
  let yAxisMax, stepSize;

  if (maxLoad <= 1.0) {
    yAxisMax = 1;
    stepSize = 0.2;
  } else if (maxLoad <= 10.0) {
    yAxisMax = 10;
    stepSize = 1;
  } else {
    yAxisMax = 99;
    stepSize = 10;
  }

  const ctx = document.getElementById("cpuChart");
  if (!ctx.chart) {
    ctx.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: cpuHistory.labels,
        datasets: [
          {
            label: "CPU Load",
            data: cpuHistory.load,
            // Line color
            borderColor: "#FF5555",
            tension: 0.4,
            borderWidth: 1.5,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: yAxisMax,
            ticks: {
              stepSize: stepSize,
              callback: (value) => value.toFixed(2) + "%",
            },
          },
        },
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  } else {
    ctx.chart.options.scales.y.max = yAxisMax;
    ctx.chart.options.scales.y.ticks.stepSize = stepSize;
    ctx.chart.data.labels = cpuHistory.labels;
    ctx.chart.data.datasets[0].data = cpuHistory.load;
    ctx.chart.update("none");
  }
}

function startCPUPolling(deviceId) {
  if (cpuPollInterval) {
    clearInterval(cpuPollInterval);
  }

  updateCPUInfo(deviceId);
  cpuPollInterval = setInterval(() => updateCPUInfo(deviceId), 5000);
}

async function updateCPUInfo(deviceId) {
  const cpuData = await getCPUInfo(deviceId);
  if (!cpuData) return;

  // Parse CPU load as number immediately
  const cpuLoad = parseFloat(cpuData.load);

  const cpuDiv = document.querySelector(".item3");
  cpuDiv.innerHTML = `
      <h2 class="item-header">CPU Load</h2>
      <div class="cpu-info">
          <div class="cpu-load">Current Load: ${cpuLoad.toFixed(2)}%</div>
          <div class="cpu-chart">
              <canvas id="cpuChart" height="150"></canvas>
          </div>
          <pre class="cpu-list">${cpuData.cpuInfo.join("\n")}</pre>
      </div>
  `;

  // Pass numeric value directly to graph
  updateCPUGraph(cpuLoad);
}

// GPU monitoring
function formatMemory(bytes) {
  // Convert bytes to GB with proper division
  const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
  return gb + " GB";
}

async function getGPUInfo(deviceId) {
  try {
    const response = await fetch("/api/device/gpu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId }),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to get GPU info:", error);
    return null;
  }
}

function startGPUPolling(deviceId) {
  if (gpuPollInterval) {
    clearInterval(gpuPollInterval);
  }

  updateGPUInfo(deviceId);
  gpuPollInterval = setInterval(() => updateGPUInfo(deviceId), 5000);
}

async function updateGPUInfo(deviceId) {
  const gpuData = await getGPUInfo(deviceId);
  if (!gpuData) return;

  // Convert bytes to GB using proper division
  const gpuMemoryGB = (gpuData.memory / (1024 * 1024 * 1024)).toFixed(2);
  const gpuMemoryNumber = parseFloat(gpuMemoryGB);

  const gpuDiv = document.querySelector(".item5");
  gpuDiv.innerHTML = `
      <h2 class="item-header">GPU Memory</h2>
      <div class="gpu-info">
          <div class="gpu-memory">Memory Used: ${gpuMemoryGB} GB</div>
          <div class="gpu-chart">
              <canvas id="gpuChart" height="100"></canvas>
          </div>
      </div>
  `;

  updateGPUGraph(gpuMemoryNumber);
}

function updateGPUGraph(gpuLoad) {
  const now = new Date().toLocaleTimeString();

  gpuHistory.labels.push(now);
  gpuHistory.load.push(gpuLoad);

  if (gpuHistory.labels.length > MAX_DATA_POINTS) {
    gpuHistory.labels.shift();
    gpuHistory.load.shift();
  }

  const maxLoad = Math.max(...gpuHistory.load);
  const yAxisMax = Math.ceil(maxLoad + 0.1); // Add some padding

  const ctx = document.getElementById("gpuChart");
  if (!ctx.chart) {
    ctx.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: gpuHistory.labels,
        datasets: [
          {
            label: "GPU Memory",
            data: gpuHistory.load,
            // Line color
            borderColor: "#BD93F9",
            tension: 0.4,
            borderWidth: 1.5,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: yAxisMax,
            ticks: {
              callback: (value) => value.toFixed(2) + " GB",
            },
          },
        },
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  } else {
    ctx.chart.options.scales.y.max = yAxisMax;
    ctx.chart.data.labels = gpuHistory.labels;
    ctx.chart.data.datasets[0].data = gpuHistory.load;
    ctx.chart.update("none");
  }
}

function startMonitoring(deviceId) {
  // Clear any existing intervals
  clearInterval(memoryPollInterval);
  clearInterval(cpuPollInterval);
  clearInterval(gpuPollInterval);

  // Initial updates
  updateMemoryInfo(deviceId);
  updateCPUInfo(deviceId);
  updateGPUInfo(deviceId);

  // Start polling all metrics
  memoryPollInterval = setInterval(() => updateMemoryInfo(deviceId), 5000);
  cpuPollInterval = setInterval(() => updateCPUInfo(deviceId), 5000);
  gpuPollInterval = setInterval(() => updateGPUInfo(deviceId), 5000);
}

async function executeADBCommand(deviceId, command) {
  try {
    const response = await fetch('/api/adb/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, command })
    });

    if (!response.ok) {
      throw new Error('Failed to execute ADB command');
    }

    const result = await response.json();
    if (!result.success) {
      console.error('ADB command failed:', result.error);
    }
  } catch (error) {
    console.error('Failed to execute ADB command:', error);
  }
}

function clearDeviceSelection() {
  selectedDevice = null;

  // Clear all intervals
  clearInterval(memoryPollInterval);
  clearInterval(cpuPollInterval);
  clearInterval(gpuPollInterval);

  memoryPollInterval = null;
  cpuPollInterval = null;
  gpuPollInterval = null;

  // Clear selection styling - remove inline style manipulation
  document.querySelectorAll(".device-item").forEach((item) => {
    item.classList.remove("selected");
  });

  // Only try to remove class if element exists
  const dashboardGrid = document.querySelector(".dashboard-grid");
  if (dashboardGrid) {
    dashboardGrid.classList.remove("device-selected");
  }

  // Reset displays
  const cpuDiv = document.querySelector(".item3");
  if (cpuDiv) {
    cpuDiv.innerHTML = `
            <h2 class="item-header">CPU Load</h2>
            <div class="cpu-info">
                <p class="no-selection" style="padding: 0px;">Please select a device to monitor</p>
            </div>
        `;
  }

  const memoryDiv = document.querySelector(".item4");
  if (memoryDiv) {
    memoryDiv.innerHTML = `
            <h2 class="item-header">Memory Usage</h2>
            <div class="memory-info">
                <p class="no-selection">Please select a device to monitor</p>
            </div>
        `;
  }

  const gpuDiv = document.querySelector(".item5");
  if (gpuDiv) {
    gpuDiv.innerHTML = `
            <h2 class="item-header">GPU Memory</h2>
            <div class="gpu-info">
                <p class="no-selection">Please select a device to monitor</p>
            </div>
        `;
  }
}

function stopMonitoring() {
  clearDeviceSelection();
}

// Unselect item on click outside
document.addEventListener("click", (e) => {
  // Only clear if clicking outside device-list and modal
  const isMonitoringArea =
    e.target.closest(".device-list") ||
    e.target.closest(".item3") ||
    e.target.closest(".item4") ||
    e.target.closest(".item5") ||
    e.target.closest(".item6") ||
    e.target.closest(".modal");

  if (!isMonitoringArea) {
    stopMonitoring();
  }
});

// Close modal without stopping monitoring
function closeModal() {
  Modal.close();
}

// Package specific code
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: 5000, // 5 second timeout
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}

async function updatePackageList() {
  try {
    console.log("[Packages] Fetching connected devices...");
    const response = await fetch("/api/adb/devices");
    const { devices } = await response.json();
    console.log("[Packages] Found devices:", devices);

    const packageGrid = document.querySelector(".package-grid");
    if (!packageGrid) {
      console.error("[Packages] Package grid element not found");
      return;
    }

    // Filter out offline and unauthorized devices
    const activeDevices = devices.filter((device) => {
      const [, status] = device.split("\t");
      return status !== "offline" && status !== "unauthorized";
    });

    packageGrid.innerHTML = activeDevices.length
      ? ""
      : "<p>No active devices connected</p>";

    for (const device of activeDevices) {
      const [id] = device.split("\t");
      try {
        console.log(`[Packages] Fetching packages for device: ${id}`);
        const response = await fetch(`/api/device/packages/${id}`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log(`[Packages] Retrieved ${data.packages.length} packages`);

        const container = document.createElement("div");
        container.className = "package-container";
        container.innerHTML = `
            <div class="package-header">
                <span>${id}</span>
                <button class="install-btn gh-white" data-device="${id}">+ Install Apps</button>
            </div>
            <pre class="package-list">${data.packages.join("\n")}</pre>
        `;

        container
          .querySelector(".install-btn")
          .addEventListener("click", async () => {
            const content = `
                    <h2>Install APK</h2>
                    <div class="install-container">
                        <form class="upload-form">
                            <input type="file" accept=".apk,.apex" class="file-input" required>
                        </form>
                        <div id="storeContainer" class="installed-apps">
                            <!-- Store grid will be inserted here -->
                        </div>
                        <div class="install-status" style="display: none;">
                            Installing package<span class="loading-dots"></span>
                        </div>
                        <div class="install-actions">
                          <button type="submit" class="gh-solid install-submit">Install</button>
                          <button type="button" class="clear-file gh-white">Clear</button>
                        </div>
                    </div>
                `;

            Modal.open(content);

            // Add clear button handler after modal is opened
            const clearBtn = document.querySelector(".clear-file");
            if (clearBtn) {
              clearBtn.addEventListener("click", () => {
                const fileInput = document.querySelector(".file-input");
                if (fileInput) {
                  fileInput.value = "";
                }
              });
            }
            // Check installed packages immediately
            await checkInstalledPackages(id);

            // Handle form submission
            document
              .querySelector(".install-submit")
              .addEventListener("click", async () => {
                const form = document.querySelector(".upload-form");
                const file = form.querySelector('input[type="file"]').files[0];
                if (!file) return;

                // Show loading state
                form.style.display = "none";
                const status = document.querySelector(".install-status");
                status.style.display = "block";

                const formData = new FormData();
                formData.append("apk", file);
                formData.append("deviceId", id);

                try {
                  const response = await fetch("/api/install", {
                    method: "POST",
                    body: formData,
                  });

                  if (!response.ok) throw new Error("Install failed");
                  Modal.close();
                  updatePackageList();
                } catch (error) {
                  console.error("Install failed:", error);
                  status.textContent = `Install failed: ${error.message}`;
                  status.style.color = "#ff5555";
                }
              });
          });

        packageGrid.appendChild(container);
      } catch (error) {
        console.error(
          `[Packages] Failed to get packages for device ${id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("[Packages] Failed to update package list:", error);
  }
}

async function checkInstalledPackages(deviceId) {
  try {
    const response = await fetchWithRetry(`/api/device/packages/${deviceId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const { packages } = await response.json();

    const appStores = {
      obtainium: {
        name: "Obtainium",
        activity: "dev.imranr.obtainium.MainActivity",
        bgColor: "#7E57C2", // Purple
        textColor: "#ffffff",
        icon: "/assets/images/obtainium-logo.webp",
        package: ["dev.imranr.obtainium", "dev.imranr.obtainium.fdroid"], // Array for multiple
      },
      aurora: {
        name: "Aurora Store",
        activity: "MainActivity",
        bgColor: "#2196F3", // Blue
        textColor: "#ffffff",
        icon: "/assets/images/aurora-logo.webp",
        package: ["com.aurora.store"], // Convert to array for consistency
      },
      fdroid: {
        name: "F-Droid",
        activity: "org.fdroid.fdroid.views.main.MainActivity",
        bgColor: "#e7e7e7", // Grey
        textColor: "#000",
        icon: "/assets/images/fdroid-logo.webp",
        package: ["org.fdroid.fdroid"],
      },
      gplay: {
        name: "Play Store",
        activity: "AssetBrowserActivity",
        bgColor: "#00BCD4", // Cyan
        textColor: "#ffffff",
        icon: "/assets/images/gplay-logo.webp",
        package: ["com.android.vending"],
      },
      amazon: {
        name: "Amazon",
        activity: ".ade.ADEHomeActivity",
        bgColor: "#f8f8f2", // amazon orange
        textColor: "#000",
        icon: "/assets/images/amazon-logo.webp",
        package: ["com.amazon.venezia"],
      },
    };

    const installedStores = Object.values(appStores)
      .filter((store) => store.package.some((pkg) => packages.includes(pkg)))
      .map((store) => {
        const matchedPackage = store.package.find((pkg) =>
          packages.includes(pkg)
        );
        const isFdroid = matchedPackage.includes(".fdroid");

        return {
          name: store.name,
          icon: store.icon,
          activity: store.activity,
          package: matchedPackage,
          isFdroid: isFdroid,
          bgColor: store.bgColor,
          textColor: store.textColor,
        };
      });

    const storeContainer = document.getElementById("storeContainer");
    if (storeContainer) {
      storeContainer.innerHTML = `
              <h3>Installed App Stores</h3>
              <div class="store-grid">
                  ${installedStores
          .map(
            (store) => `
                      <div class="store-item"
                           data-device="${deviceId}"
                           data-package="${store.package}"
                           data-activity="${store.activity}"
                           style="background-color: ${store.bgColor}; color: ${store.textColor}">
                          <img src="${store.icon}" alt="${store.name}" class="store-icon">
                          <span class="store-name">${store.name}</span>
                      </div>
                  `
          )
          .join("")}
              </div>
          `;

      // Add click handlers
      document.querySelectorAll(".store-item").forEach((item) => {
        item.addEventListener("click", async () => {
          const device = item.dataset.device;
          const pkg = item.dataset.package;
          const activity = item.dataset.activity;

          try {
            // Start activity
            const startCommand = `adb -s ${device} shell am start -n ${pkg}/${activity}`;

            const startResponse = await fetch("/api/adb/package/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                device,
                pkg,
                activity
              }),
            });

            if (!startResponse.ok) {
              throw new Error(`Failed to start activity: ${startResponse.status}`);
            }

            // Check for existing window with wmctrl
            const checkResponse = await fetch("/api/display", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                command: `wmctrl -l`,
                deviceId: device,
                checkWindow: true,
              }),
            });

            if (!checkResponse.ok) {
              throw new Error(`Failed to check window: ${checkResponse.status}`);
            }

            const result = await checkResponse.json();
            console.log("Window check result:", result);

            // If window exists, set demand attention flag
            if (result.existing) {
              const attentionCommand = `wmctrl -a ${device} -b add,demand_attention`;
              await fetch("/api/display", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  command: attentionCommand,
                }),
              });
            } else {
              // Launch new scrcpy window if none exists
              const scrcpyCommand = `scrcpy -s ${device} --window-title='${device}'`;
              console.log("Launching new window:", scrcpyCommand);

              const launchResponse = await fetch("/api/display", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  command: scrcpyCommand,
                }),
              });

              if (!launchResponse.ok) {
                throw new Error(`Failed to launch scrcpy: ${launchResponse.status}`);
              }
            }
            Modal.close();
          } catch (error) {
            console.error("Failed to start app:", error);
          }
        });
      });
    }
  } catch (error) {
    console.error("Failed to check installed packages:", {
      error: error.message,
      deviceId: deviceId,
      type: error.name,
    });
    throw new Error(`Failed to check installed packages: ${error.message}`);
  }
}
// Nix and Flake specific code
async function updateFlakesList() {
  try {
    console.log("[Flakes] Fetching connected devices...");
    const response = await fetch("/api/adb/devices");
    const { devices } = await response.json();

    const flakesList = document.querySelector(".flakes-list");
    if (!flakesList) return;

    flakesList.innerHTML = "";

    if (!devices || devices.length === 0) {
      flakesList.innerHTML = `
              <div class="no-devices">
                  <p>Connect a device...</p>
              </div>
          `;
      return;
    }

    const activeDevices = devices.filter((device) => {
      const [, status] = device.split("\t");
      return status !== "unauthorized" && status !== "offline";
    });

    const deviceIPs = new Map();

    // First render all devices with pending SSH status
    for (const device of activeDevices) {
      const [id] = device.split("\t");
      try {
        const response = await fetchWithRetry(`/api/device/packages/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const { packages } = await response.json();
        const hasNix = packages.includes("com.termux.nix");

        if (hasNix) {
          const deviceType = id.includes(":") ? "net" : "usb";
          let ipInfo = "";

          // Check if IP is already fetched
          if (deviceIPs.has(id)) {
            ipInfo = deviceIPs.get(id);
          } else if (deviceType === "usb") {
            const rawIP = await getDeviceIP(id);
            ipInfo = rawIP || "";
            deviceIPs.set(id, ipInfo); // Store the fetched IP
          }

          // Initial render with pending SSH status
          const deviceItem = document.createElement("div");
          deviceItem.className = "flake-device-item";
          deviceItem.id = `device-${id.replace(/[:.]/g, "-")}`;

          deviceItem.innerHTML = `
                  <div class="device-info">
                      ${ipInfo ? `<span class="device-ip">${ipInfo}</span>` : ""}
                      <span class="device-id">${deviceType === "net" ? id.split(":")[0] : id}</span>
                      <div class="badge device-type ${deviceType}">${deviceType}</div>
                      <div class="badge ssh-status pending">SSH</div>
                      ${hasNix ? '<div class="badge nix-badge">NIX</div>' : ""}
                  </div>
              `;

          flakesList.appendChild(deviceItem);

          // Add click handler with existing modal functionality
          deviceItem.addEventListener("click", () => {
            const content = `
              <div class="modal-header">
                <h2>${deviceType === "net" ? id.split(":")[0] : id}</h2>
                <button class="terminal-btn gh-white" ${hasNix ? "" : "disabled"}>
                  <i class="fa fa-terminal"></i>Start SSH
                </button>
              </div>
              <div class="device-details">
                ${ipInfo ? `<p>IP Address: ${ipInfo}</p>` : ""}
                <p>Connection Type: ${deviceType.toUpperCase()}</p>
                <p class="ssh-status-text">SSH Status: Checking...</p>
                <p>Packages:</p>
                <ul>
                  ${hasNix ? "<li>Nix Package</li>" : ""}
                </ul>
                <div class="ssh-username-input">
                  <label for="ssh-username">SSH Username:</label>
                  <input type="text" id="ssh-username" value="nix-on-droid">
                </div>
              </div>
            `;
            Modal.open(content);

            // Check SSH status immediately after opening modal
            const ip = deviceType === "net" ? id.split(":")[0] : ipInfo;
            const sshStatusText = document.querySelector(".ssh-status-text");

            checkSSHConnection(ip)
              .then((isSSHOpen) => {
                sshStatusText.textContent = `SSH Status: ${isSSHOpen ? "Connected" : "Failed"}`;
                sshStatusText.style.color = isSSHOpen ? "var(--green)" : "var(--red)";
              })
              .catch((error) => {
                console.error(`[SSH] Check failed:`, error);
                sshStatusText.textContent = "SSH Status: Failed";
                sshStatusText.style.color = "var(--red)";
              });

            // Add terminal button handler
            const terminalBtn = document.querySelector(".terminal-btn");
            if (terminalBtn) {
              terminalBtn.addEventListener("click", async () => {
                const username = document.getElementById("ssh-username").value;
                if (hasNix || hasTermux) {
                  const pkg = hasNix ? "com.termux.nix" : "com.termux";
                  const activity = "com.termux.app.TermuxActivity";

                  try {
                    // Start the terminal app
                    await fetch("/api/adb/package/start", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        device: id,
                        pkg,
                        activity,
                        isFdroid: false,
                      }),
                    });

                    // Wait 1 second
                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    const sshBadge = deviceItem.querySelector(".ssh-status");
                    const sshStatus = document.querySelector(".device-details p:nth-child(3)");

                    for (let i = 5; i > 0; i--) {
                      sshBadge.textContent = `SSH (Retrying in ${i}...)`;
                      sshStatus.textContent = `SSH Status: Retrying in ${i}...`;
                      sshBadge.classList.add("searching");
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                    }

                    // if (!isSSHOpen) {
                    //   // Start countdown retry
                    //   const sshBadge = deviceItem.querySelector(".ssh-status");
                    //   const sshStatus = document.querySelector(".device-details p:nth-child(3)");

                    //   for (let i = 5; i > 0; i--) {
                    //     sshBadge.textContent = `SSH (Retrying in ${i}...)`;
                    //     sshStatus.textContent = `SSH Status: Retrying in ${i}...`;
                    //     sshBadge.classList.add("searching");
                    //     await new Promise((resolve) => setTimeout(resolve, 1000));
                    //   }

                    //   // // Final SSH check
                    //   // isSSHOpen = await checkSSHConnection(ip, username);
                    //   // sshBadge.classList.remove("searching");

                    //   // if (!isSSHOpen) {
                    //   //   sshBadge.classList.add("failed");
                    //   //   sshBadge.textContent = "SSH";
                    //   //   sshStatus.textContent = "SSH Status: Failed";
                    //   //   console.error("[SSH] Connection failed after retry");
                    //   // } else {
                    //   //   sshBadge.classList.add("success");
                    //   //   sshBadge.textContent = "SSH";
                    //   //   sshStatus.textContent = "SSH Status: Connected";
                    //   // }
                    // }

                    // Close modal and refresh device list

                    setTimeout(() => {
                      Modal.close();
                      updateFlakesList(); // Refresh the entire list
                    }, 2000);
                  } catch (error) {
                    console.error("Failed to start terminal:", error);
                  }
                }
              });
            }
          });

          // Check SSH status after rendering
          if (deviceType === "net" || ipInfo) {
            const ipToCheck = deviceType === "net" ? id.split(":")[0] : ipInfo;
            checkSSHStatusAsync(ipToCheck, deviceItem);
          }
        }
      } catch (error) {
        console.error(`[Flakes] Failed to process device ${id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Flakes] Failed to update flakes list:", error);
  }
}

async function checkNixPackage(deviceId) {
  try {
    const response = await fetchWithRetry(`/api/device/packages/${deviceId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const { packages } = await response.json();
    const nixPackage = packages.find((pkg) => pkg === "com.termux.nix");
    const termuxPackage = packages.find((pkg) => pkg === "com.termux");

    if (nixPackage || termuxPackage) {
      try {
        let nixPlayStore = false;
        let termuxPlayStore = false;

        // Always check both packages if they exist
        if (nixPackage) {
          console.log(`[Flakes] Checking nix package source for ${deviceId}`);
          const nixResponse = await fetch("/api/adb/package/source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId,
              command: `adb -s ${deviceId} shell dumpsys package ${nixPackage} | grep com.android.vending`,
            }),
          });
          if (nixResponse.ok) {
            const { output } = await nixResponse.json();
            nixPlayStore = output && output.includes("com.android.vending");
          }
        }

        if (termuxPackage) {
          console.log(
            `[Flakes] Checking termux package source for ${deviceId}`
          );
          const termuxResponse = await fetch("/api/adb/package/source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deviceId,
              command: `adb -s ${deviceId} shell dumpsys package ${termuxPackage} | grep com.android.vending`,
            }),
          });
          if (termuxResponse.ok) {
            const { output } = await termuxResponse.json();
            termuxPlayStore = output && output.includes("com.android.vending");
          }
        }

        const isPlayStore = nixPlayStore || termuxPlayStore;
        if (isPlayStore) {
          console.log(
            `[Flakes] Package(s) installed through Google Play: nix=${nixPlayStore}, termux=${termuxPlayStore}`
          );
        }

        return {
          installed: true,
          packageName: nixPackage || termuxPackage,
          source: isPlayStore ? "play_store" : "other",
        };
      } catch (error) {
        console.error("[Flakes] Failed to check package source:", error);
        return {
          installed: true,
          packageName: nixPackage || termuxPackage,
          source: "unknown",
        };
      }
    }

    return {
      installed: false,
      packageName: null,
      source: null,
    };
  } catch (error) {
    console.error("Failed to check Nix package:", error);
    throw error;
  }
}

async function getDeviceIP(deviceId) {
  try {
    // Check eth0 first
    const eth0Command = `adb -s ${deviceId} shell ip addr show eth0 | grep 'inet ' | cut -d ' ' -f 6 | cut -d / -f 1`;
    const eth0Response = await fetch("/api/ssh/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, command: eth0Command }),
    });

    if (eth0Response.ok) {
      const { output: eth0Output } = await eth0Response.json();
      if (eth0Output && eth0Output.trim()) {
        return eth0Output.trim();
      }
    }

    // Only check wlan0 if eth0 not found
    const wlan0Command = `adb -s ${deviceId} shell ip addr show wlan0 | grep 'inet ' | cut -d ' ' -f 6 | cut -d / -f 1`;
    const wlan0Response = await fetch("/api/ssh/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, command: wlan0Command }),
    });

    if (wlan0Response.ok) {
      const { output: wlan0Output } = await wlan0Response.json();
      if (wlan0Output && wlan0Output.trim()) {
        return wlan0Output.trim();
      }
    }

    return "";
  } catch (error) {
    console.error(`Failed to get IP for device ${deviceId}:`, error);
    return "";
  }
}

async function checkSSHStatusAsync(ip, deviceItem) {
  const sshBadge = deviceItem.querySelector(".ssh-status");
  try {
    sshBadge.classList.add("searching");
    const isSSHOpen = await checkSSHConnection(ip);
    sshBadge.classList.remove("searching", "pending");
    sshBadge.classList.add(isSSHOpen ? "success" : "failed");
  } catch (error) {
    console.error(`[Flakes] SSH check error for ${ip}:`, error);
    sshBadge.classList.remove("searching", "pending");
    sshBadge.classList.add("failed");
  }
}

async function checkSSHConnection(ip) {
  try {
    console.log(`[SSH] Attempting to check SSH connection for ${ip}:8022`);

    // Define possible users
    const sshUsers = ["nix-on-droid"];

    // Try each user
    for (const user of sshUsers) {
      try {
        const response = await fetch("/api/ssh/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip,
            port: 8022,
            user,
          }),
        });

        const data = await response.json();
        const isConnected = response.ok && data.success === true;

        if (isConnected) {
          console.log(
            `[SSH] Connection successful with user ${user} for ${ip}:8022`
          );
          return true;
        }
      } catch (error) {
        console.log(
          `[SSH] Failed to connect with user ${user}: ${error.message}`
        );
        continue;
      }
    }

    console.log(`[SSH] No successful connections for ${ip}:8022`);
    return false;
  } catch (error) {
    console.error(`[SSH] Connection check failed for ${ip}:`, error);
    return false;
  }
}

// function DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Menu and theme toggle initializations
    initThemeToggle();
    initMenuToggle();

    if (window.location.pathname.includes('settings.html')) {
      const settingsForm = document.getElementById('settings-form');
      if (settingsForm) {
        loadSettings();
        settingsForm.addEventListener('submit', saveSettings);
      }
    }

    // Initialize modal
    Modal.init();

    if (!adbStatusChecked) {
      await checkADBStatus();
    }

    // Logo handling
    const logo = document.querySelector(".logo");
    if (logo) {
      initLogoHandling();
    }

    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";
    switch (currentPage) {
      case "index.html":
        initDeviceControls();
        clearDeviceSelection();
        getConnectedDevices();
        break;
      case "package.html":
        updatePackageList();
        break;
      case "flakes.html":
        updateFlakesList();
        break;
    }

    // Theme text
    const themeText = document.querySelector(".theme-text");
    if (themeText) {
      themeText.textContent =
        localStorage.getItem("theme") === "dark" ? "🌙" : "☀️";
    }
  } catch (error) {
    console.error("[Initialization] Failed:", error);
  }
  // Fade in body
  requestAnimationFrame(() => {
    document.body.classList.add("loaded");
  });

  if (window.location.pathname.includes('settings.html')) {
    const restoreBtn = document.querySelector('.button-group .gh-white');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', restoreDefaults);
    }
  }
});

document.querySelectorAll(".connect-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const ip = btn.dataset.ip;
    const deviceId = `${ip}:5555`;
    const device = new Device(deviceId);

    try {
      const response = await fetch("/api/adb/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: device.connect() }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to device");
      }

      console.log(`[Device] Connected to ${deviceId}`);
      getConnectedDevices();
      Modal.close();
    } catch (error) {
      console.error(`[Device] Connection failed:`, error);
    }
  });
});

// ----------------------------------------------
// Log every request to the console for debugging

// Create log capture and display functionality
const logs = [];
const maxLogs = 1000; // Prevent memory issues

// Override console methods to capture all logs
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function formatLog(type, ...args) {
  const date = new Date().toISOString();
  return `[${date}] [${type}] ${args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
    .join(" ")}`;
}

function updateLogDisplay() {
  const logContainer = document.querySelector(".item6");
  if (logContainer) {
    const logContent = logs.join("\n");
    logContainer.innerHTML = `
              <h2 class="item-header">System Logs</h2>
              <pre class="log-content">${logContent}</pre>
              <div class="log-warning">
                Device too narrow<br>
                Minimum width: 800px<br>
                ⤵ Rotate device
              </div>
          `;
    // Auto-scroll to bottom
    const pre = logContainer.querySelector("pre");
    pre.scrollTop = pre.scrollHeight;
  }
}

// Override console methods
console.log = (...args) => {
  const formattedLog = formatLog("LOG", ...args);
  logs.push(formattedLog);
  if (logs.length > maxLogs) logs.shift();
  updateLogDisplay();
  originalConsole.log.apply(console, args);
};

console.info = (...args) => {
  const formattedLog = formatLog("INFO", ...args);
  logs.push(formattedLog);
  if (logs.length > maxLogs) logs.shift();
  updateLogDisplay();
  originalConsole.info.apply(console, args);
};

console.warn = (...args) => {
  const formattedLog = formatLog("WARN", ...args);
  logs.push(formattedLog);
  if (logs.length > maxLogs) logs.shift();
  updateLogDisplay();
  originalConsole.warn.apply(console, args);
};

console.error = (...args) => {
  const formattedLog = formatLog("ERROR", ...args);
  logs.push(formattedLog);
  if (logs.length > maxLogs) logs.shift();
  updateLogDisplay();
  originalConsole.error.apply(console, args);
};
