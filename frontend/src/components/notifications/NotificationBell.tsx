import { useEffect, useRef, useState } from 'react';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/activity';
import { getAuthErrorMessage } from '../../utils/errors';
import './NotificationBell.css';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const notificationsQuery = useNotifications();
  const unreadCountQuery = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadCountQuery.data ?? 0;
  const notifications = notificationsQuery.data?.data ?? [];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="notification-bell">
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell__trigger"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="notification-bell__icon" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 ? (
          <span className="notification-bell__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          className="notification-bell__panel"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="notification-bell__panel-header">
            <h2 className="notification-bell__panel-title">Notifications</h2>
            {notifications.some((notification) => !notification.isRead) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllRead.mutateAsync()}
                disabled={markAllRead.isPending}
              >
                Mark all read
              </Button>
            ) : null}
          </div>

          {notificationsQuery.isLoading || unreadCountQuery.isLoading ? (
            <LoadingState label="Loading notifications…" />
          ) : null}

          {notificationsQuery.isError ? (
            <ErrorState
              title="Unable to load notifications"
              message={getAuthErrorMessage(notificationsQuery.error)}
              actionLabel="Try again"
              onAction={() => void notificationsQuery.refetch()}
            />
          ) : null}

          {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          notifications.length === 0 ? (
            <EmptyState
              title="No notifications"
              description="You are all caught up."
            />
          ) : null}

          {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length > 0 ? (
            <ul className="notification-bell__list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`notification-bell__item${
                    notification.isRead ? '' : ' notification-bell__item--unread'
                  }`}
                >
                  <div className="notification-bell__item-content">
                    <p className="notification-bell__item-title">{notification.title}</p>
                    <p className="notification-bell__item-message">{notification.message}</p>
                    <time
                      className="notification-bell__item-time"
                      dateTime={notification.createdAt}
                    >
                      {formatRelativeTime(notification.createdAt)}
                    </time>
                  </div>
                  {!notification.isRead ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void markRead.mutateAsync(notification.id)}
                      disabled={markRead.isPending}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
