import { useEffect } from 'react';

import { queryClient } from '../lib/query-client';
import { getRealtimeSocket } from '../lib/socket-client';
import { useAuthStore } from '../stores/auth-store';

import type { TaskDto, TicketDto } from '@nexops/shared';
import type { PropsWithChildren } from 'react';

export function RealtimeProvider({ children }: PropsWithChildren): JSX.Element {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const handleNotification = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    const handleTask = (task: TaskDto) => {
      queryClient.setQueryData<TaskDto[]>(['tasks', task.projectId], (current) => {
        if (!current) return current;
        const exists = current.some((item) => item.id === task.id);
        return exists
          ? current.map((item) => (item.id === task.id ? task : item))
          : [...current, task];
      });
    };
    const handleTicket = (ticket: TicketDto) => {
      queryClient.setQueryData(['ticket', ticket.id], ticket);
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    };

    socket.on('notification:new', handleNotification);
    socket.on('task:updated', handleTask);
    socket.on('ticket:updated', handleTicket);
    if (accessToken) {
      if (socket.connected) socket.disconnect();
      socket.connect();
    } else if (socket.connected) {
      socket.disconnect();
    }
    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('task:updated', handleTask);
      socket.off('ticket:updated', handleTicket);
    };
  }, [accessToken]);

  return <>{children}</>;
}
