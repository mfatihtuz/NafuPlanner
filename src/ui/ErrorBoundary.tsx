import { Component, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Kök hata sınırı. Render/yaşam döngüsü hatalarını yakalar ve sessiz çökme
 * yerine okunabilir bir mesaj gösterir (kullanıcı geliştiriciye iletebilsin).
 * Tema/SVG bağımlılığı yoktur — yalnızca RN çekirdeği + sabit renkler.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] yakalanan hata:', error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#F7FAF9',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: '#14211E',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Bir şeyler ters gitti
        </Text>
        <Text
          style={{ fontSize: 15, color: '#566B67', textAlign: 'center', marginBottom: 20 }}
        >
          Uygulamayı kapatıp tekrar açmayı dene. Sorun sürerse aşağıdaki mesajı geliştiriciye ilet.
        </Text>
        <ScrollView
          style={{ maxHeight: 240, alignSelf: 'stretch' }}
          contentContainerStyle={{
            padding: 12,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E3ECEA',
          }}
        >
          <Text selectable style={{ fontSize: 12, color: '#9B1C1C' }}>
            {error.name}: {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </Text>
        </ScrollView>
      </View>
    );
  }
}
