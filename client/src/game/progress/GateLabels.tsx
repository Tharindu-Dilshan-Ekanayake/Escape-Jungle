import { useEffect, useState } from "react";
import { GATES, ZONES1 } from "../../config/zones1";
import type { GrassField } from "../../grass/GrassField";
import { PropLabels, type WorldLabel } from "../../world/PropLabels";
import { progress } from "./progress";

const REFRESH_MS = 300;

function labelsFor(fields: GrassField[]): WorldLabel[] {
  return ZONES1.map((z, i) => {
    const pct = Math.floor(fields[i].clearRatio * 100);
    const open = progress.open[i];
    return {
      key: `gate-${z.id}`,
      text: open ? "OPEN" : `${pct}% / ${Math.round(GATES.clearToOpen * 100)}%`,
      sub: open ? `To ${z.base.name}` : `Clear ${z.name} to open`,
      pos: [z.gate.x, 4.2, z.gate.z],
    };
  });
}

/** Floating signs on every gate with the live clear % (refreshed a few times per second). */
export function GateLabels({ fields }: { fields: GrassField[] }) {
  const [labels, setLabels] = useState(() => labelsFor(fields));
  useEffect(() => {
    let last = "";
    const id = window.setInterval(() => {
      const next = labelsFor(fields);
      const key = next.map((l) => l.text).join("|");
      if (key !== last) {
        last = key;
        setLabels(next);
      }
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [fields]);
  return <PropLabels labels={labels} font="lobby" />;
}
