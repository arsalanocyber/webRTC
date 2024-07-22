// src/components/DeviceListWithChange.tsx
import React, { useEffect, useState } from "react";

interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface DeviceListWithChangeProps {
  type: string;
  onSelect: (deviceId: string) => void;
}

const DeviceListWithChange: React.FC<DeviceListWithChangeProps> = ({
  type,
  onSelect,
}) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        setDevices(
          deviceInfos
            .filter((device) => device.kind === type)
            .map((device) => ({
              deviceId: device.deviceId,
              label: device.label || "Unnamed device",
            }))
        );
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };

    fetchDevices();
    const handleDeviceChange = () => fetchDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange
      );
    };
  }, [type]);

  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label}
        </option>
      ))}
    </select>
  );
};

export default DeviceListWithChange;
