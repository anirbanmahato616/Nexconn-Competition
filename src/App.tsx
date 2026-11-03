
import {
  DirectChannel,
  MessageHandler,
  NCEngine,
  SendTextMessageParams,
} from '@nexconn/chat';
import { useEffect, useState } from 'react';

let connectionPromise: Promise<string> | null = null;

function connectToNexconn(): Promise<string> {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      const appKey = import.meta.env.VITE_NEXCONN_APP_KEY;
      const userId =
        new URLSearchParams(window.location.search).get('user') === '2'
          ? '2'
          : '1';

      const token =
        userId === '2'
          ? import.meta.env.VITE_NEXCONN_USER_2_TOKEN
          : import.meta.env.VITE_NEXCONN_TEST_TOKEN;

      if (!appKey || !token) throw new Error('Missing credentials');

      NCEngine.initialize({ appKey });

      const result = await NCEngine.connect({ token });

      if (result.code !== 0) {
        throw new Error(`Connection failed: ${result.code}`);
      }

      return userId;
    })();
  }

  return connectionPromise;
}

function App() {
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('Connecting...');
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    let active = true;

    connectToNexconn()
      .then(id => {
        if (!active) return;

        setUserId(id);
        setStatus(`Connected as User ${id}`);

        NCEngine.addMessageHandler(
          `recoverx-handler-${id}`,
          new MessageHandler({
            onMessageReceived({ messages }) {
              messages.forEach(msg => {
                  const data = msg as any;

                  setMessages(previous => [
                        ...previous,
                       `User ${data.senderUserId}: ${data._content?.text ?? 'Message received'}`,
                  ]);
              });
            },
          })
        );
      })
      .catch(error => {
        if (active) setStatus(`Error: ${error.message}`);
      });

    return () => {
      active = false;
    };
  }, []);

  async function sendMessage() {
    if (!input.trim()) return;

    try {
      const receiverId = userId === '1' ? '2' : '1';
      const channel = new DirectChannel(receiverId);

      const params = new SendTextMessageParams({
        text: input,
      });

      const result = await channel.sendMessage(params);

      if (result.code === 0) {
        setMessages(previous => [
          ...previous,
          `You: ${input}`,
        ]);
        setInput('');
      } else {
        setStatus(`Send failed: ${result.code}`);
      }
    } catch (error) {
      setStatus(
        `Send error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return (
    <div style={{ padding: 30, fontFamily: 'Arial' }}>
      <h1>RecoverX Chat</h1>
      <h3>{status}</h3>
      <p>Logged in as User {userId}</p>

      <div style={{
        border: '1px solid #ccc',
        padding: 15,
        minHeight: 200,
        marginBottom: 15
      }}>
        <h3>Messages</h3>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type a message..."
        style={{ padding: 10, width: 250 }}
      />

      <button onClick={sendMessage} style={{ padding: 10 }}>
        Send
      </button>
    </div>
  );
}

export default App;
