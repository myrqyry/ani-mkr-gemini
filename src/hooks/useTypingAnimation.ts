
import { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import {
  TYPING_ANIMATION_TEXT,
  TYPING_ANIMATION_SPEED,
  TYPING_ANIMATION_DELETING_SPEED,
  TYPING_ANIMATION_PAUSE_MS,
  TYPING_ANIMATION_SHORT_PAUSE_MS,
} from '../constants/app';

interface TypingAnimationState {
  id: number;
  fullText: string;
  isDeleting: boolean;
  text: string;
  timeoutId: number | null;
  speed: number;
}

export const useTypingAnimation = (storyPrompt: string, isPromptFocused: boolean) => {
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const typingAnimationRef = useRef<TypingAnimationState | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const deferredTypingUpdate = useRef(
    debounce((text: string) => {
      requestIdleCallback(() => {
        if (isMounted.current) {
          setTypedPlaceholder(text);
        }
      });
    }, 16)
  ).current;

  useEffect(() => {
    if (storyPrompt.trim() || isPromptFocused) {
      if (typingAnimationRef.current?.timeoutId) {
        clearTimeout(typingAnimationRef.current.timeoutId);
      }
      setTypedPlaceholder('');
      return;
    }

    const animationId = Date.now();
    typingAnimationRef.current = {
      id: animationId,
      fullText: TYPING_ANIMATION_TEXT,
      isDeleting: false,
      text: '',
      timeoutId: null,
      speed: TYPING_ANIMATION_SPEED,
    };

    const tick = () => {
      const state = typingAnimationRef.current;
      if (!state || state.id !== animationId) return;

      let { fullText, isDeleting, text } = state;

      if (isDeleting) {
        text = fullText.substring(0, text.length - 1);
      } else {
        text = fullText.substring(0, text.length + 1);
      }

      deferredTypingUpdate(text);

      let newSpeed = isDeleting ? TYPING_ANIMATION_DELETING_SPEED : TYPING_ANIMATION_SPEED;

      if (!isDeleting && text === fullText) {
        newSpeed = TYPING_ANIMATION_PAUSE_MS;
        state.isDeleting = true;
      } else if (isDeleting && text === '') {
        state.isDeleting = false;
        newSpeed = TYPING_ANIMATION_SHORT_PAUSE_MS;
      }

      state.text = text;
      if (typingAnimationRef.current) {
        typingAnimationRef.current.timeoutId = setTimeout(tick, newSpeed);
      }
    };

    const startTimeoutId = setTimeout(tick, TYPING_ANIMATION_SPEED);
    if (typingAnimationRef.current) {
      typingAnimationRef.current.timeoutId = startTimeoutId;
    }

    return () => {
      const state = typingAnimationRef.current;
      if (state && state.id === animationId) {
        if (state.timeoutId) {
          clearTimeout(state.timeoutId);
        }
        typingAnimationRef.current = null;
      }
    };
  }, [storyPrompt, isPromptFocused, deferredTypingUpdate]);

  return typedPlaceholder;
};
