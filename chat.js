document.addEventListener('DOMContentLoaded', () => {
    // Establish WebSocket connection
    const ws = new WebSocket('ws://localhost:3307');
    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const username = localStorage.getItem('username') || 'You'; // Retrieve the actual username

    let typingTimeout;

    // Load chat history from localStorage
    loadChatHistory();

    // WebSocket connection opened
    ws.onopen = () => {
        console.log('WebSocket connection established');
    };

    // WebSocket message received
    ws.onmessage = (event) => {
        console.log('Message received:', event.data); // Log received message

        let messageText = event.data;
        if (event.data instanceof Blob) {
            // Handle Blob data
            const reader = new FileReader();
            reader.onload = () => {
                messageText = "CS: Give me one moment while I look into this for you...";
                setTimeout(() => {
                    appendMessage(messageText, 'received-message');
                }, 1000); // 1-second delay
            };
            reader.readAsText(event.data);
        } else {
            // Handle text data
            setTimeout(() => {
                appendMessage(messageText, 'received-message');
            }, 1000); // 1-second delay
        }

        // Show notification if the window is not in focus
        if (document.hidden) {
            showNotification('New message received');
        }
    };

    // WebSocket error occurred
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    // WebSocket connection closed
    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };

    // Send button click event
    sendButton.addEventListener('click', () => {
        const message = messageInput.value;
        if (message.trim() !== '') {
            const formattedMessage = `${username}: ${message}`;
            console.log('Sending message:', formattedMessage); // Log sent message
            ws.send(formattedMessage); // Ensure the message is sent as a string

            // Display the sent message in the chat box
            appendMessage(formattedMessage, 'sent-message');

            // Clear the input field
            messageInput.value = '';
        }

        // Handle file upload
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const formattedMessage = `${username} shared a file: ${file.name}`;
                ws.send(reader.result); // Send file content
                appendMessage(formattedMessage, 'sent-message');
            };
            reader.readAsDataURL(file);
            fileInput.value = ''; // Clear the file input
        }
    });

    // Message input keypress event
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendButton.click();
        } else {
            // Show typing indicator
            clearTimeout(typingTimeout);
            typingIndicator.style.display = 'block';
            typingTimeout = setTimeout(() => {
                typingIndicator.style.display = 'none';
            }, 1000);
        }
    });

    // Function to append message to chat box with timestamp
    function appendMessage(text, className) {
        const message = document.createElement('div');
        message.classList.add(className); // Add class for message type
        message.textContent = text;

        const timestamp = document.createElement('span');
        timestamp.classList.add('message-timestamp');
        timestamp.textContent = new Date().toLocaleTimeString();

        message.appendChild(timestamp);
        chatBox.appendChild(message);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom

        // Save message to localStorage
        saveMessageToHistory(text, className);
    }

    const endChatButton = document.getElementById('end-chat-button');

    // End chat button click event
    endChatButton.addEventListener('click', () => {
        endChat();
    });

    // Function to end chat, clear history, and redirect to home
    function endChat() {
        localStorage.removeItem('chatHistory'); // Clear chat history from localStorage
        chatBox.innerHTML = ''; // Clear chat box content
        console.log('Chat ended and history cleared');
        window.location.href = 'index.html'; // Redirect to home page (update with your home page URL)
    }

    // Function to save message to localStorage
    function saveMessageToHistory(text, className) {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        chatHistory.push({ text, className, timestamp: new Date().toLocaleTimeString() });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    // Function to load chat history from localStorage
    function loadChatHistory() {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        chatHistory.forEach(({ text, className, timestamp }) => {
            const message = document.createElement('div');
            message.classList.add(className); // Add class for message type
            message.textContent = text;

            const timestampElement = document.createElement('span');
            timestampElement.classList.add('message-timestamp');
            timestampElement.textContent = timestamp;

            message.appendChild(timestampElement);
            chatBox.appendChild(message);
        });
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to bottom
    }
    
    // Function to show notification
    function showNotification(message) {
        console.log('Attempting to show notification:', message);
        if (Notification.permission === 'granted') {
            new Notification(message);
            console.log('Notification shown:', message);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(message);
                    console.log('Notification shown after permission granted:', message);
                } else {
                    console.log('Notification permission denied');
                }
            });
        } else {
            console.log('Notification permission already denied');
        }
    }
});