import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ChatMessage, ChatProposal } from "../api/streamChat";

/**
 * Звідки прийшла розмова. Тільки машинна зачіпка — перше повідомлення чат складає сам
 * (`ai.chat.opener.<type>`): це його справа, а не місць виклику.
 */
export interface ChatSeed {
  type: "reflection" | "insight" | "checkin";
  key: string;
}

/**
 * Тред розмови (ADR 0012, фаза B2) — слайс, а не локальний стан компонента.
 *
 * Чому не `useState` у `ChatThread`, як було спершу: тред помирав від будь-якої навігації
 * всередині застосунку. Зайшов на Dashboard подивитись таблицю, повернувся — порожньо, і це
 * трапляється частіше за перезавантаження. План §5.2 із самого початку передбачав саме слайс.
 *
 * Тут лежить лише **тривке**: репліки, зачіпка й пропозиція. Транзієнтне — чернетка в полі,
 * частковий текст під час стрімінгу, індикатор інструмента й `AbortController` — свідомо
 * лишається локальним: відновлювати обірваний стрім нема сенсу, а контролер до того ж
 * несеріалізовний і Redux на нього справедливо лаявся б.
 */
export interface AiChatState {
  /** Звідки прийшла розмова; потрібна для `seed` у першому запиті. */
  seed: ChatSeed | null;
  messages: ChatMessage[];
  /** Картка підтвердження з `propose_actions`. Живе до застосування або відхилення. */
  proposal: ChatProposal | null;
}

export const initialAiChatState: AiChatState = {
  seed: null,
  messages: [],
  proposal: null,
};

const aiChatSlice = createSlice({
  name: "aiChat",
  initialState: initialAiChatState,
  reducers: {
    /**
     * Вхід із листа, підказки або чек-іну — це ЗАВЖДИ нова розмова: стара стирається.
     * Інакше «обговорити тиждень» дописувалось би у хвіст учорашньої балачки про зал.
     */
    threadStarted(state, action: PayloadAction<ChatSeed>) {
      state.seed = action.payload;
      state.messages = [];
      state.proposal = null;
    },
    messageAppended(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    proposalReceived(state, action: PayloadAction<ChatProposal>) {
      state.proposal = action.payload;
    },
    proposalDismissed(state) {
      state.proposal = null;
    },
    /** «Завершити розмову» — і воно справді зникає, а не лише ховається з очей. */
    threadCleared() {
      return initialAiChatState;
    },
  },
});

export const {
  threadStarted,
  messageAppended,
  proposalReceived,
  proposalDismissed,
  threadCleared,
} = aiChatSlice.actions;

export const aiChatReducer = aiChatSlice.reducer;
