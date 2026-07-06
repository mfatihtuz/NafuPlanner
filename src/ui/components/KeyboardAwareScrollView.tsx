import { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type ScrollViewProps,
} from 'react-native';

const RevealContext = createContext<(() => void) | null>(null);

/**
 * Odaklı inputu klavyenin üstüne kaydırma isteği. TextField focus aldığında
 * çağırır; en yakın KeyboardAwareScrollView yoksa null döner (no-op).
 */
export function useKeyboardReveal(): (() => void) | null {
  return useContext(RevealContext);
}

/** Input ile klavye arasında bırakılan nefes payı. */
const REVEAL_MARGIN = 12;

/**
 * Klavye sorunlarının tek çözüm noktası. iOS'ta `automaticallyAdjustKeyboardInsets`
 * yalnız kaydırma payı açar ama odaklı inputu GÖRÜNÜR yapmaz; eski ekranlardaki
 * "scrollToEnd" tarzı tahminler de uzun listelerde inputu ekran dışına atıyordu.
 * Bu bileşen iki işi birden garanti eder:
 *  1. Klavye yüksekliği kadar alt boşluk ekler (içerik klavye altında kalmaz),
 *  2. Klavye açıldığında / alan değiştirildiğinde odaklı inputu ölçüp tam
 *     klavyenin üstüne kaydırır.
 * Android, Expo varsayılanı `resize` modunda bunu işletim sistemi düzeyinde
 * yaptığı için orada yalnız sade ScrollView davranışı kalır.
 */
export const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardAwareScrollView({ children, contentContainerStyle, onScroll, ...rest }, ref) {
    const scrollRef = useRef<ScrollView>(null);
    useImperativeHandle(ref, () => scrollRef.current as ScrollView);

    const offsetY = useRef(0);
    /** Klavyenin pencere içindeki üst kenarı; 0 = kapalı. */
    const keyboardTop = useRef(0);
    const [keyboardPad, setKeyboardPad] = useState(0);

    const reveal = useCallback(() => {
      if (Platform.OS !== 'ios' || keyboardTop.current <= 0) return;
      const input = TextInput.State.currentlyFocusedInput();
      if (!input) return;
      input.measureInWindow((_x, y, _w, h) => {
        // Ölçüm asenkron: callback gelene dek klavye kapanmış olabilir
        // (keyboardTop=0 → overlap saçma büyür); yeniden doğrula.
        if (keyboardTop.current <= 0) return;
        const overlap = y + h + REVEAL_MARGIN - keyboardTop.current;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({ y: offsetY.current + overlap, animated: true });
        }
      });
    }, []);

    useEffect(() => {
      if (Platform.OS !== 'ios') return;
      const show = Keyboard.addListener('keyboardWillShow', (event) => {
        keyboardTop.current = event.endCoordinates.screenY;
        setKeyboardPad(event.endCoordinates.height);
        // Alt boşluğun render edilmesini bekle, sonra inputu görünür yap.
        setTimeout(reveal, 60);
      });
      const hide = Keyboard.addListener('keyboardWillHide', () => {
        keyboardTop.current = 0;
        setKeyboardPad(0);
      });
      return () => {
        show.remove();
        hide.remove();
      };
    }, [reveal]);

    // Klavye zaten açıkken başka alana geçilirse keyboardWillShow tekrar
    // tetiklenmez; focus tarafı bunu çağırır.
    const requestReveal = useCallback(() => {
      setTimeout(reveal, 90);
    }, [reveal]);

    return (
      <RevealContext.Provider value={requestReveal}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            offsetY.current = event.nativeEvent.contentOffset.y;
            onScroll?.(event);
          }}
          contentContainerStyle={[
            contentContainerStyle,
            keyboardPad > 0 && { paddingBottom: keyboardPad },
          ]}
          {...rest}
        >
          {children}
        </ScrollView>
      </RevealContext.Provider>
    );
  },
);
