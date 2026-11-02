import { useTranslation } from 'react-i18next';
import i18n from './index';

/** True when the active UI language is English (reactive inside components). */
export function useIsEnglish(): boolean {
  const { i18n: inst } = useTranslation();
  return (inst.resolvedLanguage || inst.language || 'pt').startsWith('en');
}

/** Non-reactive check for stores, toasts and helpers outside React components. */
export function isEnglishNow(): boolean {
  return (i18n.resolvedLanguage || i18n.language || 'pt').startsWith('en');
}

const API_ERRORS_EN: Record<string, string> = {
  'O tema é obrigatório': 'The topic is required',
  'O pack é obrigatório': 'The pack is required',
  'Objetivo é obrigatório': 'The objective is required',
  'Ambos os prompts são obrigatórios': 'Both prompts are required',
  'API key não configurada': 'API key not configured',
  'Limite de pedidos excedido. Tenta novamente mais tarde.': 'Rate limit exceeded. Please try again later.',
  'Limite de pedidos excedido. Tenta novamente em alguns segundos.': 'Rate limit exceeded. Please try again in a few seconds.',
  'Créditos insuficientes.': 'Insufficient credits.',
  'Créditos insuficientes. Adiciona créditos à tua conta.': 'Insufficient credits. Add credits to your account.',
  'Erro ao processar o pedido': 'Error processing the request',
  'Erro ao processar os prompts': 'Error processing the prompts',
  'Erro ao gerar hooks. Tenta novamente.': 'Error generating hooks. Please try again.',
  'Erro ao gerar conteúdo. Tenta novamente.': 'Error generating content. Please try again.',
  'Resposta vazia da IA': 'Empty AI response',
  'Erro desconhecido': 'Unknown error',
};

/** Edge functions return Portuguese (or "PT / EN") error text; show the English part in English UI. */
export function localizeApiError(message: string, isEnglish: boolean): string {
  if (!isEnglish || !message) return message;
  if (API_ERRORS_EN[message]) return API_ERRORS_EN[message];
  const parts = message.split(' / ');
  return parts.length === 2 ? parts[1] : message;
}
