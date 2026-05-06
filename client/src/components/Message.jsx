function Message({ msg, currentUser }) {
  return (
    <div
      className={`mb-3 flex ${
        msg.user === currentUser
          ? "justify-end"
          : "justify-start"
      }`}
    >
      <div
        className={`p-3 rounded-lg max-w-xs ${
          msg.user === currentUser
            ? "bg-blue-500"
            : "bg-gray-700"
        }`}
      >
        <p className="text-sm text-gray-200">
          {msg.user}
        </p>

        <p className="text-white">
          {msg.text}
        </p>
      </div>
    </div>
  );
}

export default Message;
