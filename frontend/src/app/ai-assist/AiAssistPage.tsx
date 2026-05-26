import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Loader2,
  Mic,
  MicOff,
  ReceiptText,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import { formatInr } from '../../shared/utils/money';

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

interface AiAssistDraftCategory {
  id: string;
  name: string;
  normalizedName?: string;
}

interface AiAssistDraftTag {
  id: string;
  name: string;
}

interface AiAssistExpenseDraft {
  amountPaise: number;
  date: string;
  category: AiAssistDraftCategory;
  tags: AiAssistDraftTag[];
  note?: string;
}

interface AiAssistExpenseDraftResponse {
  status: 'ready_to_save' | 'needs_clarification';
  replyText: string;
  hints: string[];
  draft?: AiAssistExpenseDraft;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  draft?: AiAssistExpenseDraft;
  hints?: string[];
}

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Tell me an expense by voice. I will prepare a draft you can review and save.',
  },
];

function AiAssistPage() {
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pendingText, setPendingText] = useState('');
  const [currentDraft, setCurrentDraft] = useState<AiAssistExpenseDraft | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [savedDraftIds, setSavedDraftIds] = useState<string[]>([]);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, pendingText, isSending, savingDraftId]);

  function addAssistantMessage(text: string) {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createId(),
        role: 'assistant',
        text,
      },
    ]);
  }

  function handleMicClick() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setPageError('Voice capture is not available in this browser.');
      return;
    }

    setPageError('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      let transcript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? '';
      }

      setPendingText(transcript.trim());
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      setPageError(
        event.error
          ? `Voice capture stopped: ${event.error}.`
          : 'Voice capture stopped unexpectedly.',
      );
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      setPageError('Unable to start the microphone. Please try again.');
    }
  }

  async function handleSend() {
    const messageText = pendingText.trim();

    if (!messageText || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      text: messageText,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setPendingText('');
    setIsSending(true);
    setPageError('');

    try {
      const response = await apiFetch('/aiassist/expense-draft', {
        method: 'POST',
        body: JSON.stringify({
          currentDraft: currentDraft
            ? {
                amountPaise: currentDraft.amountPaise,
                categoryId: currentDraft.category.id,
                date: currentDraft.date,
                note: currentDraft.note,
                tagIds: currentDraft.tags.map((tag) => tag.id),
              }
            : undefined,
          localDate: getLocalDate(),
          message: messageText,
        }),
      });
      const data = await readApiBody(response);

      if (!response.ok) {
        addAssistantMessage(getAiAssistFriendlyError(response.status, data));
        return;
      }

      const draftResponse = data as AiAssistExpenseDraftResponse;
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        text: draftResponse.replyText,
        draft: draftResponse.draft,
        hints: draftResponse.hints,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
      setCurrentDraft(draftResponse.draft ?? currentDraft);
    } catch {
      addAssistantMessage(
        'I could not reach the AI service. Please check the backend server and try again.',
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveDraft(message: ChatMessage) {
    if (!message.draft || savingDraftId) {
      return;
    }

    setSavingDraftId(message.id);
    setPageError('');

    try {
      const response = await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          amountPaise: message.draft.amountPaise,
          categoryId: message.draft.category.id,
          date: message.draft.date,
          note: message.draft.note,
          tagIds: message.draft.tags.map((tag) => tag.id),
        }),
      });
      const data = await readApiBody(response);

      if (!response.ok) {
        setPageError(getSaveExpenseFriendlyError(response.status, data));
        return;
      }

      setSavedDraftIds((currentIds) => [...currentIds, message.id]);
      setCurrentDraft(null);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createId(),
          role: 'assistant',
          text: 'Saved. The expense is now in your tracker.',
        },
      ]);
    } catch {
      setPageError('Unable to reach the API. Please try again.');
    } finally {
      setSavingDraftId(null);
    }
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[#f36f4e] sm:text-sm">
            SpendWise
          </p>
          <h2 className="mt-2 text-3xl font-bold leading-tight text-zinc-950 sm:mt-3 sm:text-5xl">
            Voice AI Expense Assist
          </h2>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-600 shadow-lg shadow-[#dfb49f]/15">
          <Sparkles size={14} />
          Draft mode
        </div>
      </div>

      {pageError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {pageError}
        </div>
      ) : null}

      <motion.section
        className="relative rounded-lg border border-[#bfe7e2] bg-white shadow-[0_0_42px_rgba(102,191,182,0.24)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <div className="pointer-events-none absolute -inset-6 -z-10 animate-[spin_14s_linear_infinite] rounded-[2rem] bg-[conic-gradient(from_90deg,#ef4444,#22c55e,#3b82f6,#f97316,#ef4444)] opacity-90 blur-2xl" />
        <div className="pointer-events-none absolute -inset-2 -z-10 rounded-xl bg-[linear-gradient(120deg,rgba(239,68,68,0.45),rgba(34,197,94,0.42),rgba(59,130,246,0.45),rgba(249,115,22,0.4))] blur-lg" />
        <div className="relative flex h-[calc(100dvh-22rem)] min-h-[360px] flex-col overflow-hidden rounded-lg bg-white sm:h-[min(680px,calc(100dvh-15rem))] sm:min-h-[520px]">
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#66bfb6] to-transparent" />
          <div className="shrink-0 border-b border-[#e0f1ee] bg-[#f5fbfa] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-950 sm:text-xl">
                  Add expense by voice
                </h3>
                <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                  Speak, review the draft, then save.
                </p>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#66bfb6] shadow-lg shadow-[#66bfb6]/20 sm:size-11">
                <Sparkles size={18} />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5">
            {messages.map((message) => (
              <div
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
                key={message.id}
              >
                <div
                  className={`max-w-[min(100%,42rem)] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#242424] text-white'
                      : 'border border-[#eadfd5] bg-[#fbfaf7] text-zinc-700'
                  }`}
                >
                  <p className="text-sm font-semibold leading-6">{message.text}</p>

                  {message.hints?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.hints.map((hint) => (
                        <span
                          className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-zinc-500"
                          key={hint}
                        >
                          {hint}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {message.draft ? (
                    <ExpenseDraftCard
                      draft={message.draft}
                      isSaved={savedDraftIds.includes(message.id)}
                      isSaving={savingDraftId === message.id}
                      onSave={() => handleSaveDraft(message)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
            {isSending ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#eadfd5] bg-[#fbfaf7] px-4 py-3 text-sm font-semibold text-zinc-500">
                  <Loader2 className="animate-spin" size={15} />
                  Preparing draft...
                </div>
              </div>
            ) : null}
            <div ref={chatEndRef} />
          </div>

          <div className="relative shrink-0 border-t border-[#e0f1ee] bg-white px-4 pb-3 pt-8 sm:px-6 sm:pb-4 sm:pt-10">
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
              <button
                aria-pressed={isRecording}
                className={`relative grid size-14 place-items-center rounded-full text-white shadow-2xl transition sm:size-16 ${
                  isRecording
                    ? 'animate-pulse bg-[#f36f4e] shadow-[#f36f4e]/45'
                    : 'bg-[#242424] shadow-zinc-950/25 hover:bg-zinc-800'
                }`}
                onClick={handleMicClick}
                type="button"
              >
                {isRecording ? (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#f36f4e]/35" />
                    <span className="absolute -inset-3 animate-pulse rounded-full border border-[#f36f4e]/35" />
                    <MicOff className="relative" size={22} />
                  </>
                ) : (
                  <Mic size={22} />
                )}
              </button>
            </div>
            {pendingText ? (
              <div className="flex flex-col gap-2 rounded-md border border-[#eadfd5] bg-[#fbfaf7] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-xs font-semibold leading-5 text-zinc-600">
                  {pendingText}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    aria-label="Clear voice text"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#eadfd5] bg-white px-3 text-xs font-bold text-zinc-500 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSending}
                    onClick={() => setPendingText('')}
                    type="button"
                  >
                    <X size={13} />
                    Clear
                  </button>
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[#f36f4e] px-3 text-xs font-bold text-white transition hover:bg-[#dc5f42] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSending}
                    onClick={handleSend}
                    type="button"
                  >
                    {isSending ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Send size={14} />
                    )}
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#eadfd5] bg-[#fbfaf7] px-3 py-2.5 text-center text-xs font-semibold text-zinc-500 sm:py-3">
                Tap the mic button to speak your expense.
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </section>
  );
}

function ExpenseDraftCard({
  draft,
  isSaved,
  isSaving,
  onSave,
}: {
  draft: AiAssistExpenseDraft;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#bfe7e2] bg-white p-4 text-zinc-950 shadow-[0_0_28px_rgba(102,191,182,0.22)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#287d74]">
            <ReceiptText size={14} />
            Expense draft
          </p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-950">
            {formatInr(draft.amountPaise)}
          </p>
        </div>

        <button
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#66bfb6] px-3 text-xs font-bold text-white transition hover:bg-[#55aaa2] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving || isSaved}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <Check size={14} />
          )}
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <DraftField label="Category" value={draft.category.name} />
        <DraftField label="Date" value={draft.date} />
        <DraftField
          label="Tags"
          value={
            draft.tags.length ? draft.tags.map((tag) => tag.name).join(', ') : 'None'
          }
        />
      </div>

      <div className="mt-3 rounded-md bg-[#fbfaf7] px-3 py-2">
        <p className="text-[11px] font-bold uppercase text-zinc-400">Note</p>
        <p className="mt-1 break-words text-sm font-semibold text-zinc-700">
          {draft.note || 'No note'}
        </p>
      </div>
    </div>
  );
}

function DraftField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#fbfaf7] px-3 py-2">
      <p className="text-[11px] font-bold uppercase text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-zinc-800" title={value}>
        {value}
      </p>
    </div>
  );
}

function getAiAssistFriendlyError(status: number, data: unknown) {
  const rawMessage = getApiErrorMessage(data, '').toLowerCase();

  if (
    rawMessage.includes('openrouter returned 401') ||
    rawMessage.includes('missing authentication') ||
    rawMessage.includes('api key')
  ) {
    return 'AI setup needs attention. The OpenRouter API key is missing or invalid. Please check the backend .env and restart Nest.js.';
  }

  if (
    status === 429 ||
    rawMessage.includes('429') ||
    rawMessage.includes('rate limit') ||
    rawMessage.includes('too many requests')
  ) {
    return 'AI limit reached for now. Please wait a little and try again, or switch to a paid/less busy model.';
  }

  if (
    status === 402 ||
    rawMessage.includes('402') ||
    rawMessage.includes('credit') ||
    rawMessage.includes('balance') ||
    rawMessage.includes('billing')
  ) {
    return 'AI credits or billing need attention in OpenRouter. Please check your OpenRouter account before trying again.';
  }

  if (status === 401 || status === 403) {
    return 'Your session looks expired. Please sign in again and retry AI Assist.';
  }

  if (
    status === 503 ||
    rawMessage.includes('503') ||
    rawMessage.includes('unavailable') ||
    rawMessage.includes('provider returned error') ||
    rawMessage.includes('provider busy')
  ) {
    return 'The AI provider is busy right now. Please retry in a minute.';
  }

  if (
    status === 400 ||
    rawMessage.includes('validation') ||
    rawMessage.includes('bad request')
  ) {
    return 'I could not process that message. Please clear it and say the expense again with amount and item.';
  }

  if (status >= 500 || rawMessage.includes('openrouter')) {
    return 'AI Assist could not prepare the draft right now. Please try again shortly.';
  }

  return 'AI Assist could not prepare the draft. Please try again.';
}

function getSaveExpenseFriendlyError(status: number, data: unknown) {
  if (status === 401 || status === 403) {
    return 'Your session looks expired. Please sign in again and save the expense.';
  }

  if (status === 400) {
    return 'The expense draft is missing a valid amount, date, or category.';
  }

  if (status === 404) {
    return 'The selected category or tag is no longer available. Please ask AI Assist to prepare the draft again.';
  }

  if (status >= 500) {
    return 'The expense could not be saved because the server had a problem. Please try again.';
  }

  return getApiErrorMessage(data, 'Unable to save expense.');
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function getLocalDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default AiAssistPage;
