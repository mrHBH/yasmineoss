let ver = "0.0.306";

const fronthtml = /*html*/ `
<div class="uk-container uk-padding">
  <div class="uk-card uk-card-secondary uk-card-body">
    <div class="uk-grid-medium uk-flex-middle" uk-grid>
      <div class="uk-width-auto"> 
        <img class="uk-border-circle" src="Hamza012.jpg" width="60" height="60" alt="">
      </div>
      <div class="uk-width-expand">
        <h3 class="uk-margin-remove">Hamza Ben Hassen</h3>
        <p class="uk-text-meta">Electrical Engineer</p>
      </div>
    </div>
    
    <div class="uk-margin-top chat-container">
      <div class="chat-messages" id="chatMessages">
        <div class="uk-margin-bottom uk-text-secondary">Welcome! Ask me anything:</div>
        <div class="suggestions">
          <button class="suggestion-btn">Who are you?</button>
          <button class="suggestion-btn">Education history?</button>
          <button class="suggestion-btn">Show résumé</button>
          <button class="suggestion-btn">Contact info</button>
        </div>
      </div>
      
      <div class="uk-inline chat-input">
        <input class="uk-input" type="text" id="messageInput" placeholder="Type your message...">
        <button class="uk-button uk-button-primary" id="sendButton">Send</button>
      </div>
    </div>
  </div>
</div>

<style>
.chat-container {
  height: 500px;
  display: flex;
  flex-direction: column;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
  margin-bottom: 15px;
}
.suggestions {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
.suggestion-btn {
  padding: 8px;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.chat-input {
  display: flex;
  gap: 10px;
}
</style>
`;

let chatHistory = [];

const cb = function(e) {
  const chatMessages = this.HtmlElement.querySelector("#chatMessages");
  const messageInput = this.HtmlElement.querySelector("#messageInput");
  const sendButton = this.HtmlElement.querySelector("#sendButton");

  function addMessage(text, isUser = true) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `uk-margin-small ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.innerHTML = `
      <div class="${isUser ? 'uk-text-right' : ''}">
        <div class="message-bubble ${isUser ? 'user' : 'bot'}">
          ${text}
        </div>
      </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function handleMessage(message) {
    addMessage(message, true);
    chatHistory.push({ role: 'user', content: message });
    
    // Simulate server response
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history: chatHistory })
    }).then(res => res.json());
    
    addMessage(response.content, false);
    chatHistory.push({ role: 'assistant', content: response.content });
  }

  sendButton.onclick = () => {
    const message = messageInput.value.trim();
    if (message) {
      handleMessage(message);
      messageInput.value = '';
    }
  };

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
  });

  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.onclick = () => handleMessage(btn.innerText);
  });
};

postMessage({ type: 'freshhtml', html: fronthtml });
postMessage({ type: 'size', width: 600, height: 700 });
self.postMessage({ type: 'jssetup', js: `(${cb.toString()})` });