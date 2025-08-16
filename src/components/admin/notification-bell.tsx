'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getUserNotifications, markNotificationAsRead, markAllUserNotificationsAsRead } from '@/lib/actions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Memoizar notificações não lidas
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead), 
    [notifications]
  );

  // Memoizar contagem de não lidas
  const memoizedUnreadCount = useMemo(() => unreadCount, [unreadCount]);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const userNotifications = await getUserNotifications(userId, 20);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar notificações',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllUserNotificationsAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas',
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao marcar notificações como lidas',
      });
    }
  }, [userId, toast]);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'document_approved':
        return '🎉';
      case 'document_rejected':
        return '❌';
      case 'user_activated':
        return '🚀';
      case 'user_blocked':
        return '⚠️';
      case 'user_suspended':
        return '⚠️';
      case 'plan_assigned':
        return '💎';
      case 'freight_status_changed':
        return '📦';
      default:
        return '📢';
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return 'Data inválida';
    }
  }, []);

  // Memoizar conteúdo das notificações
  const notificationContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }
    
    if (notifications.length === 0) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Nenhuma notificação
        </div>
      );
    }
    
    return notifications.map((notification) => (
      <DropdownMenuItem
        key={notification.id}
        className={`flex flex-col items-start p-3 cursor-pointer ${
          !notification.isRead ? 'bg-muted/50' : ''
        }`}
        onClick={() => handleMarkAsRead(notification.id)}
      >
        <div className="flex items-start gap-2 w-full">
          <span className="text-lg">
            {getNotificationIcon(notification.type)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between w-full">
              <p className={`text-sm font-medium ${
                !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {notification.title}
              </p>
              {!notification.isRead && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(notification.createdAt)}
            </p>
          </div>
        </div>
      </DropdownMenuItem>
    ));
  }, [notifications, isLoading, handleMarkAsRead, getNotificationIcon, formatDate]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {memoizedUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {memoizedUnreadCount > 99 ? '99+' : memoizedUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {memoizedUnreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-6 px-2 text-xs"
            >
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {notificationContent}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={loadNotifications}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
