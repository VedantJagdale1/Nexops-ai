import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, MessageSquareText, Send, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorPanel } from '../components/error-panel';
import { listProjectMessages } from '../features/operations/operations-api';
import { getApiErrorMessage } from '../lib/api-client';
import { getRealtimeSocket } from '../lib/socket-client';
import { useAuthStore } from '../stores/auth-store';

import type {
  ChatParticipantDto,
  PaginationMeta,
  ProjectMessageDto,
  ProjectPresenceDto,
  ProjectTypingDto,
} from '@nexops/shared';

interface ChatPageData {
  items: ProjectMessageDto[];
  meta: PaginationMeta;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function ProjectChatPage(): JSX.Element {
  const { projectId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<ChatParticipantDto[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, ChatParticipantDto>>(new Map());
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const endOfMessages = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ['project-messages', projectId],
    queryFn: () => listProjectMessages(projectId),
    enabled: Boolean(projectId),
  });

  useEffect(() => {
    const socket = getRealtimeSocket();
    const joinProject = () => {
      socket.emit('project:join', { projectId }, (response) => {
        if (response.success) {
          setConnected(true);
          setPresence(response.data.users);
          setSocketError(null);
        } else {
          setSocketError(response.error.message);
        }
      });
    };
    const handleConnect = () => joinProject();
    const handleDisconnect = () => {
      setConnected(false);
      setPresence([]);
      setTypingUsers(new Map());
    };
    const handleMessage = (message: ProjectMessageDto) => {
      if (message.projectId !== projectId) return;
      queryClient.setQueryData<ChatPageData>(['project-messages', projectId], (current) => {
        if (!current || current.items.some((item) => item.id === message.id)) return current;
        return {
          ...current,
          items: [...current.items, message],
          meta: { ...current.meta, total: current.meta.total + 1 },
        };
      });
    };
    const handlePresence = (update: ProjectPresenceDto) => {
      if (update.projectId === projectId) setPresence(update.users);
    };
    const handleTyping = (update: ProjectTypingDto) => {
      if (update.projectId !== projectId || update.user.id === user?.id) return;
      setTypingUsers((current) => {
        const next = new Map(current);
        if (update.isTyping) next.set(update.user.id, update.user);
        else next.delete(update.user.id);
        return next;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:message', handleMessage);
    socket.on('presence:update', handlePresence);
    socket.on('typing:update', handleTyping);
    if (socket.connected) joinProject();
    else if (accessToken) socket.connect();

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (socket.connected) socket.emit('project:leave', { projectId }, () => undefined);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:message', handleMessage);
      socket.off('presence:update', handlePresence);
      socket.off('typing:update', handleTyping);
    };
  }, [accessToken, projectId, queryClient, user?.id]);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [query.data?.items.length]);

  const typingLabel = useMemo(() => {
    const names = Array.from(typingUsers.values()).map((participant) => participant.name);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is typing…`;
    return `${names.slice(0, 2).join(' and ')} are typing…`;
  }, [typingUsers]);

  const updateContent = (value: string) => {
    setContent(value);
    const socket = getRealtimeSocket();
    if (!connected) return;
    socket.emit('typing:update', { projectId, isTyping: Boolean(value.trim()) });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:update', { projectId, isTyping: false });
    }, 1_500);
  };

  const sendMessage = () => {
    const message = content.trim();
    if (!message || !connected || sending) return;
    setSending(true);
    setSocketError(null);
    getRealtimeSocket().emit(
      'chat:send',
      { projectId, content: message, mentions: mentionIds },
      (response) => {
        setSending(false);
        if (!response.success) {
          setSocketError(response.error.message);
          return;
        }
        setContent('');
        setMentionIds([]);
        getRealtimeSocket().emit('typing:update', { projectId, isTyping: false });
      },
    );
  };

  if (query.isError) {
    return (
      <ErrorPanel message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  }

  const messages = query.data?.items ?? [];
  const mentionCandidates = presence.filter((participant) => participant.id !== user?.id);
  return (
    <section className="grid min-h-[36rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[minmax(0,1fr)_17rem] dark:border-white/10 dark:bg-slate-900">
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <MessageSquareText className="text-brand-600 size-5" /> Project chat
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Messages are retained in this project workspace.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${connected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}
          >
            <span
              className={`size-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {connected ? 'Live' : 'Reconnecting'}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-6 dark:bg-slate-950/30">
          {query.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className={`h-16 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5 ${index % 2 ? 'ml-auto' : ''}`}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="grid min-h-80 place-items-center text-center">
              <div>
                <MessageSquareText className="text-brand-500 mx-auto size-10" />
                <h3 className="mt-4 font-semibold">Start the project conversation</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Share delivery updates, decisions, and client-facing context with everyone who can
                  access this project.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const own = message.sender.id === user?.id;
                return (
                  <article
                    key={message.id}
                    className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${own ? 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200' : 'bg-white text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200'}`}
                    >
                      {initials(message.sender.name)}
                    </span>
                    <div className={`max-w-[78%] ${own ? 'text-right' : ''}`}>
                      <div
                        className={`flex items-center gap-2 text-xs text-slate-500 ${own ? 'justify-end' : ''}`}
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {own ? 'You' : message.sender.name}
                        </span>
                        <time>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                      <p
                        className={`mt-1 whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm leading-6 ${own ? 'bg-brand-600 rounded-tr-md text-white' : 'rounded-tl-md border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'}`}
                      >
                        {message.content}
                      </p>
                    </div>
                  </article>
                );
              })}
              <div ref={endOfMessages} />
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 p-4 dark:border-white/10">
          {mentionCandidates.length > 0 ? (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto">
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-500">
                <AtSign className="size-3" /> Mention
              </span>
              {mentionCandidates.map((candidate) => {
                const selected = mentionIds.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setMentionIds((current) =>
                        selected
                          ? current.filter((id) => id !== candidate.id)
                          : [...current, candidate.id],
                      );
                      if (!selected && !content.includes(`@${candidate.name}`))
                        setContent(
                          (current) => `${current}${current ? ' ' : ''}@${candidate.name} `,
                        );
                    }}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${selected ? 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200' : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300'}`}
                  >
                    {candidate.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="flex items-end gap-3">
            <label className="sr-only" htmlFor="project-message">
              Message
            </label>
            <textarea
              id="project-message"
              value={content}
              onChange={(event) => updateContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={2}
              placeholder={
                connected ? 'Write a project message…' : 'Waiting for a secure connection…'
              }
              className="focus:border-brand-500 focus:ring-brand-500/10 min-h-12 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:ring-4 dark:border-white/10 dark:bg-white/5"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!content.trim() || !connected || sending}
              className="bg-brand-600 hover:bg-brand-700 grid size-12 shrink-0 place-items-center rounded-xl text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="size-5" />
            </button>
          </div>
          <div className="mt-2 flex justify-between gap-3 text-xs">
            <span className="text-slate-500">{typingLabel ?? 'Ctrl/⌘ + Enter to send'}</span>
            {socketError ? (
              <span role="alert" className="text-rose-600">
                {socketError}
              </span>
            ) : null}
          </div>
        </footer>
      </div>

      <aside className="hidden border-l border-slate-200 p-5 xl:block dark:border-white/10">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Users className="size-4" /> Online now
        </h3>
        <p className="mt-1 text-xs text-slate-500">{presence.length} in this project</p>
        <div className="mt-5 space-y-3">
          {presence.map((participant) => (
            <div key={participant.id} className="flex items-center gap-3">
              <span className="relative grid size-9 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-white/5 dark:text-slate-200">
                {initials(participant.name)}
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {participant.id === user?.id ? 'You' : participant.name}
                </p>
                <p className="truncate text-xs capitalize text-slate-500">
                  {participant.role.replaceAll('_', ' ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
