import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const ConfigContext = createContext({ support_whatsapp: "", support_email: "", report_interval_days: 20, platform_till_number: "" });

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({ support_whatsapp: "", support_email: "", report_interval_days: 20, platform_till_number: "" });

  useEffect(() => {
    api.get("/config").then(({ data }) => setConfig(data)).catch(() => {});
  }, []);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
