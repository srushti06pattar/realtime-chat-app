import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function Chat() {
  const navigate = useNavigate();

  const username = localStorage.getItem("username");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [room, setRoom] = useState("General");

  const messagesEndRef = useRef(null);

  // Redirect if no user
  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, []);

  // Load saved messages
  useEffect(() => {
    const savedMessages =
      JSON.parse(localStorage.getItem("messages")) || [];

    setMessages(savedMessages);
  }, []);

  // Save messages
  useEffect(() => {
    localStorage.setItem(
      "messages",
      JSON.stringify(messages)
    );
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Socket Events
  useEffect(() => {
    socket.emit("join", username);

    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);

      if (
        Notification.permission === "granted" &&
        data.user !== username
      ) {
        new Notification(`${data.user}`, {
          body: data.text,
        });
      }
    });

    socket.on("activeUsers", (usersList) => {
      setUsers(usersList);
    });

    socket.on("typing", (user) => {
      if (user !== username) {
        setTypingUser(user);

        setTimeout(() => {
          setTypingUser("");
        }, 1500);
      }
    });

    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    return () => {
      socket.off("receiveMessage");
      socket.off("activeUsers");
      socket.off("typing");
    };
  }, []);

  // Send message
  const sendMessage = () => {
    if (!message.trim()) return;

    const data = {
      user: username,
      text: message,
      room,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("sendMessage", data);

    setMessage("");
  };

  // Typing
  const handleTyping = (e) => {
    setMessage(e.target.value);

    socket.emit("typing", username);
  };

  // Emojis
  const emojis = ["😀", "😂", "❤️", "🔥", "👍", "🎉"];

  // Clear chat
  const clearChat = () => {
    localStorage.removeItem("messages");
    setMessages([]);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("username");

    navigate("/");
  };

  return (
    <div className="h-screen bg-[#0f1117] flex overflow-hidden">

      {/* Sidebar */}
      <div className="w-72 bg-[#191b22] border-r border-[#2a2d37] flex flex-col">

        {/* Logo */}
        <div className="p-5 border-b border-[#2a2d37]">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            💬 VibeChat
          </h1>

          <p className="text-gray-400 text-sm mt-1">
            Real-time communication
          </p>
        </div>

        {/* Rooms */}
        <div className="p-4 border-b border-[#2a2d37]">

          <p className="text-gray-400 text-sm mb-3">
            Rooms
          </p>

          {["General", "Coding", "Gaming"].map((r) => (
            <button
              key={r}
              onClick={() => setRoom(r)}
              className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-all ${
                room === r
                  ? "bg-indigo-500 text-white"
                  : "bg-[#242731] text-gray-300 hover:bg-[#2c313d]"
              }`}
            >
              # {r}
            </button>
          ))}
        </div>

        {/* Online Users */}
        <div className="flex-1 overflow-y-auto p-4">

          <p className="text-gray-400 text-sm mb-4">
            Online Users ({users.length})
          </p>

          {users.map((user, index) => (
            <div
              key={index}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {user[0]?.toUpperCase()}
              </div>

              <div>
                <p className="text-white font-medium">
                  {user}
                </p>

                <p className="text-green-400 text-xs">
                  Online
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Current User */}
        <div className="p-4 border-t border-[#2a2d37]">

          <div className="flex items-center gap-3 bg-[#242731] p-3 rounded-xl">

            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
              {username?.[0]?.toUpperCase()}
            </div>

            <div>
              <p className="text-white">
                {username}
              </p>

              <p className="text-green-400 text-xs">
                Active Now
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-4 space-y-3">

            <button
              onClick={clearChat}
              className="w-full bg-red-500 hover:bg-red-600 py-3 rounded-xl text-white font-semibold"
            >
              Clear Chat
            </button>

            <button
              onClick={logout}
              className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl text-white font-semibold"
            >
              Logout
            </button>

          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="h-20 border-b border-[#2a2d37] bg-[#191b22] flex items-center justify-between px-6">

          <div>
            <h2 className="text-white text-xl font-semibold">
              # {room}
            </h2>

            <p className="text-gray-400 text-sm">
              {users.length} users online
            </p>
          </div>

          <div className="flex gap-3">

            <button className="bg-[#242731] hover:bg-[#2f3441] px-4 py-2 rounded-lg text-white">
              🔍
            </button>

            <button className="bg-[#242731] hover:bg-[#2f3441] px-4 py-2 rounded-lg text-white">
              ⚙️
            </button>

          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {messages
            .filter((msg) => msg.room === room)
            .map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.user === username
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-md p-4 rounded-2xl shadow-lg ${
                    msg.user === username
                      ? "bg-indigo-500 text-white rounded-br-sm"
                      : "bg-[#242731] text-white rounded-bl-sm"
                  }`}
                >

                  <div className="flex items-center justify-between gap-4 mb-1">

                    <p className="font-semibold text-sm">
                      {msg.user}
                    </p>

                    <span className="text-xs opacity-70">
                      {msg.time}
                    </span>

                  </div>

                  <p className="break-words">
                    {msg.text}
                  </p>

                </div>
              </div>
            ))}

          {/* Typing */}
          {typingUser && (
            <div className="text-gray-400 text-sm italic">
              {typingUser} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Bar */}
        <div className="px-6 py-2 flex gap-2 border-t border-[#2a2d37] bg-[#191b22]">

          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() =>
                setMessage((prev) => prev + emoji)
              }
              className="text-2xl hover:scale-110 transition"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-5 bg-[#191b22] border-t border-[#2a2d37] flex gap-4">

          <input
            type="text"
            placeholder="Type message..."
            className="
              flex-1
              bg-[#242731]
              border border-[#2f3441]
              rounded-2xl
              px-5
              py-4
              text-white
              outline-none
              focus:border-indigo-500
              focus:ring-2
              focus:ring-indigo-500/20
            "
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
          />

          <button
            onClick={sendMessage}
            className="
              px-8
              rounded-2xl
              bg-gradient-to-r
              from-indigo-500
              to-cyan-500
              text-white
              font-semibold
              hover:scale-105
              transition-all
              shadow-lg
            "
          >
            Send 🚀
          </button>

        </div>
      </div>
    </div>
  );
}

export default Chat;