import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!name) return;

    localStorage.setItem("username", name);
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">

      {/* Background Glow */}
      <div className="absolute w-72 h-72 bg-indigo-600/20 blur-3xl rounded-full top-10 left-10"></div>
      <div className="absolute w-72 h-72 bg-cyan-500/20 blur-3xl rounded-full bottom-10 right-10"></div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">

        <div className="bg-[#191b22]/90 backdrop-blur-xl border border-[#2a2d37] rounded-3xl shadow-2xl p-8">

          {/* Logo */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-4xl shadow-lg">
              💬
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-white text-4xl font-bold text-center mb-2">
            Chat App
          </h1>

          <p className="text-gray-400 text-center mb-8">
            Join the real-time conversation
          </p>

          {/* Input */}
          <div className="mb-5">
            <input
              type="text"
              placeholder="Enter Name"
              className="
                w-full
                bg-[#111318]
                border border-[#2f3441]
                text-white
                rounded-xl
                px-4
                py-4
                outline-none
                focus:border-indigo-500
                focus:ring-2
                focus:ring-indigo-500/20
                transition-all
                duration-200
                placeholder:text-gray-500
              "
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Button */}
          <button
            onClick={handleLogin}
            className="
              w-full
              bg-gradient-to-r
              from-indigo-500
              to-cyan-500
              hover:from-indigo-600
              hover:to-cyan-600
              text-white
              font-semibold
              py-4
              rounded-xl
              transition-all
              duration-200
              shadow-lg
              hover:scale-[1.02]
              active:scale-[0.98]
            "
          >
            Join Chat
          </button>

          {/* Footer */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Real-time messaging with active users
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;