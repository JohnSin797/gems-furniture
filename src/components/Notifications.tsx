 import { useEffect, memo } from "react";
 import { Bell, Check, X } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Separator } from "@/components/ui/separator";
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
 import { useNotifications } from "@/hooks/useNotifications";
 import { format } from "date-fns";

type NotificationType = "success" | "warning" | "error" | "info";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount, deleteNotification } = useNotifications();

  // Fetch notifications when panel opens
  useEffect(() => {
    // The hook will handle fetching when user changes, but we can trigger a refresh here if needed
  }, [isOpen]);

  // Map notification type to badge color
  const getTypeColor = (type: NotificationType): string => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };



  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-sm flex flex-col">
         <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <SheetTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </SheetTitle>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
                aria-label="Mark all notifications as read"
              >
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
               <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/30 animate-pulse rounded" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
               <div className="p-3 text-center text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-0">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                       className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                         !notification.read ? "bg-blue-50/50" : ""
                       }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                       <div className="flex items-start space-x-2">
                         <div className="flex items-center space-x-1">
                           {!notification.read && (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 markAsRead(notification.id);
                               }}
                               className="p-1 h-auto"
                               aria-label="Mark notification as read"
                             >
                               <Check className="h-3 w-3" />
                             </Button>
                           )}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               deleteNotification(notification.id);
                             }}
                             className="p-1 h-auto text-muted-foreground hover:text-destructive"
                             aria-label="Delete notification"
                           >
                             <X className="h-3 w-3" />
                           </Button>
                         </div>
                         <div className="flex-1 space-y-1">
                           <div className="flex items-center space-x-2">
                             <h4
                               className={`text-sm font-medium truncate ${
                                 !notification.read ? "font-semibold" : ""
                               }`}
                               title={notification.title}
                             >
                               {notification.title}
                             </h4>
                             <Badge
                               className={`text-xs ${getTypeColor(notification.type)}`}
                               variant="outline"
                             >
                               {notification.type}
                             </Badge>
                           </div>
                           <p
                             className="text-sm text-muted-foreground truncate"
                             title={notification.message}
                           >
                             {notification.message}
                           </p>
                           <p className="text-xs text-muted-foreground">
                             {format(new Date(notification.created_at), "MMM dd, yyyy HH:mm")}
                           </p>
                         </div>
                        </div>
                    </div>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default memo(Notifications);
