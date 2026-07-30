import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { movieChatbotService } from '../../services/movieChatbotService';
import './ThauAiAssistantWidget.css';

const STORAGE_KEY = 'thaufilm-ai-conversation';
const welcomeMessage = {
  role: 'bot',
  text: 'Chào bạn! Mình là ThauBot. Mình có thể tìm phim, tra lịch chiếu, hướng dẫn đặt vé, thanh toán và hoàn tiền.',
  recommendations: [],
};

const quickPrompts = [
  'Gợi ý phim đang chiếu',
  'Lịch chiếu hôm nay',
  'Hướng dẫn đặt vé',
  'Hướng dẫn hoàn tiền',
];

const restoreMessages = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : [welcomeMessage];
  } catch {
    return [welcomeMessage];
  }
};

const ThauAiAssistantWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(restoreMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const timelineRef = useRef(null);

  const history = useMemo(() => messages
    .filter((item) => item.text)
    .slice(-8)
    .map((item) => ({ role: item.role, message: item.text })), [messages]);

  const persist = (nextMessages) => {
    setMessages(nextMessages);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMessages.slice(-20)));
    window.setTimeout(() => {
      timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: 'smooth' });
    }, 0);
  };

  const sendMessage = async (rawMessage = input) => {
    const message = rawMessage.trim();
    if (!message || loading) return;
    const nextMessages = [...messages, { role: 'user', text: message, recommendations: [] }];
    persist(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const response = await movieChatbotService.chat(message, history);
      persist([...nextMessages, {
        role: 'bot',
        text: response?.answer || 'Mình chưa có câu trả lời phù hợp.',
        recommendations: response?.recommendations || [],
      }]);
    } catch {
      persist([...nextMessages, {
        role: 'bot',
        text: 'ThauBot đang gián đoạn kết nối. Bạn thử lại sau ít phút nhé.',
        recommendations: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className={`thau-ai ${open ? 'is-open' : ''}`}>
      {open && (
        <section className="thau-ai__panel" aria-label="Trợ lý AI ThauFilm">
          <header className="thau-ai__header">
            <span className="thau-ai__avatar"><SmartToyRoundedIcon /></span>
            <div>
              <strong>ThauBot AI</strong>
              <small><i /> Đang trực tuyến · Groq AI</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng chatbot">
              <CloseRoundedIcon />
            </button>
          </header>

          <div className="thau-ai__timeline" ref={timelineRef}>
            <div className="thau-ai__intro">
              <AutoAwesomeRoundedIcon />
              <strong>Hôm nay bạn muốn xem gì?</strong>
              <span>Câu trả lời được nối với dữ liệu thật của ThauFilm.</span>
            </div>
            {messages.map((item, index) => (
              <div className={`thau-ai__message thau-ai__message--${item.role}`} key={`${item.role}-${index}`}>
                <p>{item.text}</p>
                {item.recommendations?.length > 0 && (
                  <div className="thau-ai__movies">
                    {item.recommendations.slice(0, 3).map((movie) => (
                      <Link to={`/movies/${movie.id}`} key={movie.id} onClick={() => setOpen(false)}>
                        <img src={movie.posterUrl || '/placeholder.svg'} alt="" />
                        <span>{movie.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="thau-ai__typing"><i /><i /><i /></div>}
          </div>

          <div className="thau-ai__quick">
            {quickPrompts.map((prompt) => (
              <button type="button" key={prompt} onClick={() => sendMessage(prompt)} disabled={loading}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="thau-ai__composer" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Hỏi ThauBot về phim, vé, lịch chiếu..."
              disabled={loading}
              maxLength={600}
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Gửi tin nhắn">
              <SendRoundedIcon />
            </button>
          </form>
        </section>
      )}

      <button
        className="thau-ai__launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Đóng ThauBot' : 'Mở ThauBot'}
      >
        {open ? <CloseRoundedIcon /> : <SmartToyRoundedIcon />}
        {!open && <span>ThauBot</span>}
      </button>
    </div>
  );
};

export default ThauAiAssistantWidget;
