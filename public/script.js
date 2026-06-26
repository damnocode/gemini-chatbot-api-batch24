document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const themeSelect = document.getElementById('theme-select');

  const conversation = [];
  const themeKey = 'chat-theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const resolvedTheme = theme === 'auto' ? getSystemTheme() : theme;
    document.body.setAttribute('data-theme', resolvedTheme);
    if (themeSelect) {
      themeSelect.value = theme;
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(themeKey) || 'auto';
    applyTheme(savedTheme);
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', (event) => {
      const selectedTheme = event.target.value;
      localStorage.setItem(themeKey, selectedTheme);
      applyTheme(selectedTheme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (themeSelect.value === 'auto') {
        applyTheme('auto');
      }
    });
  }

  initTheme();

  function formatModelText(text) {
    return String(text)
      .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, '').trim())
      .replace(/^\s{0,3}#{1,6}\s?/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*(\d+)\.\s+/gm, '$1. ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    messageDiv.textContent = role === 'model' ? formatModelText(text) : text;

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    return messageDiv;
  }

  function setFormDisabledState(disabled) {
    userInput.disabled = disabled;
    const submitButton = chatForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = disabled;
    }
  }

  function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
  }

  userInput.addEventListener('input', autoResizeTextarea);
  userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.altKey || event.metaKey)) {
      event.preventDefault();
      const start = userInput.selectionStart;
      const end = userInput.selectionEnd;
      userInput.setRangeText('\n', start, end, 'end');
      autoResizeTextarea();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const messageText = userInput.value.trim();
    if (!messageText) return;

    userInput.value = '';
    autoResizeTextarea();
    setFormDisabledState(true);

    appendMessage('user', messageText);
    conversation.push({ role: 'user', text: messageText });

    const thinkingMessageEl = appendMessage('model', 'Thinking...');
    thinkingMessageEl.classList.add('thinking');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.result !== undefined && data.result !== null) {
        const reply = String(data.result).trim();

        if (reply === '') {
          thinkingMessageEl.textContent = 'Sorry, no response received.';
          thinkingMessageEl.classList.remove('thinking');
          thinkingMessageEl.classList.add('empty-message');
        } else {
          thinkingMessageEl.textContent = formatModelText(reply);
          thinkingMessageEl.classList.remove('thinking');
          conversation.push({ role: 'model', text: reply });
        }
      } else {
        thinkingMessageEl.textContent = 'Sorry, no response received.';
        thinkingMessageEl.classList.remove('thinking');
        thinkingMessageEl.classList.add('empty-message');
      }
    } catch (error) {
      console.error('Error fetching chatbot response:', error);
      thinkingMessageEl.textContent = 'Failed to get response from server.';
      thinkingMessageEl.classList.remove('thinking');
      thinkingMessageEl.classList.add('error-message');
    } finally {
      setFormDisabledState(false);
      userInput.focus();
    }
  });
});