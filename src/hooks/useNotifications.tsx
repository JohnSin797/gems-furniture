import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type NotificationType = "success" | "warning" | "error" | "info";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

// ✅ Keep notifications in a shared store (so all components see updates)
let sharedNotifications: Notification[] = [];
let listeners: ((notifs: Notification[]) => void)[] = [];

const notifyAll = (updated: Notification[]) => {
  sharedNotifications = updated;
  listeners.forEach((cb) => cb(sharedNotifications));
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(sharedNotifications);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Subscribe to shared store updates
  useEffect(() => {
    const cb = (newList: Notification[]) => setNotifications([...newList]);
    listeners.push(cb);
    return () => {
      listeners = listeners.filter((l) => l !== cb);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      notifyAll((data as Notification[]) ?? []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      toast({
        title: "Error",
        description: "Failed to load notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const markAsRead = useCallback(async (id: string) => {
    notifyAll(sharedNotifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    } catch (err) {
      console.error("Error marking read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    notifyAll(sharedNotifications.map((n) => ({ ...n, read: true })));
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user?.id)
        .eq("read", false);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    notifyAll(sharedNotifications.filter((n) => n.id !== id));
    try {
      await supabase.from("notifications").delete().eq("id", id);
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  }, []);

  const createNotification = useCallback(
    async (userId: string, title: string, message: string, type: NotificationType = "info") => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .insert({ user_id: userId, title, message, type })
          .select()
          .single();
        if (error) throw error;

        const newNotif = data as Notification;
        notifyAll([newNotif, ...sharedNotifications]);
      } catch (err) {
        console.error("Error creating notification:", err);
        toast({
          title: "Error",
          description: "Failed to create notification.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    if (user?.id) fetchNotifications();
    else notifyAll([]);
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
  };
};
