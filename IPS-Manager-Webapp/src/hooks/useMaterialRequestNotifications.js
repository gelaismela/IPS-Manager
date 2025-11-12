import { useEffect, useMemo, useRef, useState } from "react";
import { getAllMaterialRequests } from "../api/api";
import { useDeliveryNotifications } from "./useDeliveryNotifications";

/**
 * Polls material requests and produces a notifications list.
 * We mark items as unread if their (id,status) pair hasn't been seen before.
 * Stores seen keys in localStorage under `MR_SEEN_KEYS`.
 * Also triggers browser push notifications for status changes.
 */
export function useMaterialRequestNotifications({ pollMs = 30000 } = {}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const seenRef = useRef(new Set());

  // Enable browser push notifications for material requests
  useDeliveryNotifications([], requests, true);

  // Load seen set from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("MR_SEEN_KEYS");
      if (raw) seenRef.current = new Set(JSON.parse(raw));
    } catch {}
  }, []);

  // Save seen set when it changes (on demand)
  const persistSeen = () => {
    try {
      localStorage.setItem(
        "MR_SEEN_KEYS",
        JSON.stringify(Array.from(seenRef.current))
      );
    } catch {}
  };

  useEffect(() => {
    let timer;
    let stop = false;

    const tick = async () => {
      try {
        const data = await getAllMaterialRequests();
        if (!stop) {
          setRequests(Array.isArray(data) ? data : []);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!stop) {
          setError("Failed to load requests");
          setLoading(false);
        }
      }
    };

    tick();
    timer = setInterval(tick, pollMs);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [pollMs]);

  // Build notifications model
  const notifications = useMemo(() => {
    return (requests || []).map((r) => {
      // Extract fields from actual backend response
      const status = r.status || "PENDING";
      const projectName = r.project?.name || "Unknown Project";
      const projectCode = r.project?.projectCode || "";
      const materialName = r.material?.name || "Material";
      const requestedQty = r.requestedQuantity || 0;
      const assignedQty = r.assignedQuantity || 0;
      const driverName = r.driver?.name || null;

      // Build notification title based on status
      let title = "";
      if (status === "PENDING") {
        title = `New request: ${requestedQty} ${materialName}`;
      } else if (status === "ASSIGNED" || status === "PARTIALLY_ASSIGNED") {
        const driver = driverName || "driver";
        title = `${driver} assigned ${assignedQty} ${materialName}`;
      } else if (status === "DELIVERED") {
        title = `${materialName} delivered`;
      } else {
        title = `Request update: ${materialName}`;
      }

      const key = `${r.id}::${status}`;
      const unread = !seenRef.current.has(key);

      return {
        key,
        unread,
        status,
        projectName,
        projectCode,
        materialName,
        requestedQty,
        assignedQty,
        driverName,
        title,
        when: r.deliveryDate || r.requestDate,
        requestId: r.id,
      };
    });
  }, [requests]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const markAllRead = () => {
    notifications.forEach((n) => seenRef.current.add(n.key));
    persistSeen();
  };

  // When dropdown opens, mark current snapshot as read
  useEffect(() => {
    if (open) {
      markAllRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { notifications, unreadCount, loading, error, open, setOpen };
}
