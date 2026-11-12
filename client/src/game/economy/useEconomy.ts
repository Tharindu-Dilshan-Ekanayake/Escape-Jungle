import { useEffect, useState } from "react";
import { HUD } from "../../config/hud";
import { economy } from "./economy";

/**
 * Re-render a HUD component when the economy changes. Polls `economy.version`
 * a few times per second (never per frame); returns it so callers can depend on it.
 */
export function useEconomyVersion(): number {
  const [v, setV] = useState(economy.version);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (economy.version !== v) setV(economy.version);
    }, HUD.pollMs);
    return () => window.clearInterval(id);
  }, [v]);
  return v;
}
