"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDatabaseSetupError = error.message.includes("DATABASE_URL");

  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f3e9] px-5 text-stone-950">
      <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">
          Crea Torneos
        </p>
        <h1 className="mt-3 text-3xl font-black">
          {isDatabaseSetupError ? "Falta conectar la base de datos" : "Algo no salio bien"}
        </h1>
        <p className="mt-3 text-base leading-7 text-stone-700">
          {isDatabaseSetupError
            ? "El proyecto ya esta listo para guardar torneos, pero necesita DATABASE_URL en .env para conectarse a PostgreSQL."
            : "Intenta de nuevo. Si el problema continua, revisa la configuracion del proyecto."}
        </p>
        <button
          className="mt-5 min-h-12 rounded-md bg-emerald-800 px-5 text-base font-bold text-white"
          onClick={reset}
          type="button"
        >
          Intentar otra vez
        </button>
      </section>
    </main>
  );
}

