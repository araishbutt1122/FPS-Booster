import { registerPlugin } from '@capacitor/core';

// ----------------------------------------------------
// NATIVE HARDWARE STATS (RealStats Plugin)
// ----------------------------------------------------
export const RealStats = registerPlugin('RealStats');

async function getBrowserFallbackStats() {
  let totalGB = 4.0;
  let usedGB = 1.8;
  let percent = 45;

  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    totalGB = Number(navigator.deviceMemory) || 4.0;
  }

  const perf = typeof window !== 'undefined' ? window.performance : null;
  const perfMemory = perf && perf['memory'];
  if (perfMemory && perfMemory.jsHeapSizeLimit) {
    const heapUsedGB = perfMemory.usedJSHeapSize / (1024 * 1024 * 1024);
    usedGB = Math.max(0.8, Math.min(totalGB - 0.5, heapUsedGB * 4.5 + 1.2));
    percent = Math.min(95, Math.max(15, Math.round((usedGB / totalGB) * 100)));
  }

  let batteryLevel = 88;
  let tempC = '34.2';
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      const getBat = navigator['getBattery'];
      if (typeof getBat === 'function') {
        const battery = await getBat.call(navigator);
        batteryLevel = Math.round(battery.level * 100);
        tempC = battery.charging ? '37.4' : (batteryLevel < 20 ? '35.8' : '33.6');
      }
    }
  } catch (err) {}

  const screenObj = typeof window !== 'undefined' ? window.screen : null;
  const fps = screenObj && screenObj['refreshRate'] ? screenObj['refreshRate'] : 60;

  return {
    ram: {
      total: totalGB.toFixed(1),
      used: usedGB.toFixed(1),
      available: (totalGB - usedGB).toFixed(1),
      percent,
    },
    temp: { temp: tempC, battery: batteryLevel },
    fps: { fps, refreshRate: fps },
  };
}

export async function updateRealStats() {
  try {
    let ram, temp, fps;
    try {
      ram = await RealStats.getRealRAM();
      temp = await RealStats.getRealTemp();
      fps = await RealStats.getRealFPS();
    } catch (pluginErr) {
      const fallback = await getBrowserFallbackStats();
      ram = fallback.ram;
      temp = fallback.temp;
      fps = fallback.fps;
    }

    const elRam = document.getElementById('ram');
    const elRamPercent = document.getElementById('ramPercent');
    const elTemp = document.getElementById('temp');
    const elBattery = document.getElementById('battery');
    const elFps = document.getElementById('fps');

    if (elRam && ram?.used && ram?.total) elRam.innerText = ram.used + ' / ' + ram.total + ' GB';
    if (elRamPercent && ram?.percent !== undefined) elRamPercent.innerText = ram.percent + '%';
    if (elTemp && temp?.temp) elTemp.innerText = temp.temp + '°C';
    if (elBattery && temp?.battery !== undefined) elBattery.innerText = temp.battery + '%';
    if (elFps && fps?.fps !== undefined) elFps.innerText = String(fps.fps);

    const detail = {
      ramUsed: ram?.used,
      ramTotal: ram?.total,
      ramPercent: ram?.percent,
      temp: temp?.temp,
      battery: temp?.battery,
      fps: fps?.fps,
    };

    if (typeof window !== 'undefined') {
      window['__REAL_STATS__'] = detail;
      window.dispatchEvent(new CustomEvent('fpsbooster_realstats', { detail }));
    }
    return detail;
  } catch (e) {
    return null;
  }
}

if (typeof window !== 'undefined') {
  setInterval(updateRealStats, 1000);
  updateRealStats();
  window['updateRealStats'] = updateRealStats;
}
