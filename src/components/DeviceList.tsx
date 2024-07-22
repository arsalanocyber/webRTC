// src/components/DeviceList.tsx
import React, { useEffect, useState } from "react";

interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface DeviceListProps {
  type: string;
  setDeviceId: (deviceId: string) => void;
  onSelect: (deviceId: string) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({
  type,
  onSelect,
  setDeviceId,
}) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const allDevices = deviceInfos
          .filter((device) => device.kind === type)
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || "Unnamed device",
          }));
        setDevices(allDevices);
        setDeviceId(allDevices[0]?.deviceId); // Select the first device by default
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

export default DeviceList;
