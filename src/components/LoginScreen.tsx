interface Props { onLogin: () => void; isLoggingIn: boolean; }

export function LoginScreen({ onLogin, isLoggingIn }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-50 text-center dark:bg-stone-950 dark:text-white">
      <div className="w-24 h-24 bg-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-5xl shadow-xl rotate-3">🏠</div>
      <h1 className="text-3xl font-black mb-3">My Onchain Home</h1>
      <p className="mb-8 text-stone-500 max-w-xs mx-auto">Your personal showcase for Casts, Tokens, and Projects.</p>
      <button onClick={onLogin} disabled={isLoggingIn} className="w-full max-w-xs bg-stone-900 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform">
        {isLoggingIn ? "Verifying..." : "✨ Connect Identity"}
      </button>
    </div>
  );
}