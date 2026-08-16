import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  Pencil,
  ReceiptText,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { ExpenseCategoryKey } from '../../common';
import {
  apiFetch,
  getApiErrorMessage,
  readApiBody,
} from '../../shared/api/api-client';
import {
  formatInr,
  normalizeInrInput,
  parseInrToPaise,
} from '../../shared/utils/money';

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
  maxAlternatives: number;
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
  const [isEditingPendingText, setIsEditingPendingText] = useState(false);
  const [categories, setCategories] = useState<AiAssistDraftCategory[]>([]);
  const [tags, setTags] = useState<AiAssistDraftTag[]>([]);
  const [currentDraft, setCurrentDraft] = useState<AiAssistExpenseDraft | null>(
    null,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizingSpeech, setIsFinalizingSpeech] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [savedDraftIds, setSavedDraftIds] = useState<string[]>([]);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const chat = chatEndRef.current;

    if (!chat) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      chat.scrollTo({ behavior: 'smooth', top: chat.scrollHeight });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isSending, messages.length]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const [categoriesResponse, tagsResponse] = await Promise.all([
          apiFetch('/categories', { signal: controller.signal }),
          apiFetch('/tags', { signal: controller.signal }),
        ]);
        const [categoriesData, tagsData] = await Promise.all([
          readApiBody(categoriesResponse),
          readApiBody(tagsResponse),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        if (categoriesResponse.ok && Array.isArray(categoriesData)) {
          setCategories(
            (categoriesData as AiAssistDraftCategory[]).filter(
              (category) => category.normalizedName !== ExpenseCategoryKey.Emis,
            ),
          );
        }

        if (tagsResponse.ok && Array.isArray(tagsData)) {
          setTags(tagsData as AiAssistDraftTag[]);
        }
      } catch {
        // Saving an AI draft still works if selectable categories or tags cannot load.
      }
    }

    void loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

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
      setIsFinalizingSpeech(true);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setPageError('Voice capture is not available in this browser.');
      return;
    }

    setPageError('');
    setIsFinalizingSpeech(false);

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = getFinalTranscript(event);

      if (transcript) {
        setPendingText(transcript);
        setIsEditingPendingText(false);
      }

      setIsRecording(false);
      setIsFinalizingSpeech(false);
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      setIsFinalizingSpeech(false);
      recognitionRef.current = null;
      setPageError(
        event.error
          ? `Voice capture stopped: ${event.error}.`
          : 'Voice capture stopped unexpectedly.',
      );
    };
    recognition.onend = () => {
      setIsRecording(false);
      setIsFinalizingSpeech(false);
      recognitionRef.current = null;
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
    setIsEditingPendingText(false);
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

  function handleClearPendingText() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsFinalizingSpeech(false);
    setIsRecording(false);
    setIsEditingPendingText(false);
    setPendingText('');
  }

  function handleDraftChange(messageId: string, nextDraft: AiAssistExpenseDraft) {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId ? { ...message, draft: nextDraft } : message,
      ),
    );
    setCurrentDraft(nextDraft);
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
        <div className="relative flex h-[clamp(18rem,calc(100dvh-22rem),42rem)] flex-col overflow-hidden rounded-lg bg-white sm:h-[min(680px,calc(100dvh-15rem))] sm:min-h-[520px]">
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

          <div
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-4 sm:px-6 sm:py-5"
            ref={chatEndRef}
          >
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
                      categories={categories}
                      draft={message.draft}
                      isSaved={savedDraftIds.includes(message.id)}
                      isSaving={savingDraftId === message.id}
                      tags={tags}
                      onChange={(nextDraft) =>
                        handleDraftChange(message.id, nextDraft)
                      }
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
          </div>

          <div className="shrink-0 border-t border-[#e0f1ee] bg-white px-4 py-3 sm:px-6 sm:py-4">
            {pendingText ? (
              <div className="flex flex-col gap-3 rounded-md border border-[#eadfd5] bg-[#fbfaf7] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                {isEditingPendingText ? (
                  <textarea
                    aria-label="Edit voice text"
                    className="min-h-16 w-full flex-1 resize-none rounded-md border border-[#f36f4e]/40 bg-white px-2.5 py-2 text-xs font-semibold leading-5 text-zinc-700 outline-none focus:border-[#f36f4e] focus:ring-4 focus:ring-[#f36f4e]/10"
                    onChange={(event) => setPendingText(event.target.value)}
                    onFocus={(event) => keepFocusedControlVisible(event.currentTarget)}
                    value={pendingText}
                  />
                ) : (
                  <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-zinc-600">
                    {pendingText}
                  </p>
                )}
                <div className="flex shrink-0 items-center justify-end gap-2">
                  <button
                    aria-label={
                      isEditingPendingText ? 'Finish editing voice text' : 'Edit voice text'
                    }
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#eadfd5] bg-white px-3 text-xs font-bold text-zinc-500 transition hover:border-[#66bfb6] hover:text-[#287d74] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSending}
                    onClick={() => setIsEditingPendingText((isEditing) => !isEditing)}
                    type="button"
                  >
                    {isEditingPendingText ? <Check size={13} /> : <Pencil size={13} />}
                    {isEditingPendingText ? 'Done' : 'Edit'}
                  </button>
                  <button
                    aria-label="Clear voice text"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#eadfd5] bg-white px-3 text-xs font-bold text-zinc-500 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSending}
                    onClick={handleClearPendingText}
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
            ) : isSending ? (
              <div className="flex items-center gap-3 rounded-md border border-[#eadfd5] bg-[#fbfaf7] px-3 py-2.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#f36f4e]">
                  <Loader2 className="animate-spin" size={18} />
                </div>
                <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-zinc-500">
                  Preparing your expense draft...
                </p>
              </div>
            ) : isFinalizingSpeech ? (
              <div className="flex items-center gap-3 rounded-md border border-[#eadfd5] bg-[#fbfaf7] px-3 py-2.5">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#f36f4e]">
                  <Loader2 className="animate-spin" size={18} />
                </div>
                <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-zinc-500">
                  Finishing voice capture...
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-dashed border-[#eadfd5] bg-[#fbfaf7] px-3 py-2.5">
                <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-zinc-500">
                  {isRecording
                    ? 'Listening... tap stop when you finish speaking.'
                    : 'Tap mic and say one expense sentence.'}
                </p>
                <button
                  aria-label={
                    isRecording ? 'Stop voice capture' : 'Start voice capture'
                  }
                  aria-pressed={isRecording}
                  className={`relative grid size-11 shrink-0 place-items-center rounded-full text-white shadow-xl transition ${
                    isRecording
                      ? 'animate-pulse bg-[#f36f4e] shadow-[#f36f4e]/40'
                      : 'bg-[#242424] shadow-zinc-950/20 hover:bg-zinc-800'
                  }`}
                  onClick={handleMicClick}
                  type="button"
                >
                  {isRecording ? (
                    <>
                      <span className="absolute inset-0 animate-ping rounded-full bg-[#f36f4e]/30" />
                      <MicOff className="relative" size={20} />
                    </>
                  ) : (
                    <Mic size={20} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </section>
  );
}

function ExpenseDraftCard({
  categories,
  draft,
  isSaved,
  isSaving,
  tags,
  onChange,
  onSave,
}: {
  categories: AiAssistDraftCategory[];
  draft: AiAssistExpenseDraft;
  isSaved: boolean;
  isSaving: boolean;
  tags: AiAssistDraftTag[];
  onChange: (draft: AiAssistExpenseDraft) => void;
  onSave: () => void;
}) {
  const isLocked = isSaved || isSaving;

  return (
    <div className="mt-4 rounded-lg border border-[#bfe7e2] bg-white p-4 text-zinc-950 shadow-[0_0_28px_rgba(102,191,182,0.22)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#287d74]">
            <ReceiptText size={14} />
            Expense draft
          </p>
          <EditableAmountField
            disabled={isLocked}
            draft={draft}
            onChange={onChange}
          />
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
        <EditableCategoryField
          categories={categories}
          disabled={isLocked}
          draft={draft}
          onChange={onChange}
        />
        <EditableDateField
          disabled={isLocked}
          draft={draft}
          onChange={onChange}
        />
        <EditableTagsField
          disabled={isLocked}
          draft={draft}
          onChange={onChange}
          tags={tags}
        />
      </div>

      <EditableNoteField disabled={isLocked} draft={draft} onChange={onChange} />
    </div>
  );
}

function EditableAmountField({
  disabled,
  draft,
  onChange,
}: {
  disabled: boolean;
  draft: AiAssistExpenseDraft;
  onChange: (draft: AiAssistExpenseDraft) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [amountInput, setAmountInput] = useState(() =>
    formatAmountInput(draft.amountPaise),
  );

  useEffect(() => {
    if (!isEditing) {
      setAmountInput(formatAmountInput(draft.amountPaise));
    }
  }, [draft.amountPaise, isEditing]);

  function finishEditing() {
    const amountPaise = parseInrToPaise(amountInput);

    if (amountPaise) {
      onChange({ ...draft, amountPaise });
      setAmountInput(formatAmountInput(amountPaise));
    } else {
      setAmountInput(formatAmountInput(draft.amountPaise));
    }

    setIsEditing(false);
  }

  if (isEditing && !disabled) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md border border-[#66bfb6]/45 bg-[#f5fbfa] px-2.5 py-1.5">
        <span className="text-lg font-extrabold text-[#287d74]">Rs.</span>
        <input
          aria-label="Edit expense amount"
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-zinc-950 outline-none"
          inputMode="decimal"
          onBlur={finishEditing}
          onChange={(event) => {
            const nextAmount = normalizeInrInput(event.target.value);
            setAmountInput(nextAmount);

            const amountPaise = parseInrToPaise(nextAmount);

            if (amountPaise) {
              onChange({ ...draft, amountPaise });
            }
          }}
          onFocus={(event) => keepFocusedControlVisible(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          pattern="\\d+(\\.\\d{0,2})?"
          type="text"
          value={amountInput}
        />
      </div>
    );
  }

  return (
    <button
      aria-label="Change expense amount"
      className="group mt-2 inline-flex items-center gap-2 rounded-md text-left transition hover:text-[#287d74] disabled:cursor-default"
      disabled={disabled}
      onClick={() => setIsEditing(true)}
      type="button"
    >
      <span className="text-3xl font-extrabold text-zinc-950">
        {formatInr(draft.amountPaise)}
      </span>
      {!disabled ? <Pencil className="text-zinc-400" size={14} /> : null}
    </button>
  );
}

function EditableTagsField({
  disabled,
  draft,
  onChange,
  tags,
}: {
  disabled: boolean;
  draft: AiAssistExpenseDraft;
  onChange: (draft: AiAssistExpenseDraft) => void;
  tags: AiAssistDraftTag[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const tagOptions = [
    ...draft.tags,
    ...tags.filter(
      (tag) => !draft.tags.some((selectedTag) => selectedTag.id === tag.id),
    ),
  ];

  function toggleTag(tag: AiAssistDraftTag) {
    const isSelected = draft.tags.some((selectedTag) => selectedTag.id === tag.id);

    onChange({
      ...draft,
      tags: isSelected
        ? draft.tags.filter((selectedTag) => selectedTag.id !== tag.id)
        : [...draft.tags, tag],
    });
  }

  if (isEditing && !disabled) {
    return (
      <div className="rounded-md bg-[#fbfaf7] px-3 py-2 sm:col-span-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase text-zinc-400">Tags</p>
          <button
            className="text-[11px] font-bold text-[#287d74]"
            onClick={() => setIsEditing(false)}
            type="button"
          >
            Done
          </button>
        </div>
        {tagOptions.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagOptions.map((tag) => {
              const isSelected = draft.tags.some(
                (selectedTag) => selectedTag.id === tag.id,
              );

              return (
                <button
                  className={[
                    'inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none transition',
                    isSelected
                      ? 'border-[#66bfb6] bg-[#66bfb6] text-white'
                      : 'border-[#eadfd5] bg-white text-zinc-600 hover:border-[#66bfb6] hover:text-[#287d74]',
                  ].join(' ')}
                  key={tag.id}
                  onClick={() => toggleTag(tag)}
                  type="button"
                >
                  {isSelected ? <Check size={10} /> : null}
                  {tag.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs font-medium text-zinc-500">
            No saved tags are available yet.
          </p>
        )}
      </div>
    );
  }

  const tagSummary = draft.tags.length
    ? draft.tags.map((tag) => tag.name).join(', ')
    : 'None';

  return (
    <button
      aria-label="Change expense tags"
      className="group rounded-md bg-[#fbfaf7] px-3 py-2 text-left transition hover:bg-[#f0faf8] disabled:cursor-default"
      disabled={disabled}
      onClick={() => setIsEditing(true)}
      type="button"
    >
      <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-zinc-400">
        Tags
        {!disabled ? <Pencil className="text-zinc-400" size={12} /> : null}
      </span>
      <span className="mt-1 block truncate text-sm font-bold text-zinc-800" title={tagSummary}>
        {tagSummary}
      </span>
    </button>
  );
}

function EditableCategoryField({
  categories,
  disabled,
  draft,
  onChange,
}: {
  categories: AiAssistDraftCategory[];
  disabled: boolean;
  draft: AiAssistExpenseDraft;
  onChange: (draft: AiAssistExpenseDraft) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const categoryOptions = categories.some(
    (category) => category.id === draft.category.id,
  )
    ? categories
    : [draft.category, ...categories];

  if (isEditing && !disabled) {
    return (
      <label className="rounded-md bg-[#fbfaf7] px-3 py-2">
        <span className="text-[11px] font-bold uppercase text-zinc-400">Category</span>
        <span className="mt-1 flex items-center gap-1.5">
          <select
            aria-label="Select expense category"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-800 outline-none"
            onBlur={() => setIsEditing(false)}
            onChange={(event) => {
              const category = categoryOptions.find(
                (option) => option.id === event.target.value,
              );

              if (category) {
                onChange({ ...draft, category });
              }

              setIsEditing(false);
            }}
            value={draft.category.id}
          >
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <ChevronDown className="shrink-0 text-zinc-400" size={14} />
        </span>
      </label>
    );
  }

  return (
    <button
      aria-label="Change expense category"
      className="group rounded-md bg-[#fbfaf7] px-3 py-2 text-left transition hover:bg-[#f0faf8] disabled:cursor-default"
      disabled={disabled}
      onClick={() => setIsEditing(true)}
      type="button"
    >
      <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-zinc-400">
        Category
        {!disabled ? <Pencil className="text-zinc-400" size={12} /> : null}
      </span>
      <span className="mt-1 block truncate text-sm font-bold text-zinc-800" title={draft.category.name}>
        {draft.category.name}
      </span>
    </button>
  );
}

function EditableDateField({
  disabled,
  draft,
  onChange,
}: {
  disabled: boolean;
  draft: AiAssistExpenseDraft;
  onChange: (draft: AiAssistExpenseDraft) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing && !disabled) {
    return (
      <label className="rounded-md bg-[#fbfaf7] px-3 py-2">
        <span className="text-[11px] font-bold uppercase text-zinc-400">Date</span>
        <span className="mt-1 flex items-center gap-1.5">
          <CalendarDays className="shrink-0 text-zinc-400" size={14} />
          <input
            aria-label="Change expense date"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-800 outline-none"
            onBlur={() => setIsEditing(false)}
            onChange={(event) => onChange({ ...draft, date: event.target.value })}
            onFocus={(event) => keepFocusedControlVisible(event.currentTarget)}
            type="date"
            value={draft.date}
          />
        </span>
      </label>
    );
  }

  return (
    <button
      aria-label="Change expense date"
      className="group rounded-md bg-[#fbfaf7] px-3 py-2 text-left transition hover:bg-[#f0faf8] disabled:cursor-default"
      disabled={disabled}
      onClick={() => setIsEditing(true)}
      type="button"
    >
      <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-zinc-400">
        Date
        {!disabled ? <Pencil className="text-zinc-400" size={12} /> : null}
      </span>
      <span className="mt-1 block truncate text-sm font-bold text-zinc-800" title={draft.date}>
        {draft.date}
      </span>
    </button>
  );
}

function EditableNoteField({
  disabled,
  draft,
  onChange,
}: {
  disabled: boolean;
  draft: AiAssistExpenseDraft;
  onChange: (draft: AiAssistExpenseDraft) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing && !disabled) {
    return (
      <label className="mt-3 block rounded-md bg-[#fbfaf7] px-3 py-2">
        <span className="text-[11px] font-bold uppercase text-zinc-400">Note</span>
        <textarea
          aria-label="Edit expense note"
          autoFocus
          className="mt-1 min-h-16 w-full resize-none bg-transparent text-sm font-semibold text-zinc-700 outline-none placeholder:text-zinc-400"
          maxLength={500}
          onBlur={() => setIsEditing(false)}
          onChange={(event) => onChange({ ...draft, note: event.target.value })}
          onFocus={(event) => keepFocusedControlVisible(event.currentTarget)}
          placeholder="Add a note"
          value={draft.note ?? ''}
        />
      </label>
    );
  }

  return (
    <button
      aria-label="Edit expense note"
      className="group mt-3 block w-full rounded-md bg-[#fbfaf7] px-3 py-2 text-left transition hover:bg-[#f0faf8] disabled:cursor-default"
      disabled={disabled}
      onClick={() => setIsEditing(true)}
      type="button"
    >
      <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-zinc-400">
        Note
        {!disabled ? <Pencil className="text-zinc-400" size={12} /> : null}
      </span>
      <span className="mt-1 block break-words text-sm font-semibold text-zinc-700">
        {draft.note || 'Tap to add a note'}
      </span>
    </button>
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

function getFinalTranscript(event: BrowserSpeechRecognitionEvent) {
  const transcripts: string[] = [];

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];

    if (result.isFinal) {
      const transcript = result[0]?.transcript.trim();

      if (transcript) {
        transcripts.push(transcript);
      }
    }
  }

  return transcripts.join(' ').replace(/\s+/g, ' ').trim();
}

function getLocalDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 10);
}

function formatAmountInput(amountPaise: number) {
  const rupees = Math.floor(amountPaise / 100);
  const paise = amountPaise % 100;

  return paise ? `${rupees}.${String(paise).padStart(2, '0')}` : String(rupees);
}

function keepFocusedControlVisible(control: HTMLElement) {
  window.setTimeout(() => {
    control.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }, 180);
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default AiAssistPage;
