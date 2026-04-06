"use client";

type SpeakOptions = {
  lang?: string;
  rate?: number;
};

export function speak(text: string, opts: SpeakOptions = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;

  const lang = opts.lang ?? "en-IN";
  const rate = opts.rate ?? 0.95;

  const doSpeak = () => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak();
    return;
  }

  let attempts = 0;
  const retry = () => {
    attempts += 1;
    if (window.speechSynthesis.getVoices().length > 0 || attempts > 10) {
      doSpeak();
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    }
  };

  window.speechSynthesis.onvoiceschanged = retry;
  const interval = window.setInterval(() => {
    retry();
    if (attempts > 10) clearInterval(interval);
  }, 300);
}
