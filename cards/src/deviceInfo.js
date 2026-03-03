export function collectDeviceInfo() {
  const ua = navigator.userAgent;
  return {
    userAgent: ua,
    browser: parseBrowser(ua),
    os: parseOS(ua),
    screenSize: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    touchDevice: navigator.maxTouchPoints > 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

function parseBrowser(ua) {
  if (ua.includes("Firefox/")) return "Firefox " + ua.split("Firefox/")[1].split(" ")[0];
  if (ua.includes("Edg/")) return "Edge " + ua.split("Edg/")[1].split(" ")[0];
  if (ua.includes("OPR/")) return "Opera " + ua.split("OPR/")[1].split(" ")[0];
  if (ua.includes("Chrome/")) return "Chrome " + ua.split("Chrome/")[1].split(" ")[0];
  if (ua.includes("Safari/") && ua.includes("Version/")) return "Safari " + ua.split("Version/")[1].split(" ")[0];
  return ua;
}

function parseOS(ua) {
  if (ua.includes("iPhone OS")) return "iOS " + ua.split("iPhone OS ")[1].split(" ")[0].replace(/_/g, ".");
  if (ua.includes("iPad")) return "iPadOS " + (ua.split("OS ")[1] || "").split(" ")[0].replace(/_/g, ".");
  if (ua.includes("Android")) return "Android " + ua.split("Android ")[1].split(";")[0].split(")")[0];
  if (ua.includes("Windows NT 10")) return "Windows 10/11";
  if (ua.includes("Mac OS X")) return "macOS " + ua.split("Mac OS X ")[1].split(")")[0].replace(/_/g, ".");
  if (ua.includes("Linux")) return "Linux";
  return "Unknown";
}
